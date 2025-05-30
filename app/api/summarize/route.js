import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { content, language } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: language
            ? `You are a summarization expert. Create a concise summary in ${language} of the provided content.`
            : "You are a summarization expert. Create a concise summary of the provided content.",
        },
        {
          role: "user",
          content: `Please summarize the following content:\n\n${content}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const summary = response.choices[0].message.content;
    return Response.json({ summary });
  } catch (error) {
    console.error("Summarization error:", error);
    return Response.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
