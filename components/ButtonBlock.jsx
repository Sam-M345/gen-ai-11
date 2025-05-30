/**
 * ButtonBlock Component - Layout Rules:
 *
 * 1. Mobile Layout Rules:
 *    - Maximum 4 buttons per row
 *    - All buttons must have equal width within a row
 *    - If last row has fewer than 4 buttons, add invisible placeholders to maintain width
 *    - Font size: text-[11px] for mobile, text-base for desktop
 *
 * 2. Button Organization:
 *    - Group related functionality together
 *    - Search buttons in first row(s)
 *    - Action buttons in subsequent rows
 *    - Maintain 4-button grid alignment
 *
 * 3. Styling Consistency:
 *    - All buttons: h-9, rounded-md, font-medium
 *    - Consistent padding: px-0.5 mobile, px-1 desktop
 *    - Each button uses flex-1 for equal width
 *    - Use appropriate color schemes for button categories
 */
export const ButtonBlock = ({
  onSearch,
  onTranslate,
  onSummarize,
  onWebsiteRead,
  onStats,
  onExport,
  onCopy,
  onShare,
  onEdit,
  onGenerateImage,
  copyStatus,
}) => {
  const buttonClass =
    "flex-1 h-auto min-h-[2.25rem] text-white font-medium rounded-md text-center text-[13px] leading-tight sm:text-base px-0.5 py-1 sm:px-1 flex items-center justify-center";
  const spacerClass = "flex-1 h-9 px-0.5 sm:px-1 rounded-md";

  return (
    <div className="flex flex-col gap-1">
      {/* First Row - 4 buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => onSearch("youtube")}
          className={`${buttonClass} bg-red-500 hover:bg-red-600`}
        >
          Youtube
        </button>
        <button
          onClick={() => onSearch("amazon")}
          className={`${buttonClass} bg-orange-500 hover:bg-orange-600`}
        >
          Amazon
        </button>
        <button
          onClick={() => onSearch("wikipedia")}
          className={`${buttonClass} bg-gray-500 hover:bg-gray-600`}
        >
          Wiki
        </button>
        <button
          onClick={() => onSearch("google")}
          className={`${buttonClass} bg-blue-500 hover:bg-blue-600`}
        >
          Google
        </button>
      </div>

      {/* Second Row - 4 buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => {}} // Removed functionality
          className={`${buttonClass} bg-[#FF4500] hover:bg-[#FF5700]`}
        >
          Reddit
        </button>
        <button
          onClick={onTranslate}
          className={`${buttonClass} bg-blue-500 hover:bg-blue-600`}
        >
          Translate
        </button>
        <button
          onClick={onSummarize}
          className={`${buttonClass} bg-indigo-500 hover:bg-indigo-600`}
        >
          Summarize
        </button>
        <button
          onClick={onWebsiteRead}
          className={`${buttonClass} bg-cyan-500 hover:bg-cyan-600`}
        >
          Read Web
        </button>
      </div>

      {/* Third Row - 4 buttons */}
      <div className="flex gap-1">
        <button
          onClick={onStats}
          className={`${buttonClass} bg-purple-500 hover:bg-purple-600`}
        >
          Stats
        </button>
        <button
          onClick={onExport}
          className={`${buttonClass} bg-blue-500 hover:bg-blue-600`}
        >
          Export PDF
        </button>
        <button
          onClick={onCopy}
          className={`${buttonClass} bg-green-500 hover:bg-green-600`}
        >
          {copyStatus || "Copy"}
        </button>
        <button
          onClick={onShare}
          className={`${buttonClass} bg-teal-500 hover:bg-teal-600`}
        >
          Share
        </button>
      </div>

      {/* Fourth Row - 4 buttons (2 visible + 2 invisible) */}
      <div className="flex gap-1">
        <button
          onClick={onEdit}
          className={`${buttonClass} bg-yellow-500 hover:bg-yellow-600`}
        >
          Edit
        </button>
        <button
          onClick={onGenerateImage}
          className={`${buttonClass} bg-pink-500 hover:bg-pink-600`}
        >
          Generate Img
        </button>
        <div className={spacerClass}></div>
        <div className={spacerClass}></div>
      </div>
    </div>
  );
};
