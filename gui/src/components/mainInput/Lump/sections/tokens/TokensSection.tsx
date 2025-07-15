import { useTokenCount } from "../../../../../hooks/useTokenCount";
import { useAppSelector } from "../../../../../redux/hooks";
import { selectSelectedChatModel } from "../../../../../redux/slices/configSlice";
import { useFontSize } from "../../../../ui";

function TokensSection() {
  const { 
    currentTokens, 
    contextLength, 
    totalContextUsage,
    systemMessageTokens,
    toolsTokens,
    safetyBuffer,
    maxOutputTokens,
    inputTokensAvailable,
    historyTokens,
    lastMessagesTokens,
    messageBreakdown, 
    percentage,
    isLoading
  } = useTokenCount();
  const selectedModel = useAppSelector(selectSelectedChatModel);
  
  // Font sizes following UI patterns
  const baseFontSize = useFontSize();
  const smallFont = useFontSize(-1);
  const tinyFont = useFontSize(-2);

  if (currentTokens === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-description-muted">
        <div className="text-center">
          <div className="mb-2" style={{ fontSize: smallFont }}>No conversation yet</div>
          <div style={{ fontSize: tinyFont }}>Conversation length will appear here once you start chatting</div>
        </div>
      </div>
    );
  }

  

  const getCapacityLevel = () => {
    if (percentage < 40) return "Plenty of room";
    if (percentage < 70) return "Moderate usage";
    if (percentage < 90) return "Getting full";
    if (percentage >= 100) return "Full";
  };

  const getCapacityColor = () => {
    if (percentage < 40) return "text-green-600 dark:text-green-400";
    if (percentage < 70) return "text-blue-600 dark:text-blue-400";
    if (percentage < 90) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const shouldShowPruningWarning = () => {
    // Warn when pruning will actually happen:
    // 1. If we're already over capacity (negative available tokens)
    // 2. If there's not enough room for a typical user message
    const typicalMessageSize = 200;
    const shouldWarn = inputTokensAvailable < 0 || inputTokensAvailable < typicalMessageSize;
    
    // Debug logging
    console.log('TokensSection Debug:', {
      inputTokensAvailable,
      currentTokens,
      contextLength,
      shouldWarn,
      isLoading
    });
    
    return shouldWarn;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Streamlined Token Display */}
      <div className="text-center">
        <div 
          className="font-semibold mb-3"
          style={{ fontSize: baseFontSize + 2 }}
        >
          {isLoading ? 'Calculating...' : `${currentTokens.toLocaleString()} / ${contextLength.toLocaleString()} tokens`}
        </div>
        
        {!isLoading && (
          <div className="w-full max-w-64 mx-auto px-4">
            {/* Gauge bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  percentage < 40 ? 'bg-green-500' :
                  percentage < 70 ? 'bg-blue-500' :
                  percentage < 90 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (currentTokens / contextLength) * 100))}%` }}
              />
            </div>
            {/* Status - always centered */}
            <div 
              className={`font-medium text-center ${getCapacityColor()}`}
              style={{ fontSize: smallFont }}
            >
              {getCapacityLevel()}
            </div>
          </div>
        )}
      </div>
      
      {/* Pruning Warning */}
      {shouldShowPruningWarning() && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-yellow-500 mt-0.5">ℹ️</div>
            <div>
              <div 
                className="font-medium text-yellow-700 dark:text-yellow-300"
                style={{ fontSize: smallFont }}
              >
                Conversation History Notice
              </div>
              <div 
                className="text-description mt-1"
                style={{ fontSize: tinyFont }}
              >
                Your next message may use significant context when we account for rules, tools, and the system message. Older messages may be removed to fit new responses.
                Recent messages are always preserved.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokensSection;