import { useState, useRef, useEffect } from "react";

const UtilitiesPanel = ({
  onExport,
  onSave,
  onShare,
  onSearch,
  onFormatChange,
  onLanguageChange,
  counts,
  tokenCounts,
  modelInfo,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setShowStats(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Calculate stats from the counts prop
  const stats = {
    totalWords: counts.words || 0,
    totalChars: counts.chars || 0,
    spaces:
      counts.chars - counts.chars.toString().replace(/\s/g, "").length || 0,
    topWords: counts.topWords || [],
  };

  return (
    <div className="absolute top-4 right-4 z-50">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      >
        <span className="text-2xl scale-100">⚙️</span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-14 right-0 w-80 bg-gray-800 rounded-xl shadow-2xl p-4"
        >
          <div className="space-y-2 mb-4">
            <button
              onClick={() => setShowStats(true)}
              className="w-full text-left px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
            >
              📊 Model and Tokens
            </button>
            <button
              onClick={() => onSave()}
              className="w-full text-left px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
            >
              📥 Save to Favorites
            </button>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStats(false);
            }
          }}
        >
          <div className="bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-bold text-white">
                Model and Token Information
              </h3>
              <button
                onClick={() => setShowStats(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Model Information */}
              <div className="bg-gray-700/50 p-3 rounded-lg">
                <h4 className="text-base font-semibold text-white mb-2">
                  Model
                </h4>
                <div className="text-gray-300">
                  {modelInfo || "No model information available"}
                </div>
              </div>

              {/* Token Usage */}
              <div className="bg-gray-700/50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-300">Prompt Tokens</div>
                  <div className="text-sm font-bold text-white">
                    {tokenCounts.promptTokens || 0}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-300">Response Tokens</div>
                  <div className="text-sm font-bold text-white">
                    {tokenCounts.responseTokens || 0}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-gray-600">
                  <div className="text-sm text-gray-300">Total Tokens</div>
                  <div className="text-sm font-bold text-white">
                    {(tokenCounts.promptTokens || 0) +
                      (tokenCounts.responseTokens || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilitiesPanel;
