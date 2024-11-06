import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import axios from 'axios';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = (process.env.REPO_NAME as string).split("/");

export async function POST(req: Request) {
  const { action, pull_request } = await req.json();

  if (pull_request && (action === 'opened' || action === 'synchronize')) {
    const prNumber = pull_request.number;
    console.log(`Checking PR #${prNumber}: ${pull_request.title}`);
    await reviewAndCorrectPR(prNumber);
    return NextResponse.json({ message: 'Webhook received and processed' });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

async function getPRFiles(prNumber: number) {
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });
  return files;
}

async function correctCode(code: string) {
  const userPrompt = `Correct any security issues, code quality issues, or potential secrets in the following code:\n\n${code}\n\nOnly return the corrected code without any explanation, comments and code formatting..`;

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
    }),
  });

  const data = await response.json();
  const correctedCode = data.choices[0].message.content;
  return correctedCode;
}

async function commitCorrections(file: { filename: string; sha: string }, correctedCode: string) {
  const { filename, sha } = file;

  // Create a blob with the corrected content
  const blob = await octokit.rest.git.createBlob({
    owner,
    repo,
    content: Buffer.from(correctedCode).toString('base64'),
    encoding: 'base64',
  });

  // Create a tree for the corrected file
  const { data: treeData } = await octokit.rest.git.createTree({
    owner,
    repo,
    tree: [{ path: filename, mode: '100644', type: 'blob', sha: blob.data.sha }],
    base_tree: sha,
  });

  // Commit the corrected tree
  const commitMessage = `AI Code Review: Corrected issues in ${filename}`;
  const { data: commitData } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: treeData.sha,
    parents: [sha],
  });

  // Update the PR branch reference
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${filename.split('/').slice(0, -1).join('/')}`, // assuming the branch is the same as the PR
    sha: commitData.sha,
  });
}

async function reviewAndCorrectPR(prNumber: number) {
  const files = await getPRFiles(prNumber);

  for (const file of files) {
    const { raw_url } = file;
    const { data: fileContent } = await axios.get(raw_url);
    const correctedCode = await correctCode(fileContent);

    if (correctedCode !== fileContent) {
      await commitCorrections(file, correctedCode);
      console.log(`Corrected and committed changes for ${file.filename}`);
    } else {
      console.log(`No corrections needed for ${file.filename}`);
    }
  }
}
