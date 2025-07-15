import { useContext, useEffect, useState } from 'react';
import { IdeMessengerContext } from '../context/IdeMessenger';
import { useAppSelector } from '../redux/hooks';
import { selectSelectedChatModel } from '../redux/slices/configSlice';

export function useTokenCount() {
  const history = useAppSelector((state) => state.session.history);
  const selectedModel = useAppSelector(selectSelectedChatModel);
  const ideMessenger = useContext(IdeMessengerContext);
  
  const [tokenData, setTokenData] = useState({
    currentTokens: 0,
    contextLength: 0,
    totalContextUsage: 0,
    systemMessageTokens: 0,
    toolsTokens: 0,
    safetyBuffer: 0,
    maxOutputTokens: 0,
    inputTokensAvailable: 0,
    historyTokens: 0,
    lastMessagesTokens: 0,
    messageBreakdown: {
      totalMessages: 0,
      userTokens: 0,
      assistantTokens: 0,
      userPercentage: 0,
      assistantPercentage: 0,
    },
    status: 'healthy' as 'healthy' | 'getting-full' | 'approaching-limit' | 'near-capacity',
    percentage: 0,
    isLoading: false,
  });

  useEffect(() => {
    async function calculateTokens() {
      if (!history.length || !selectedModel) {
        setTokenData({
          currentTokens: 0,
          contextLength: selectedModel?.contextLength || 4096,
          totalContextUsage: 0,
          systemMessageTokens: 0,
          toolsTokens: 0,
          safetyBuffer: 0,
          maxOutputTokens: 0,
          inputTokensAvailable: 0,
          historyTokens: 0,
          lastMessagesTokens: 0,
          messageBreakdown: {
            totalMessages: 0,
            userTokens: 0,
            assistantTokens: 0,
            userPercentage: 0,
            assistantPercentage: 0,
          },
          status: 'healthy' as const,
          percentage: 0,
          isLoading: false,
        });
        return;
      }

      setTokenData(prev => ({ ...prev, isLoading: true }));

      try {
        // Convert history to chat messages
        const messages = history.map(item => item.message);
        
        // Get accurate token count from backend
        const result = await ideMessenger.request("stats/getHistoryTokenCount", {
          messages,
          modelName: selectedModel.model,
        });
        
        if (result.status === "success") {
          const data = result.content;
          
          setTokenData({
            currentTokens: data.totalTokens,
            contextLength: data.contextLength,
            totalContextUsage: data.totalUsedTokens,
            systemMessageTokens: data.systemMsgTokens,
            toolsTokens: data.toolTokens,
            safetyBuffer: data.countingSafetyBuffer,
            maxOutputTokens: data.minOutputTokens,
            inputTokensAvailable: data.inputTokensAvailable,
            historyTokens: data.historyTokens,
            lastMessagesTokens: data.lastMessagesTokens,
            messageBreakdown: {
              totalMessages: history.length,
              userTokens: data.userTokens,
              assistantTokens: data.assistantTokens,
              userPercentage: data.totalTokens > 0 ? Math.round((data.userTokens / data.totalTokens) * 100) : 0,
              assistantPercentage: data.totalTokens > 0 ? Math.round((data.assistantTokens / data.totalTokens) * 100) : 0,
            },
            status: data.totalUsedTokens < data.contextLength * 0.6 ? 'healthy' : 
                   data.totalUsedTokens < data.contextLength * 0.8 ? 'getting-full' :
                   data.totalUsedTokens < data.contextLength * 0.95 ? 'approaching-limit' : 'near-capacity',
            percentage: Math.round((data.totalUsedTokens / data.contextLength) * 100),
            isLoading: false,
          });
        } else {
          console.error("Failed to get token count from IDE:", result.error);
          // Set loading to false even on error
          setTokenData(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error getting token count:', error);
        setTokenData(prev => ({ ...prev, isLoading: false }));
      }
    }

    calculateTokens();
  }, [history, selectedModel, ideMessenger]);

  return tokenData;
}

export function getStatusColor(percentage: number): string {
  if (percentage < 60) return 'text-green-500';
  if (percentage < 80) return 'text-yellow-500';
  if (percentage < 95) return 'text-orange-500';
  return 'text-red-500';
}

export function getStatusMessage(percentage: number): string {
  if (percentage < 60) return 'Healthy - plenty of context remaining';
  if (percentage < 80) return 'Getting full - consider context management';
  if (percentage < 95) return 'Approaching limit - may need to clear history';
  return 'Near capacity - context management recommended';
}