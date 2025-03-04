export const PROVIDER_PROMPT_CACHING_SUPPORT: Record<
  string,
  (model: string) => boolean | undefined
> = {
  bedrock: (model) => {
    // For Bedrock, only support Claude Sonnet models with versions 3.5/3-5 and 3.7/3-7
    if (
      model.toLowerCase().includes("sonnet") &&
      ["claude-3-5", "claude-3.5", "claude-3-7", "claude-3.7"].some((part) =>
        model.toLowerCase().includes(part),
      )
    ) {
      return true;
    }
  },
};
