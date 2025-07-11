import { Tool } from "../..";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "../builtIn";

export const listAvailableModelsTool: Tool = {
  type: "function",
  displayTitle: "List Available Models",
  wouldLikeTo: "list available models",
  isCurrently: "listing available models",
  hasAlready: "listed available models",
  readonly: true,
  isInstant: true,
  group: BUILT_IN_GROUP_NAME,
  function: {
    name: BuiltInToolNames.ListAvailableModels,
    description:
      "List all available chat models in the current configuration. Use this to discover what models are available before attempting to switch models. Returns model identifiers, titles, and basic capability information. You should analyze this list at the start of a session to understand which models might be best applied to each problem. Then use the switch model tool to use the most appropriate model.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};
