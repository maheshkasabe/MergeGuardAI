import { Octokit } from '@octokit/rest';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = (process.env.REPO_NAME as string).split("/");

export async function POST(req: NextRequest) {
    const { action, pull_request } = await req.json();

    if (pull_request && (action === 'opened' || action === 'synchronize')) {
        const prNumber = pull_request.number;
        console.log(`Checking PR #${prNumber}: ${pull_request.title}`);
        await getPrFiles(prNumber);
        await getFileContent(prNumber);
    }

    return NextResponse.json({ message: 'Webhook received' });
}

async function getPrFiles(prNumber: number) {
    const { data: files } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
    });
    return files;
}

async function getFileContent(prNumber: number) {
    const files = await getPrFiles(prNumber);

    for (const file of files) {
        const { raw_url } = file;
        const { data: fileContent } = await axios.get(raw_url);
        const correctedCode = await codeReview(fileContent);
        // Once the code is reviewed and corrected, commit it back to the repo
        await commitCorrections(file.filename, correctedCode);
    }
}

async function codeReview(fileContent: string) {
    const userPrompt = "Correct any security issues, code quality issues, or potential secrets in the following code:\n\n" + fileContent + "\n\nOnly return the whole code with correction and without any explanation, comments, and code formatting..";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": "google/palm-2-codechat-bison",
            "messages": [
                { "role": "user", "content": userPrompt },
            ],
            top_p: 1,
            temperature: 0.01,
            repetition_penalty: 1,
        })
    });

    const data = await response.json();
    const correctedCode = data.choices[0].message.content;
    return correctedCode;
}

async function commitCorrections(filename: string, correctedCode: string) {
    // const branchName = `update-${filename}-${Date.now()}`;
    // const mainBranch = 'main';  // Default branch, change if needed

    let fileData;
    try {
        fileData = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filename,
        });
        console.log('File Data:', fileData);
    } catch (error) {
        console.error('Error fetching file content:', error);
        return;
    }

    const currentSha = fileData.data.sha;
    console.log('Current SHA:', currentSha);

    const encodedContent = Buffer.from(correctedCode).toString('base64');
    console.log('Encoded Content:', encodedContent);

    let updatedFileData;
    try {
        updatedFileData = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filename,
            message: `Update ${filename} with corrections`,
            content: encodedContent,
            sha: currentSha,
        });
        console.log('File updated successfully:', updatedFileData);
    } catch (error) {
        console.error('Error updating file content:', error);
        return;
    }
}
