import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add constants at the top
const MAX_PDF_TOKENS = 50000;
const TOKENS_TO_CHARS_RATIO = 4; // Rough estimation: 1 token ≈ 4 characters
const MAX_PDF_CHARS = MAX_PDF_TOKENS * TOKENS_TO_CHARS_RATIO;

// Function to split text into chunks - adjust for 4k context window
function splitIntoChunks(text, maxTokens = 3000) {
  // Reduced from 10000 to 3000 to fit in 4k window
  // Leave room for system message and question
  // Rough estimation: 1 token ≈ 4 characters
  const chunkSize = maxTokens * 4;
  const chunks = [];

  let startIndex = 0;
  while (startIndex < text.length) {
    chunks.push(text.slice(startIndex, startIndex + chunkSize));
    startIndex += chunkSize;
  }

  return chunks;
}

// Update the combineNumberedLists function
function combineNumberedLists(responses) {
  let combinedAnswer = "";
  let currentNumber = 1;

  responses.forEach((response) => {
    // Skip responses with no relevant info
    if (response.includes("NO_RELEVANT_INFO")) return;

    // Replace numbered items with the current running number and ensure proper formatting
    const processedResponse = response
      // First ensure each numbered line starts at beginning
      .replace(/^\s*(\d+\.\s)/gm, "$1")
      // Then replace the numbers with current running number and make them bold
      .replace(/^\d+\.\s/gm, () => `**${currentNumber++}.** `);

    combinedAnswer += (combinedAnswer ? "\n\n" : "") + processedResponse;
  });

  return combinedAnswer;
}

// Add this function to determine if a question is specific or general
function isSpecificQuestion(question) {
  // Keywords that indicate specific queries
  const specificKeywords = [
    "what is",
    "what are",
    "where is",
    "where are",
    "when",
    "which",
    "how many",
    "how much",
    "list the",
    "find the",
    "tell me the",
    "show me the",
    "give me the",
  ];

  // Keywords that indicate general queries
  const generalKeywords = [
    "summarize",
    "summarise",
    "overview",
    "explain",
    "describe",
    "elaborate",
    "discuss",
    "analyze",
    "analyse",
    "review",
    "tell me about",
  ];

  question = question.toLowerCase();

  // If it contains general keywords, it's not a specific question
  if (generalKeywords.some((keyword) => question.includes(keyword))) {
    return false;
  }

  // If it contains specific keywords, it's a specific question
  return specificKeywords.some((keyword) => question.includes(keyword));
}

// Add this function to score response relevance
function scoreResponseRelevance(response, question) {
  if (response.includes("NO_RELEVANT_INFO")) return 0;

  // Convert both to lowercase for comparison
  const responseLower = response.toLowerCase();
  const questionLower = question.toLowerCase();

  // Extract key terms from the question (excluding common words)
  const questionTerms = questionLower
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 &&
        !["what", "where", "when", "how", "the", "are", "is"].includes(word)
    );

  // Calculate score based on presence of question terms and specific patterns
  let score = 0;

  // Check for direct answers
  if (
    responseLower.includes("mentioned in") ||
    responseLower.includes("according to") ||
    responseLower.includes("in the article") ||
    responseLower.includes("the document states")
  ) {
    score += 5;
  }

  // Check for presence of question terms
  questionTerms.forEach((term) => {
    if (responseLower.includes(term)) score += 2;
  });

  // Check for numerical values if question asks for numbers
  if (
    questionLower.includes("how many") ||
    questionLower.includes("value") ||
    questionLower.includes("number")
  ) {
    const hasNumbers = /\d+/.test(response);
    if (hasNumbers) score += 3;
  }

  return score;
}

export async function POST(request) {
  try {
    const { pdfContent, question } = await request.json();
    let totalPromptTokens = 0;
    let totalResponseTokens = 0;

    console.log("Received question:", question);
    console.log("PDF content length:", pdfContent?.length || 0);

    // Add size limit check before processing
    if (pdfContent.length > MAX_PDF_CHARS) {
      const estimatedTokens = Math.round(
        pdfContent.length / TOKENS_TO_CHARS_RATIO
      );
      return NextResponse.json(
        {
          error: `PDF is too large to process. Maximum size is ${MAX_PDF_TOKENS.toLocaleString()} tokens (approximately ${(
            MAX_PDF_CHARS / 1000
          ).toLocaleString()}K characters). Your PDF is approximately ${estimatedTokens.toLocaleString()} tokens. Please try a smaller document or split your PDF into smaller parts.`,
        },
        { status: 413 } // 413 Payload Too Large
      );
    }

    if (!pdfContent || !question) {
      console.log("Missing required data:", {
        hasPdfContent: !!pdfContent,
        hasQuestion: !!question,
      });
      return NextResponse.json(
        { error: "PDF content and question are required" },
        { status: 400 }
      );
    }

    const chunks = splitIntoChunks(pdfContent);
    const chunkResponses = [];
    const isSpecific = isSpecificQuestion(question);

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkInfo = `[Part ${i + 1}/${chunks.length}] `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content:
              chunks.length > 1
                ? `You are analyzing a part of a larger document. Extract detailed information that's relevant to the user's question. 
                 If you find relevant information, provide it in detail. If you find no relevant information, respond with 'NO_RELEVANT_INFO'.
                 Be concise but thorough. Format numbered lists by starting each item at the beginning of the line.
                 If the question asks for specific information and you find a definitive answer, make sure to indicate this clearly.`
                : `You are a helpful assistant that answers questions about PDF documents. 
                 Provide specific answers based on the document content. If the answer cannot be found in the document, say so clearly.
                 Format numbered lists by starting each item at the beginning of the line.`,
          },
          {
            role: "user",
            content: `${chunkInfo}Here is the content from the PDF document:\n\n${chunk}\n\nQuestion: ${question}\n\nPlease provide a detailed answer based on the PDF content above.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const chunkResponse = response.choices[0]?.message?.content || "";

      if (!chunkResponse.includes("NO_RELEVANT_INFO")) {
        chunkResponses.push({
          response: chunkResponse,
          score: scoreResponseRelevance(chunkResponse, question),
          tokens: {
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens,
          },
        });
      }
    }

    let finalAnswer;

    if (isSpecific && chunkResponses.length > 0) {
      // For specific questions, use only the highest-scoring response
      const bestResponse = chunkResponses.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      finalAnswer = bestResponse.response;
      totalPromptTokens = bestResponse.tokens.prompt;
      totalResponseTokens = bestResponse.tokens.completion;
    } else {
      // For general questions, combine all responses
      finalAnswer = combineNumberedLists(chunkResponses.map((r) => r.response));
      // Sum up all tokens
      chunkResponses.forEach((r) => {
        totalPromptTokens += r.tokens.prompt;
        totalResponseTokens += r.tokens.completion;
      });
    }

    if (!finalAnswer?.trim()) {
      finalAnswer =
        "I could not find any relevant information in the document to answer your question.";
    }

    return NextResponse.json({
      content: finalAnswer.trim(),
      model: "gpt-3.5-turbo-0125",
      tokens: {
        promptTokens: totalPromptTokens,
        responseTokens: totalResponseTokens,
      },
    });
  } catch (error) {
    console.error("PDF processing error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF: " + error.message },
      { status: 500 }
    );
  }
}
