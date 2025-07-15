import { useTokenCount } from "../../../../../hooks/useTokenCount";

export const TokensSectionTooltip = () => {
  const { currentTokens, contextLength, isLoading } = useTokenCount();
  
  if (isLoading) {
    return <span>Tokens (calculating...)</span>;
  }
  
  if (currentTokens === 0) {
    return <span>Tokens</span>;
  }

  return (
    <span>
      Tokens ({currentTokens.toLocaleString()} / {contextLength.toLocaleString()})
    </span>
  );
};