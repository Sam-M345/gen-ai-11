"use client";
import { useState } from "react";
import ContentDisplay from "./components/ContentDisplay";

export default function Page() {
  const [content] = useState({
    question: "write a story 30 words max",
    response:
      "Beneath the suffocating sea,\n\nShe yearned for the sun's embrace.\n\nWith every gasp,\n\nShe fought,\n\nTo resurface.",
  });

  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold text-center text-white mb-8">
        AI Content Generator
      </h1>
      <ContentDisplay content={content} />
    </div>
  );
}
