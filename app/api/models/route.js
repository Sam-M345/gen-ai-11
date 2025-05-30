import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
});

export async function GET() {
  try {
    const models = await openai.models.list();
    return Response.json({ models: models.data });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
