import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { userPrompt } = await req.json();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "google/palm-2-codechat-bison",
          "messages": [
            
            {"role": "user", "content": userPrompt },
            
          ],
          top_p: 1,
          temperature: 0.01,
          repetition_penalty: 1,
        })
    });

    const data = await response.json();
    const res = data.choices[0].message.content;
    return NextResponse.json({ res });

}

