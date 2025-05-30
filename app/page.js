"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";
import UtilitiesPanel from "../components/UtilitiesPanel";
import ContentDisplay from "../components/ContentDisplay";

export default function Home() {
  // First, add a ref for the file input
  const fileInputRef = useRef(null);

  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState({ prompt: "", result: "" });
  const [showExamples, setShowExamples] = useState(false);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [conversations, setConversations] = useState([]);
  const [tokenCounts, setTokenCounts] = useState({
    promptTokens: 0,
    responseTokens: 0,
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState(null);
  const [originalContent, setOriginalContent] = useState({
    question: "",
    response: "",
  });
  const [language, setLanguage] = useState("en");
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [format, setFormat] = useState("default");
  const [modelInfo, setModelInfo] = useState("");
  const [searchSummaries, setSearchSummaries] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfContent, setPdfContent] = useState("");
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const defaultExamples = [
    "Create a detailed 12-Days itinerary for a trip to Kyoto, Japan 🌸 in late March.",
    "Suggest three solutions for reducing food waste in urban areas & their potential impact. ♻️",
    "How to protect my house against wildfires? Include prevention and emergency measures 🚒",
    "Suggest four innovative pizza 🍕 concepts that have potential to become widely popular.",
    "Imagine you are a business consultant reaching out to a potential client. Draft an email that introduces your consulting services, highlights your expertise in the industry, and invites them to schedule a meeting to discuss their needs. Use a formal and persuasive tone 💼",
  ];

  const handleExampleClick = (example) => {
    setResult("");
    setConversations([]);
    setFollowUpPrompt("");
    setPrompt(example);
    setShowExamples(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowExamples(false);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      if (isPdfMode && pdfContent) {
        console.log("Sending PDF content length:", pdfContent.length);
        console.log(
          "First 200 chars of PDF content:",
          pdfContent.substring(0, 200)
        );

        const response = await fetch("/api/process-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdfContent: pdfContent,
            question: prompt,
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to process PDF");
        }

        console.log("API Response:", data);

        // Format the response before setting it
        const formattedContent = data.content
          .split("\n\n")
          .map((paragraph) => {
            // Format numbered lists
            if (/^\d+\.\s/.test(paragraph)) {
              // Ensure list items start at beginning and are properly formatted
              return paragraph
                .replace(/^(\d+\.)/, "**$1**")
                .replace(/^\s+/, ""); // Remove any leading whitespace
            }
            // Add bold to section headers (all caps lines or lines ending with ':')
            if (
              paragraph.toUpperCase() === paragraph ||
              paragraph.endsWith(":")
            ) {
              return `**${paragraph}**`;
            }
            return paragraph;
          })
          .join("\n\n");

        setResult(formattedContent);
        setConversations((prev) => [
          ...prev,
          {
            question: prompt,
            response: formattedContent,
            searchSummaries: null,
          },
        ]);
        setTokenCounts(data.tokens);
        setModelInfo(data.model);
      } else {
        const isNewConversation = !prompt.toLowerCase().includes("follow-up");
        if (isNewConversation) {
          setConversations([]);
        }

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || "Failed to generate content");
        }

        const data = await response.json();
        setResult(data.content);
        setSearchSummaries(data.searchSummaries);
        setConversations((prev) => [
          ...prev,
          {
            question: prompt,
            response: data.content,
            searchSummaries: data.searchSummaries,
          },
        ]);
        setTokenCounts(data.tokens);
        setModelInfo(data.model);
      }
    } catch (error) {
      console.error("Error:", error);
      // Show error message to user
      alert(error.message);
      setLoading(false);
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleClear = () => {
    // Abort any ongoing request
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    setLoading(false);
    setHistory({ prompt: prompt, result: result });
    setPrompt("");
    setResult("");
    setConversations([]);
    setFollowUpPrompt("");

    // Reset textarea height to default
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "7rem";
    }
  };

  const handleClearAll = useCallback(() => {
    console.log("Clearing all...");
    // Clear all content
    setPrompt("");
    setResult("");
    setConversations([]);
    setFollowUpPrompt("");
    setPdfFile(null);
    setPdfContent("");
    setIsPdfMode(false);
    setUploadSuccess(false);
    setPdfLoading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Always collapse examples on clear
    setShowExamples(false);

    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("prompt");
      localStorage.removeItem("result");
      localStorage.removeItem("conversations");
      localStorage.removeItem("pdfState");
    }
    console.log("Clear all complete");
  }, []);

  const handleUndo = () => {
    setPrompt(history.prompt);
    setResult(history.result);
    setHistory({ prompt: "", result: "" });
  };

  const handleFollowUp = async () => {
    if (!followUpPrompt) return;
    setLoading(true);
    try {
      const conversationContext = conversations
        .map((conv) => `Question: ${conv.question}\nResponse: ${conv.response}`)
        .join("\n\n");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Previous conversation:\n${conversationContext}\n\nFollow-up question: ${followUpPrompt}`,
        }),
      });
      const data = await response.json();
      setResult(data.content);
      setConversations((prev) => [
        ...prev,
        {
          question: followUpPrompt,
          response: data.content,
          searchSummaries: data.searchSummaries,
        },
      ]);
      setTokenCounts(data.tokens);
      setFollowUpPrompt("");
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleExportToPDF = useCallback(async () => {
    const html2pdf = (await import("html2pdf.js")).default;

    // Create a container for the content
    const content = document.createElement("div");
    content.style.padding = "20px";
    content.style.backgroundColor = "white";
    content.style.color = "#1f2937"; // Consistent text color
    content.style.fontFamily = "Arial, sans-serif";

    // Add title with consistent styling
    const title = document.createElement("h1");
    title.textContent = "AI Conversation Export";
    title.style.marginBottom = "20px";
    title.style.color = "#2d3748";
    title.style.fontSize = "24px";
    title.style.fontWeight = "bold";
    content.appendChild(title);

    // Add each conversation with consistent styling
    conversations.forEach((conv, index) => {
      const qaContainer = document.createElement("div");
      qaContainer.style.marginBottom = "30px";

      // Question section with consistent styling
      const questionTitle = document.createElement("h3");
      questionTitle.textContent = `Question ${index + 1}:`;
      questionTitle.style.color = "#4a5568";
      questionTitle.style.marginBottom = "10px";
      questionTitle.style.fontSize = "18px";
      questionTitle.style.fontWeight = "600";

      const question = document.createElement("div");
      question.textContent = conv.question;
      question.style.backgroundColor = "#f7fafc";
      question.style.padding = "15px";
      question.style.borderRadius = "8px";
      question.style.marginBottom = "15px";
      question.style.fontSize = "16px";
      question.style.lineHeight = "1.5";
      question.style.color = "#1f2937";

      // Response section with consistent styling
      const responseTitle = document.createElement("h3");
      responseTitle.textContent = "Response:";
      responseTitle.style.color = "#4a5568";
      responseTitle.style.marginBottom = "10px";
      responseTitle.style.fontSize = "18px";
      responseTitle.style.fontWeight = "600";

      const response = document.createElement("div");
      // Process markdown-style content
      const processedContent = conv.response
        .replace(
          /\*\*(.*?)\*\*/g,
          '<strong style="color: #1f2937; font-weight: 700">$1</strong>'
        )
        .replace(/\n/g, "<br/>")
        // Handle numbered lists
        .replace(
          /^\d+\.\s/gm,
          (match) => `<span style="font-weight: 600">${match}</span>`
        );

      response.innerHTML = processedContent;
      response.style.backgroundColor = "#f7fafc";
      response.style.padding = "15px";
      response.style.borderRadius = "8px";
      response.style.fontSize = "16px";
      response.style.lineHeight = "1.5";
      response.style.color = "#1f2937";

      // Style all strong tags consistently
      const strongElements = response.getElementsByTagName("strong");
      Array.from(strongElements).forEach((strong) => {
        strong.style.color = "#1f2937";
        strong.style.fontWeight = "700";
      });

      // Append all elements
      qaContainer.appendChild(questionTitle);
      qaContainer.appendChild(question);
      qaContainer.appendChild(responseTitle);
      qaContainer.appendChild(response);
      content.appendChild(qaContainer);
    });

    // PDF options with better quality settings
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: "ai-conversation.pdf",
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
      },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: "portrait",
        compress: true,
      },
    };

    // Generate PDF
    html2pdf().from(content).set(opt).save();
  }, [conversations]);

  const handleEdit = (index) => {
    if (editingIndex === index) {
      // Save the edit
      setEditingIndex(null);
      setOriginalContent({ question: "", response: "" });

      // Update counts after edit
      const response = conversations[index].response;
      const words = response.trim().split(/\s+/).length;
      const chars = response.length;
      setCounts({ words, chars });
    } else {
      // Start editing - store original content
      setEditingIndex(index);
      setOriginalContent({
        question: conversations[index].question,
        response: conversations[index].response,
      });
    }
  };

  const handleCancelEdit = (index) => {
    const updatedConversations = [...conversations];
    updatedConversations[index] = {
      ...conversations[index],
      response: originalContent.response,
    };
    setConversations(updatedConversations);
    setEditingIndex(null);
    setOriginalContent({ question: "", response: "" });
  };

  const handlePromptEdit = async (index) => {
    if (editingPromptIndex === index) {
      // Save the edit and generate new content
      setEditingPromptIndex(null);
      setOriginalContent({ question: "", response: "" });
      setLoading(true);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: conversations[index].question }),
        });

        const data = await response.json();

        // Keep only conversations up to the edited one and add the new response
        const updatedConversations = conversations.slice(0, index + 1);
        updatedConversations[index] = {
          question: conversations[index].question,
          response: data.content,
        };
        setConversations(updatedConversations);
        setTokenCounts(data.tokens);
      } catch (error) {
        console.error("Error:", error);
      }
      setLoading(false);
    } else {
      // Start editing - store original content
      setEditingPromptIndex(index);
      setOriginalContent({
        question: conversations[index].question,
        response: conversations[index].response,
      });
    }
  };

  const handleCancelPromptEdit = (index) => {
    const updatedConversations = [...conversations];
    updatedConversations[index] = {
      ...conversations[index],
      question: originalContent.question,
    };
    setConversations(updatedConversations);
    setEditingPromptIndex(null);
    setOriginalContent({ question: "", response: "" });
  };

  const updateCounts = (text) => {
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    setCounts({ words, chars });
  };

  const saveToFavorites = () => {
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    favorites.push({
      prompt: conversations[conversations.length - 1].question,
      response: conversations[conversations.length - 1].response,
      date: new Date().toISOString(),
    });
    localStorage.setItem("favorites", JSON.stringify(favorites));
  };

  const handleExport = (format) => {
    switch (format) {
      case "pdf":
        handleExportToPDF();
        break;
      case "markdown":
        exportToMarkdown(conversations);
        break;
      case "txt":
        exportToTxt(conversations);
        break;
      case "json":
        exportToJson(conversations);
        break;
    }
  };

  const startVoiceInput = () => {
    if ("webkitSpeechRecognition" in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.onresult = (event) => {
        setPrompt(event.results[0][0].transcript);
      };
      recognition.start();
    }
  };

  // Add this effect to update counts when conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      const lastResponse = conversations[conversations.length - 1].response;
      const words = lastResponse.trim().split(/\s+/).length;
      const chars = lastResponse.length;
      setCounts({ words, chars });
    } else {
      setCounts({ words: 0, chars: 0 });
    }
  }, [conversations]);

  const handleTextAreaInput = (e) => {
    const textarea = e.target;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Add a small buffer (20px) to prevent cutting off text
    const newHeight = Math.max(112, textarea.scrollHeight + 20);

    // Set new height
    textarea.style.height = `${newHeight}px`;

    setPrompt(e.target.value);
  };

  const handleExamplesClick = () => {
    setShowExamples(!showExamples);
  };

  const handlePdfUpload = useCallback(async (file) => {
    console.log("Starting PDF upload...");
    if (!file) {
      console.error("No file provided to handlePdfUpload");
      return;
    }
    setPdfLoading(true);
    // Reset states at the start
    setPdfContent("");
    setPdfFile(null);
    setIsPdfMode(false);
    setUploadSuccess(false);

    try {
      // Dynamically import pdfjs-dist only when needed
      const pdfjsLib = await import("pdfjs-dist/build/pdf");
      console.log("PDF.js loaded");
      // Set the worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      console.log("PDF loaded into array buffer");
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log("PDF parsed successfully");

      let fullText = "";

      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        console.log(`Extracted text from page ${i}`);

        const pageText = textContent.items
          .map((item) => item.str.trim())
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (pageText) {
          fullText += pageText + "\n\n";
        }
      }

      if (!fullText.trim()) {
        throw new Error("No text content found in PDF");
      }

      console.log("Setting states for successful upload");
      // Set states in order to ensure proper UI updates
      setPdfFile(file); // Set file first
      setPdfContent(fullText.trim());
      setIsPdfMode(true);
      setUploadSuccess(true);

      // Save PDF state immediately
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "pdfState",
          JSON.stringify({
            fileName: file.name,
            isPdfMode: true,
            uploadSuccess: true,
            content: fullText.trim(),
          })
        );
        console.log("PDF state saved to localStorage");
      }
    } catch (error) {
      console.error("PDF upload error:", error);
      if (error.message === "No text content found in PDF") {
        alert(
          "Could not extract text from this PDF. The file might be scanned or image-based."
        );
      } else {
        alert(
          "Error reading PDF file. Please make sure it's a valid PDF document."
        );
      }
      setPdfContent("");
      setPdfFile(null);
      setIsPdfMode(false);
      setUploadSuccess(false);
      localStorage.removeItem("pdfState");
    } finally {
      setPdfLoading(false);
      console.log("PDF upload process complete");
    }
  }, []);

  // Load saved data after component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPrompt = localStorage.getItem("prompt");
      const savedResult = localStorage.getItem("result");
      const savedConversations = localStorage.getItem("conversations");

      // Load saved content if it exists
      if (savedPrompt) setPrompt(savedPrompt);
      if (savedResult) setResult(savedResult);
      if (savedConversations) {
        try {
          setConversations(JSON.parse(savedConversations));
        } catch (e) {
          console.error("Error parsing saved conversations:", e);
        }
      }

      // Show examples only if there's no saved content
      if (!savedPrompt && !savedResult && !savedConversations) {
        setShowExamples(true);
      }
    }
  }, []); // Run once on mount

  // Save data when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (prompt) localStorage.setItem("prompt", prompt);
      if (result) localStorage.setItem("result", result);
      if (conversations.length) {
        localStorage.setItem("conversations", JSON.stringify(conversations));
      }
    }
  }, [prompt, result, conversations]);

  // Add an effect to save PDF state
  useEffect(() => {
    if (typeof window !== "undefined" && pdfFile) {
      localStorage.setItem(
        "pdfState",
        JSON.stringify({
          fileName: pdfFile.name,
          isPdfMode,
          uploadSuccess,
        })
      );
    }
  }, [pdfFile, isPdfMode, uploadSuccess]);

  // Add PDF state restoration to the initial load effect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPdfState = localStorage.getItem("pdfState");
      if (savedPdfState) {
        try {
          const {
            isPdfMode: savedIsPdfMode,
            uploadSuccess: savedUploadSuccess,
            content: savedContent,
            fileName,
          } = JSON.parse(savedPdfState);

          if (savedContent && fileName) {
            setPdfContent(savedContent);
            setPdfFile(new File([], fileName));
          }
          setIsPdfMode(savedIsPdfMode);
          setUploadSuccess(savedUploadSuccess);
        } catch (e) {
          console.error("Error parsing saved PDF state:", e);
          // Clear invalid state
          localStorage.removeItem("pdfState");
        }
      }
    }
  }, []); // Run once on mount

  const toggleExamples = () => {
    setShowExamples((prev) => !prev);
  };

  return (
    <main className="min-h-screen bg-[#0a0b2e]">
      <div className="max-w-3xl mx-auto text-white">
        <h1 className="text-4xl font-bold text-center text-green-300 mb-8 main-title drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">
          Gen AI 110 🤖🚀
        </h1>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl">
          <form onSubmit={handleSubmit} className="w-full">
            <textarea
              value={prompt}
              onChange={handleTextAreaInput}
              placeholder="Enter your prompt here..."
              className="w-full h-28 p-3 text-gray-800 bg-white/90 rounded-xl shadow-inner 
                         resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 
                         transition-all text-lg overflow-hidden min-h-[112px]"
              style={{ height: "auto" }}
            />

            {/* Show PDF status */}
            {pdfLoading ? (
              <div className="mt-2 p-2 bg-yellow-500/20 text-yellow-200 rounded-lg">
                <p className="text-sm flex items-center">
                  <span className="animate-spin inline-block mr-2">⌛</span>
                  Processing PDF...
                </p>
              </div>
            ) : pdfFile ? (
              <div className="mt-2 p-2 bg-green-500/20 text-green-200 rounded-lg">
                <p className="text-sm flex items-center justify-between">
                  <span>PDF loaded: {pdfFile?.name}</span>
                  <button
                    onClick={() => {
                      console.log("Clearing PDF state");
                      setPdfFile(null);
                      setPdfContent("");
                      setIsPdfMode(false);
                      setUploadSuccess(false);
                      localStorage.removeItem("pdfState");
                    }}
                    className="ml-2 text-red-300 hover:text-red-200"
                  >
                    ❌
                  </button>
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-between mt-4">
              <button
                type="submit"
                disabled={loading || !prompt}
                className="px-4 py-2 md:py-2 h-14 md:h-10 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⌛</span>
                    <span className="text-lg">Generating...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span className="text-lg">Generate Content</span>
                  </>
                )}
              </button>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={toggleExamples}
                  className="px-3 py-2 h-10 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-medium rounded-xl transition-colors duration-200 flex items-center gap-1"
                >
                  <span>📝</span>
                  Examples
                </button>

                {/* Add Upload PDF button here */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf"
                  onChange={(e) => {
                    console.log("File input change detected");
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log("File selected:", file.name);
                      handlePdfUpload(file);
                    } else {
                      console.log("No file selected");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    console.log("Upload PDF button clicked");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""; // Clear the input first
                      fileInputRef.current.click();
                    } else {
                      console.error("File input reference not found");
                    }
                  }}
                  className="px-3 py-2 h-10 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-medium rounded-xl transition-colors duration-200 flex items-center gap-1"
                >
                  <span>📄</span>
                  Upload PDF
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-2 h-10 bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium rounded-xl transition-colors duration-200 flex items-center gap-1"
                >
                  <span>🗑️</span>
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          </form>

          {showExamples && (
            <div className="flex flex-col space-y-2 mt-2">
              {defaultExamples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="text-left text-base md:text-sm px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded-lg transition-colors duration-200"
                >
                  {example}
                </button>
              ))}
            </div>
          )}

          {(result || loading) && (
            <div className="mt-4">
              {conversations.map((conv, index) => (
                <div key={index} className="mb-4">
                  <ContentDisplay
                    content={conv}
                    searchSummaries={conv.searchSummaries}
                    conversations={conversations}
                    onExport={handleExportToPDF}
                    onCopy={() => {
                      navigator.clipboard.writeText(conv.response);
                    }}
                    onSave={(updatedContent) => {
                      const updatedConversations = [...conversations];
                      updatedConversations[index] = {
                        ...updatedContent,
                        searchSummaries: conv.searchSummaries,
                      };
                      setConversations(updatedConversations);
                    }}
                    onPdfUpload={handlePdfUpload}
                  />
                </div>
              ))}

              {loading && (
                <p className="text-gray-500 text-center italic mt-4 border-t pt-4">
                  <span className="animate-spin inline-block mr-2">⌛</span>
                  Loading...
                </p>
              )}

              {result && (
                <div className="mt-6 pt-4 border-t border-gray-300">
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={followUpPrompt}
                      onChange={(e) => setFollowUpPrompt(e.target.value)}
                      placeholder="Ask a follow-up question..."
                      className="w-full p-4 text-gray-800 bg-white/90 rounded-xl shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-lg border border-gray-200"
                      rows={3}
                      disabled={loading}
                    />
                    <div className="flex justify-between items-center">
                      <button
                        onClick={handleFollowUp}
                        disabled={loading || !followUpPrompt}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Sending..." : "Send Follow-up"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <UtilitiesPanel
        counts={counts}
        tokenCounts={tokenCounts}
        modelInfo={modelInfo}
        onExport={handleExport}
        onSave={saveToFavorites}
        onShare={() => {
          /* implement share logic */
        }}
        onFormatChange={setFormat}
        onLanguageChange={setLanguage}
      />
    </main>
  );
}
