"use client";
import { useState, useEffect } from "react";
import ContentDisplay from "./ContentDisplay";

export default function ContentWrapper() {
  console.log("ContentWrapper starting to render");

  // Start with hardcoded content instead of null
  const [content] = useState({
    question: "Test Question",
    response: "1. Test Response\n2. Another line\n3. Third line",
  });

  return (
    <div className="container mx-auto p-4 bg-gray-100">
      <h1 className="text-2xl mb-4">Content Test</h1>
      {/* Add a test button */}
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={() => console.log("Test button clicked")}
      >
        Test Button
      </button>

      <ContentDisplay content={content} />
    </div>
  );
}
