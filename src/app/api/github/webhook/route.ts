import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
    const body = await req.json();
    const action = body.action;
    const prNumber = body.pull_request?.number;

    console.log("Action:", action);
    console.log("Pull Request Number:", prNumber);

    return NextResponse.json({ message: 'Webhook received' });
}