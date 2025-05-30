"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React from "react";
import { jsPDF } from "jspdf";
import { ButtonBlock } from "./ButtonBlock";

const ContentDisplay = ({
  content,
  searchSummaries,
  onExport,
  onCopy,
  onSave,
  conversations,
  onPdfUpload,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState(content.response);
  const [contentHeight, setContentHeight] = useState("auto");
  const [error, setError] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [loadingTranslations, setLoadingTranslations] = useState(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [copyStatus, setCopyStatus] = useState("Copy All");
  const [translatedContent, setTranslatedContent] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(new Set());
  const [operations, setOperations] = useState([]);

  // Add a ref to measure the content height
  const contentRef = useRef(null);

  // Add this near the top of the component with other state declarations
  const lastButtonSetRef = useRef(null);

  // Replace the existing ref with this
  const buttonSetsRef = useRef([]);

  const fileInputRef = useRef(null);

  // Add this helper function at the top of the file after imports
  const convertToFarsiNumbers = (num) => {
    const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return num.toString().replace(/\d/g, (d) => farsiDigits[parseInt(d)]);
  };

  // Memoize the markdown components to prevent unnecessary re-renders
  const markdownComponents = useMemo(
    () => ({
      p: ({ node, ...props }) => {
        const content = props.children;

        // Check if content contains numbered items with <strong> tags
        if (
          Array.isArray(content) &&
          content.some((item) =>
            item?.props?.children?.toString().match(/^\d+\.$/)
          )
        ) {
          // Extract list items and their numbers
          const items = [];
          let currentItem = "";
          let isCollectingItem = false;
          let startNumber = 1;

          // Find the starting number from the first numbered item
          for (const item of content) {
            const match = item?.props?.children?.toString().match(/^(\d+)\.$/);
            if (match) {
              startNumber = parseInt(match[1]);
              break;
            }
          }

          content.forEach((item) => {
            if (item?.props?.children?.toString().match(/^\d+\.$/)) {
              if (currentItem) items.push(currentItem.trim());
              currentItem = "";
              isCollectingItem = true;
            } else if (isCollectingItem) {
              // Handle the colon after the title
              if (typeof item === "string" && item.startsWith(": ")) {
                currentItem += item.substring(1); // Remove the leading colon but keep the space
              } else {
                currentItem +=
                  typeof item === "string" ? item : item?.props?.children || "";
              }
            }
          });
          if (currentItem) items.push(currentItem.trim());

          return (
            <ol
              className="list-decimal pl-6 my-4 space-y-4"
              start={startNumber}
            >
              {items.map((item, index) => (
                <li key={index} className="text-gray-800">
                  {item}
                </li>
              ))}
            </ol>
          );
        }

        return <p className="my-4 leading-relaxed text-gray-800" {...props} />;
      },

      // Remove custom list handling since we're handling it in the paragraph component
      ol: ({ node, ...props }) => (
        <ol className="list-decimal pl-6 my-4" {...props} />
      ),

      li: ({ node, ...props }) => (
        <li className="mb-4 text-gray-800" {...props} />
      ),
    }),
    []
  );

  // Modify the useEffect that updates editedResponse
  useEffect(() => {
    // Use the latest content instead of original content
    setEditedResponse(getLatestContent());
  }, [content.response, operations]); // Add operations to dependencies

  // Modify the handleEdit function
  const handleEdit = () => {
    if (!isEditing) {
      // Find the latest content's DOM element
      const latestContentElement =
        operations.length > 0
          ? document.querySelector(`.prose:last-of-type`) // Get the last prose element
          : contentRef.current;

      if (latestContentElement) {
        const height = latestContentElement.offsetHeight;
        const adjustedHeight = height + 20;
        setContentHeight(`${adjustedHeight}px`);
        setEditedResponse(getLatestContent());
      }
    }
    setIsEditing(!isEditing);
  };

  // Add a helper function to get the latest content
  const getLatestContent = () => {
    if (operations.length === 0) {
      return content.response;
    }
    const sortedOps = [...operations].sort((a, b) => b.timestamp - a.timestamp);
    return sortedOps[0].text;
  };

  // Add helper to get the language of the latest content
  const getLatestLanguage = () => {
    if (operations.length === 0) {
      return null; // Original content is in English
    }
    const latestOp = [...operations].sort(
      (a, b) => b.timestamp - a.timestamp
    )[0];
    return latestOp.type === "translation" ? latestOp.language : null;
  };

  // Modify handleSearch to use latest content
  const handleSearch = (platform) => {
    let searchQuery;
    const latestContent = getLatestContent();

    if (searchSummaries && searchSummaries[platform]) {
      searchQuery = searchSummaries[platform];
    } else {
      switch (platform) {
        case "wikipedia":
          searchQuery = latestContent.split(" ").slice(0, 3).join(" ");
          break;
        case "youtube":
          searchQuery = latestContent.slice(0, 50);
          break;
        case "amazon":
          searchQuery = latestContent.slice(0, 50);
          break;
        default: // google
          searchQuery = latestContent.slice(0, 100);
      }
    }

    const urls = {
      google: `https://www.google.com/search?q=${encodeURIComponent(
        searchQuery
      )}`,
      wikipedia: `https://www.wikipedia.org/w/index.php?search=${encodeURIComponent(
        searchQuery
      )}`,
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        searchQuery
      )}`,
      amazon: `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`,
    };
    window.open(urls[platform], "_blank");
  };

  // Modify handleSummarize to use the correct language
  const handleSummarize = async () => {
    const summaryId = Date.now().toString();
    const currentLanguage = getLatestLanguage();

    try {
      setLoadingSummaries((prev) => new Set([...prev, summaryId]));

      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: getLatestContent(),
          language: currentLanguage, // Pass the language of the content being summarized
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      if (data.summary) {
        setOperations((prev) => [
          ...prev,
          {
            type: "summary",
            id: summaryId,
            text: data.summary,
            language: currentLanguage, // Store the language with the summary
            timestamp: Date.now(),
          },
        ]);
      } else {
        setError("No summary generated");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      setError("Failed to generate summary");
    } finally {
      setLoadingSummaries((prev) => {
        const next = new Set(prev);
        next.delete(summaryId);
        return next;
      });
    }
  };

  // Modify the handleSave function
  const handleSave = () => {
    // Add the edited content as a new operation
    setOperations((prev) => [
      ...prev,
      {
        type: "edit",
        text: editedResponse,
        timestamp: Date.now(),
        language: getLatestLanguage(), // Preserve the current language if any
      },
    ]);

    if (typeof onSave === "function") {
      onSave({
        ...content,
        response: editedResponse,
      });
    }

    setIsEditing(false);
  };

  const calculateStats = (text) => {
    const words = text.trim().split(/\s+/);
    const chars = text.length;
    const spaces = text.split(" ").length - 1;

    // Calculate word frequency
    const wordFrequency = words.reduce((acc, word) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:'"]/g, "");
      if (cleanWord.length > 2) {
        // Only count words longer than 2 characters
        acc[cleanWord] = (acc[cleanWord] || 0) + 1;
      }
      return acc;
    }, {});

    // Sort by frequency and get top 10
    const topWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / words.length) * 100).toFixed(2),
      }));

    return {
      words: words.length,
      chars,
      spaces,
      topWords,
    };
  };

  // Modify handleTranslate to use latest content
  const handleTranslate = async (lang) => {
    try {
      setLoadingTranslations((prev) => new Set([...prev, lang]));
      setSelectedLanguage(lang);

      const controller = new AbortController();
      setAbortController(controller);

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: getLatestContent(), // Use latest content instead of original
          targetLanguage: lang,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const data = await response.json();
      setOperations((prev) => [
        ...prev,
        {
          type: "translation",
          language: lang,
          text: data.translatedText,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Translation cancelled");
      } else {
        console.error("Translation error:", error);
        setError("Failed to translate text");
      }
    } finally {
      // Remove this language from loading set
      setLoadingTranslations((prev) => {
        const next = new Set(prev);
        next.delete(lang);
        return next;
      });
      setAbortController(null);
    }
  };

  const handleCancelTranslation = () => {
    if (abortController) {
      abortController.abort();
      setLoadingTranslations((prev) => {
        const next = new Set(prev);
        next.delete(selectedLanguage);
        return next;
      });
      setAbortController(null);
    }
  };

  // Modify handleShare to use latest content
  const handleShare = async (method) => {
    const latestContent = getLatestContent();

    switch (method) {
      case "link":
        // Generate and copy shareable link
        const shareableLink = window.location.href;
        navigator.clipboard
          .writeText(shareableLink)
          .then(() => {
            alert("Link copied to clipboard!");
            setShowShareModal(false);
          })
          .catch((err) => {
            console.error("Failed to copy link:", err);
            setError("Failed to copy link to clipboard");
          });
        break;

      case "email":
        // Open email client with pre-filled content
        const subject = encodeURIComponent("Shared Content");
        const body = encodeURIComponent(latestContent);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        setShowShareModal(false);
        break;

      case "twitter":
        // Share on Twitter
        const tweetText = encodeURIComponent(latestContent.slice(0, 280));
        window.open(
          `https://twitter.com/intent/tweet?text=${tweetText}`,
          "_blank"
        );
        setShowShareModal(false);
        break;

      case "linkedin":
        // Share on LinkedIn
        const linkedinText = encodeURIComponent(latestContent);
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${window.location.href}&summary=${linkedinText}`,
          "_blank"
        );
        setShowShareModal(false);
        break;
    }
  };

  // Modify handleCopy to use latest content
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getLatestContent());
      setCopyStatus("Copied!");
      setTimeout(() => {
        setCopyStatus("Copy All");
      }, 2000);
    } catch (error) {
      setCopyStatus("Failed");
      setTimeout(() => {
        setCopyStatus("Copy All");
      }, 2000);
    }
  };

  const handleExportToPDF = async () => {
    // Import html2pdf dynamically
    const html2pdf = (await import("html2pdf.js")).default;

    // Create container for PDF content
    const content = document.createElement("div");
    content.style.padding = "40px";
    content.style.backgroundColor = "white";
    content.style.color = "#1f2937";
    content.style.fontFamily = "Arial, sans-serif";
    content.style.maxWidth = "800px";
    content.style.margin = "0 auto";

    // Add title
    const title = document.createElement("h1");
    title.textContent = "Conversation Export";
    title.style.fontSize = "28px";
    title.style.marginBottom = "30px";
    title.style.color = "#1f2937";
    title.style.textAlign = "center";
    content.appendChild(title);

    // Add each conversation
    conversations.forEach((conv, index) => {
      const qaContainer = document.createElement("div");
      qaContainer.style.marginBottom = "40px";

      // Question section
      const questionSection = document.createElement("div");
      questionSection.style.marginBottom = "20px";

      const questionTitle = document.createElement("h3");
      questionTitle.textContent = `Question ${index + 1}:`;
      questionTitle.style.fontSize = "20px";
      questionTitle.style.fontWeight = "600";
      questionTitle.style.color = "#374151";
      questionTitle.style.marginBottom = "10px";

      const questionText = document.createElement("div");
      questionText.textContent = conv.question;
      questionText.style.backgroundColor = "#f3f4f6";
      questionText.style.padding = "15px";
      questionText.style.borderRadius = "8px";
      questionText.style.fontSize = "16px";
      questionText.style.lineHeight = "1.6";

      questionSection.appendChild(questionTitle);
      questionSection.appendChild(questionText);

      // Response section
      const responseSection = document.createElement("div");

      const responseTitle = document.createElement("h3");
      responseTitle.textContent = "Response:";
      responseTitle.style.fontSize = "20px";
      responseTitle.style.fontWeight = "600";
      responseTitle.style.color = "#374151";
      responseTitle.style.marginBottom = "10px";

      const responseText = document.createElement("div");
      // Process markdown and formatting
      const processedContent = conv.response
        .split("\n\n")
        .map((paragraph) => {
          // Format numbered lists
          if (/^\d+\.\s/.test(paragraph)) {
            // Ensure list items start at beginning and are properly formatted
            return paragraph
              .replace(/^(\d+\.)/, "**$1**") // Makes numbers bold
              .replace(/^\s+/, ""); // Remove any leading whitespace
          }
          // Add bold to section headers
          if (
            paragraph.toUpperCase() === paragraph ||
            paragraph.endsWith(":")
          ) {
            return `**${paragraph}**`;
          }
          return paragraph;
        })
        .join("\n\n");

      responseText.innerHTML = processedContent;
      responseText.style.backgroundColor = "#f3f4f6";
      responseText.style.padding = "15px";
      responseText.style.borderRadius = "8px";
      responseText.style.fontSize = "16px";
      responseText.style.lineHeight = "1.6";

      responseSection.appendChild(responseTitle);
      responseSection.appendChild(responseText);

      // Add sections to container
      qaContainer.appendChild(questionSection);
      qaContainer.appendChild(responseSection);
      content.appendChild(qaContainer);
    });

    // PDF options for better quality
    const opt = {
      margin: [15, 15, 15, 15],
      filename: "conversation-export.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    // Generate PDF
    html2pdf().from(content).set(opt).save();
  };

  // Add this function
  const handleWebsiteRead = async () => {
    const url = prompt("Enter the website URL:");
    if (url) {
      try {
        const response = await fetch("/api/scrape-website", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });
        const data = await response.json();
        if (data.error) {
          alert(data.error);
        } else {
          // Add website content to conversations
          onSave({
            question: `Content from: ${url}`,
            response: data.content,
          });
        }
      } catch (error) {
        alert("Error reading website: " + error.message);
      }
    }
  };

  // Add a cleanup effect
  useEffect(() => {
    return () => {
      buttonSetsRef.current = [];
    };
  }, []);

  // For the original buttons and all followup buttons (like in the summary section)
  const buttonBaseClasses = {
    youtube: "bg-red-500 hover:bg-red-600 text-white rounded-lg",
    amazon: "bg-orange-500 hover:bg-orange-600 text-white rounded-lg",
    wikipedia: "bg-gray-500 hover:bg-gray-600 text-white rounded-lg",
    google: "bg-blue-500 hover:bg-blue-600 text-white rounded-lg",
    reddit: "bg-[#FF4500] hover:bg-[#FF5700] text-white rounded-lg",
    translate: "bg-blue-500 hover:bg-blue-600 text-white rounded-lg",
    summarize: "bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg",
    readWebsite: "bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg",
    stats: "bg-purple-500 hover:bg-purple-600 text-white rounded-lg",
    exportPdf: "bg-blue-500 hover:bg-blue-600 text-white rounded-lg",
    copyAll: "bg-green-500 hover:bg-green-600 text-white rounded-lg",
    shareLink: "bg-teal-500 hover:bg-teal-600 text-white rounded-lg",
    editResp: "bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg",
  };

  // Update the button style in both original and followup sections
  const buttonStyle =
    "px-4 py-2 font-medium text-sm transition-colors duration-200";

  return (
    <div className="relative">
      <div className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div
          className={`mb-4 text-gray-700 p-3 rounded-lg ${
            content.question.toLowerCase().includes("follow-up") ||
            (conversations && conversations.length > 1)
              ? "bg-gray-200"
              : "bg-gray-50"
          }`}
        >
          <span className="font-medium text-gray-900">
            {conversations
              ? `Question ${
                  conversations.findIndex((conv) => conv === content) + 1
                }: `
              : "Question: "}
          </span>
          {content.question}
        </div>

        {isEditing ? (
          <div className="w-full">
            <textarea
              value={editedResponse}
              onChange={(e) => setEditedResponse(e.target.value)}
              className="w-full p-4 rounded-xl bg-gray-50 text-gray-800 border border-purple-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 outline-none transition-all resize-vertical"
              style={{
                height: contentHeight,
                minHeight: contentHeight,
                resize: "vertical",
              }}
              rows={6}
            />
            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div ref={contentRef}>
            <div className="bg-white rounded-xl px-3 py-4 shadow-lg">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-lg prose-slate max-w-none text-gray-800 
                           prose-headings:text-gray-900 prose-headings:font-bold 
                           prose-p:text-gray-800 prose-p:leading-relaxed 
                           prose-li:text-gray-800 prose-li:leading-relaxed
                           space-y-4"
                components={markdownComponents}
              >
                {content.response}
              </ReactMarkdown>
            </div>

            {/* Button Rows Container */}
            <div
              className="flex flex-col gap-2 mt-4"
              ref={(el) => {
                if (el) buttonSetsRef.current.push(el);
              }}
            >
              <ButtonBlock
                onSearch={handleSearch}
                onTranslate={() => setShowTranslateModal(true)}
                onSummarize={handleSummarize}
                onWebsiteRead={handleWebsiteRead}
                onStats={() => setShowStats(true)}
                onExport={handleExportToPDF}
                onCopy={handleCopy}
                onShare={() => handleShare("link")}
                onEdit={handleEdit}
                copyStatus={copyStatus}
              />
            </div>

            {/* Translated Content Section */}
            {operations
              .sort((a, b) => a.timestamp - b.timestamp)
              .map((operation) => {
                if (operation.type === "translation") {
                  return (
                    <div
                      key={operation.timestamp}
                      className="mt-4 p-4 bg-red-50 rounded-lg"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-red-800">
                          Translation ({operation.language})
                        </h3>
                        <button
                          onClick={() => {
                            setOperations((prev) =>
                              prev.filter(
                                (op) => op.timestamp !== operation.timestamp
                              )
                            );
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Translation content */}
                      <div
                        className={`prose prose-invert max-w-none translation-content ${
                          operation.language === "fa" ? "rtl text-right" : ""
                        }`}
                        style={{
                          direction:
                            operation.language === "fa" ? "rtl" : "ltr",
                          textAlign:
                            operation.language === "fa" ? "right" : "left",
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className={`prose prose-slate max-w-none text-gray-800 translation-content ${
                            operation.language === "fa" ? "text-right" : ""
                          }`}
                          components={markdownComponents}
                        >
                          {operation.text}
                        </ReactMarkdown>
                      </div>

                      <ButtonBlock
                        onSearch={handleSearch}
                        onTranslate={() => setShowTranslateModal(true)}
                        onSummarize={handleSummarize}
                        onWebsiteRead={handleWebsiteRead}
                        onStats={() => setShowStats(true)}
                        onExport={handleExportToPDF}
                        onCopy={handleCopy}
                        onShare={() => handleShare("link")}
                        onEdit={handleEdit}
                        copyStatus={copyStatus}
                      />
                    </div>
                  );
                } else if (operation.type === "summary") {
                  return (
                    <div
                      key={operation.timestamp}
                      className="mt-4 p-4 bg-teal-50 rounded-lg"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-teal-800">
                          Summary
                        </h3>
                        <button
                          onClick={() => {
                            setOperations((prev) =>
                              prev.filter(
                                (op) => op.timestamp !== operation.timestamp
                              )
                            );
                          }}
                          className="text-teal-600 hover:text-teal-800"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="prose prose-slate max-w-none text-gray-800">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className="prose prose-slate max-w-none text-gray-800 prose-strong:font-bold prose-strong:text-gray-900"
                          components={markdownComponents}
                        >
                          {operation.text}
                        </ReactMarkdown>
                      </div>

                      <ButtonBlock
                        onSearch={handleSearch}
                        onTranslate={() => setShowTranslateModal(true)}
                        onSummarize={handleSummarize}
                        onWebsiteRead={handleWebsiteRead}
                        onStats={() => setShowStats(true)}
                        onExport={handleExportToPDF}
                        onCopy={handleCopy}
                        onShare={() => handleShare("link")}
                        onEdit={handleEdit}
                        copyStatus={copyStatus}
                      />
                    </div>
                  );
                }
                return null;
              })}

            {/* Loading indicators for translations */}
            {loadingTranslations.size > 0 &&
              Array.from(loadingTranslations).map((lang) => (
                <div
                  key={`loading-translation-${lang}`}
                  className="mt-4 p-4 bg-red-50 rounded-lg"
                >
                  <div className="flex flex-col items-center justify-center py-8">
                    <span className="animate-spin text-4xl text-red-600 mb-2">
                      ⌛
                    </span>
                    <span className="text-red-600 font-medium mb-4">
                      Translating to{" "}
                      {
                        Object.entries({
                          es: "Spanish",
                          fr: "French",
                          de: "German",
                          it: "Italian",
                          zh: "Chinese",
                          ja: "Japanese",
                          ko: "Korean",
                          fa: "Farsi",
                        }).find(([code]) => code === lang)?.[1]
                      }
                      ...
                    </span>
                    <button
                      onClick={handleCancelTranslation}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      Cancel Translation
                    </button>
                  </div>
                </div>
              ))}

            {/* Loading indicators for summaries */}
            {loadingSummaries.size > 0 &&
              Array.from(loadingSummaries).map((summaryId) => (
                <div
                  key={`loading-summary-${summaryId}`}
                  className="mt-4 p-4 bg-teal-50 rounded-lg"
                >
                  <div className="flex flex-col items-center justify-center py-8">
                    <span className="animate-spin text-4xl text-teal-600 mb-2">
                      ⌛
                    </span>
                    <span className="text-teal-600 font-medium mb-4">
                      Generating summary...
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {showStats && (
        <>
          <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm" />
          <div
            className="fixed z-[1000] w-full max-w-md left-1/2 -translate-x-1/2"
            style={{
              bottom: "340px",
              transform: "translateX(-50%)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div className="bg-gray-800 rounded-xl p-4 md:p-6 w-full mx-auto shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  Response Statistics
                </h3>
                <button
                  onClick={() => setShowStats(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {(() => {
                const stats = calculateStats(content.response);
                return (
                  <div className="space-y-6">
                    {/* Basic Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-white">
                          {stats.words}
                        </div>
                        <div className="text-sm text-gray-300">Words</div>
                      </div>
                      <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-white">
                          {stats.chars}
                        </div>
                        <div className="text-sm text-gray-300">Characters</div>
                      </div>
                      <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-white">
                          {stats.spaces}
                        </div>
                        <div className="text-sm text-gray-300">Spaces</div>
                      </div>
                    </div>

                    {/* Word Frequency */}
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-white mb-3">
                        Top Words
                      </h4>
                      <div className="space-y-2">
                        {stats.topWords.map(({ word, count, density }) => (
                          <div
                            key={word}
                            className="flex justify-between items-center text-sm"
                          >
                            <div className="grid grid-cols-3 w-full">
                              <span className="text-gray-300 text-left">
                                {word}
                              </span>
                              <span className="text-gray-400 text-center">
                                {count}x
                              </span>
                              <span className="text-gray-400 text-center">
                                {density}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {showTranslateModal && (
        <>
          <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm" />
          <div
            className="fixed z-[1000] w-full max-w-md left-1/2 -translate-x-1/2"
            style={{
              bottom: "380px",
              transform: "translateX(-50%)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div className="bg-gray-800 rounded-xl p-4 md:p-6 w-full mx-auto shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  Select Language
                </h3>
                <button
                  onClick={() => setShowTranslateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries({
                  es: "Spanish",
                  fr: "French",
                  de: "German",
                  it: "Italian",
                  zh: "Chinese",
                  ja: "Japanese",
                  ko: "Korean",
                  fa: "Farsi",
                }).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => {
                      handleTranslate(code);
                      setShowTranslateModal(false);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {showShareModal && (
        <>
          <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-md mx-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Share Content</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleShare("link")}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2"
                >
                  <span>📋</span> Copy Link
                </button>
                <button
                  onClick={() => handleShare("email")}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2"
                >
                  <span>📧</span> Share via Email
                </button>
                <button
                  onClick={() => handleShare("twitter")}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2"
                >
                  <span>🐦</span> Share on Twitter
                </button>
                <button
                  onClick={() => handleShare("linkedin")}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2"
                >
                  <span>💼</span> Share on LinkedIn
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onPdfUpload(file);
          }
        }}
      />
    </div>
  );
};

export default ContentDisplay;
