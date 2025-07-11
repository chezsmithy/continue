import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const modelSwitchTool: Tool = {
  type: "function",
  displayTitle: "Switch Model",
  wouldLikeTo: "switch to {{{ targetModel }}}",
  isCurrently: "switching to {{{ targetModel }}}",
  hasAlready: "switched to {{{ targetModel }}}",
  readonly: false,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.ModelSwitch,
    description:
      "Switch to a different model when beneficial based on task complexity patterns and user sentiment. Review the conversation history to identify these patterns:\n\n" +
      "**Task Complexity Patterns** (review recent conversation turns):\n" +
      "- Switch to efficient models like Nova Pro after 2+ consecutive simple tasks (basic file operations, straightforward questions, single-file edits)\n" +
      "- Switch to capable models like Claude 4.0 when encountering complex tasks (multi-file operations, architectural decisions, advanced reasoning)\n\n" +
      "**User Sentiment Monitoring** (analyze user messages and feedback):\n" +
      "- Watch for frustration indicators: repeated requests for the same thing, expressions of confusion, requests to 'try again' or 'be more careful'\n" +
      "- If user seems frustrated or unsatisfied with responses, switch to a more capable model immediately\n" +
      "- Consider user feedback like 'this isn't working' or 'can you do better' as signals to upgrade to a higher-capability model\n\n" +
      "**Switching Strategy**:\n" +
      "- Prioritize user satisfaction over efficiency - when in doubt, choose the more capable model\n" +
      "- Review conversation history to assess whether previous responses met user expectations\n" +
      "- **Note**: Model switches **do not affect context and consistency** of the conversation. The model change is transparent and doesn't reset any previous information or task history.\n" +
      "- Use the exact model identifiers from the available configuration - check what models are actually available before switching",
    parameters: {
      type: "object",
      required: ["targetModel", "reason"],
      properties: {
        targetModel: {
          type: "string",
          description:
            "Target model identifier from your available configuration. Choose a more capable model for complex tasks or a more efficient model for simple tasks based on what's available in your setup.",
        },
        reason: {
          type: "string",
          description:
            "Explanation of why switching to this model would be beneficial for the current task",
        },
      },
    },
  },
};
