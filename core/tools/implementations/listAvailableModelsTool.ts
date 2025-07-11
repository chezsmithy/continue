import { ToolImpl } from ".";

export const listAvailableModelsImpl: ToolImpl = async (args, extras) => {
  // Automatically determine which role to show based on the current LLM being used
  let currentRole = "agent"; // default fallback

  // Check which model is currently being used for this tool call
  const currentLLM = extras.llm;
  if (currentLLM) {
    // Find which role this model is assigned to
    for (const [modelRole, models] of Object.entries(
      extras.config.modelsByRole,
    )) {
      if (
        models.some(
          (model) =>
            model.title === currentLLM.title ||
            model.model === currentLLM.model,
        )
      ) {
        currentRole = modelRole;
        break;
      }
    }
  }

  // Get available models for the detected role
  const availableModels =
    extras.config.modelsByRole[
      currentRole as keyof typeof extras.config.modelsByRole
    ] || [];
  const currentModel =
    extras.config.selectedModelByRole[
      currentRole as keyof typeof extras.config.selectedModelByRole
    ];

  if (availableModels.length === 0) {
    return [
      {
        name: "Available Models",
        description: `No ${currentRole} models configured`,
        content: `No ${currentRole} models are currently configured in your setup.`,
      },
    ];
  }

  // Format model information
  const modelInfo = availableModels
    .map((model, index) => {
      const isCurrent =
        currentModel &&
        (model.title === currentModel.title ||
          model.model === currentModel.model);
      const statusIndicator = isCurrent ? " (CURRENT)" : "";

      return `${index + 1}. ${model.title || model.model}${statusIndicator}
   - Model ID: ${model.model}
   - Provider: ${model.providerName}
   - Context Length: ${model.contextLength || "Unknown"}`;
    })
    .join("\n\n");

  console.log("📋 AVAILABLE MODELS REQUESTED");
  console.log(`   Role: ${currentRole}`);
  console.log(
    `   Found ${availableModels.length} available ${currentRole} models`,
  );
  console.log(`   Current model: ${currentModel?.title || "None"}`);

  return [
    {
      name: `Available ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Models`,
      description: `List of configured ${currentRole} models`,
      content: `Available ${currentRole} models in your configuration:\n\n${modelInfo}\n\nTotal: ${availableModels.length} models\n\nNote: Use the exact "Model ID" when calling model_switch tool.`,
    },
  ];
};
