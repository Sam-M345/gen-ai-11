import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
});

export async function POST(request) {
  console.log("API route hit: /api/generate");
  try {
    // Log the environment variable (without exposing the actual key)
    console.log("OpenAI API Key exists:", !!process.env.OPENAI_API_KEY);

    const { prompt } = await request.json();
    console.log("Received prompt:", prompt);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    console.log("Request configuration:", {
      model: "gpt-3.5-turbo",
      maxTokens: 16384,
      temperature: 0.7,
    });

    // Run these calls in parallel, but skip summarization
    const [response, searchSummariesResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. For list-based responses that describe concepts, features, or ideas, format titles in bold using markdown syntax (e.g., '1. **Title:** Description'). For other types of content like emails or stories, use appropriate formatting without forced bold text or bullet points.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
      // Generate platform-specific search summaries
      // We'll just pass 'content' once we get it from the first response
      // For now, use a placeholder; we'll handle parsing after all calls complete
      // We pass a dummy string - we'll fill in the correct content once it returns
      // from the first call
      (async () => {
        // We can't finalize the sure content until we get the first response,
        // but we can do it in one line after the first completes
        return openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a search optimization expert. Analyze the content and create different search-friendly versions. " +
                "Respond in this exact format (including the exact labels):\n\n" +
                "GOOGLE_SUMMARY: [Write a detailed, SEO-friendly summary using important keywords and phrases. Max 100 chars]\n" +
                "WIKI_SUMMARY: [Extract EXACTLY 2-3 words that best match Wikipedia article titles. No more than 3 words total]\n" +
                "YOUTUBE_SUMMARY: [Create a search phrase as someone would look for a tutorial/video on this topic. Max 50 chars]\n" +
                "AMAZON_SUMMARY: [Suggest the most relevant product to buy on Amazon related to this topic. Be specific with product type, like 'fire resistant window film' or 'emergency preparedness guide book'. Max 50 chars]",
            },
            {
              role: "user",
              content: "", // Will replace after the first call
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        });
      })(),
    ]);

    console.log("Full API Response:", JSON.stringify(response, null, 2));
    const content = response.choices[0].message.content;

    // Now that we have 'content', we can re-run the second call
    // with the actual content. Summarization is now moved to a separate route.
    const searchSummariesResp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a search optimization expert. Analyze the content and create different search-friendly versions. " +
            "Respond in this exact format (including the exact labels):\n\n" +
            "GOOGLE_SUMMARY: [Write a detailed, SEO-friendly summary using important keywords and phrases. Max 100 chars]\n" +
            "WIKI_SUMMARY: [Extract EXACTLY 2-3 words that best match Wikipedia article titles. No more than 3 words total]\n" +
            "YOUTUBE_SUMMARY: [Create a search phrase as someone would look for a tutorial/video on this topic. Max 50 chars]\n" +
            "AMAZON_SUMMARY: [Suggest the most relevant product to buy on Amazon related to this topic. Be specific with product type, like 'fire resistant window film' or 'emergency preparedness guide book'. Max 50 chars]",
        },
        {
          role: "user",
          content: content, // Use content from first response
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const summariesText = searchSummariesResp.choices[0].message.content;
    const summaries = {
      google:
        summariesText.match(/GOOGLE_SUMMARY:\s*([^\n]+)/)?.[1]?.trim() ||
        content.slice(0, 100),
      wikipedia:
        summariesText
          .match(/WIKI_SUMMARY:\s*([^\n]+)/)?.[1]
          ?.trim()
          ?.split(/\s+/)
          ?.slice(0, 3)
          ?.join(" ") || content.split(" ").slice(0, 3).join(" "),
      youtube:
        summariesText.match(/YOUTUBE_SUMMARY:\s*([^\n]+)/)?.[1]?.trim() ||
        content.slice(0, 50),
      amazon:
        summariesText.match(/AMAZON_SUMMARY:\s*([^\n]+)/)?.[1]?.trim() ||
        content.slice(0, 50),
    };

    console.log("Generated Summaries:", {
      original: summariesText,
      parsed: summaries,
    });

    return Response.json({
      content,
      searchSummaries: summaries,
      model: response.model,
      tokens: {
        promptTokens: response.usage.prompt_tokens,
        responseTokens: response.usage.completion_tokens,
      },
    });
  } catch (error) {
    console.error("Detailed API Error:", {
      message: error.message,
      status: error.status,
      type: error.type,
      stack: error.stack,
    });

    return Response.json(
      {
        error: "Failed to generate content",
        details: error.message,
        type: error.constructor.name,
      },
      { status: 500 }
    );
  }
}
