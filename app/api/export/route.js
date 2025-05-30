import OpenAI from "openai";

export async function POST(request) {
  try {
    const { content, format } = await request.json();

    // You can add any specific formatting logic here based on the format
    // For now, we'll just return the content
    return Response.json({
      exportContent: content,
      format: format,
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to export content" },
      { status: 500 }
    );
  }
}
