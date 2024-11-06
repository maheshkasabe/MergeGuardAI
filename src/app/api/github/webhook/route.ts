import { Octokit } from '@octokit/rest';
import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN});
const [owner, repo] = (process.env.REPO_NAME as string).split("/");

export async function POST(req: NextRequest){
    const { action, pull_request } = await req.json();

    if (pull_request && (action === 'opened' || action === 'synchronize')){
        const prNumber = pull_request.number;
        console.log(`Checking PR #${prNumber}: ${pull_request.title}`);
        await getPrFiles(prNumber);
        await getFileContent(prNumber);
    }

    return NextResponse.json({ message: 'Webhook received' });
}

async function getPrFiles(prNumber: number){
    const {data: files } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
    })
    console.log(files);
    return files;
}

async function getFileContent(prNumber: number){
    const files = await getPrFiles(prNumber);

    for (const file of files){
        const {raw_url}= file;
        const {data: fileContent} = await axios.get(raw_url);
        console.log(fileContent);
        return fileContent
    }

}