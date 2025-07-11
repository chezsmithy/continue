import { ToolImpl } from ".";

export const modelSwitchImpl: ToolImpl = async (args, extras) => {
  const { targetModel, reason } = args;

  // Automatically determine which role to switch based on the current LLM being used
  let targetRole = "chat"; // default fallback

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
        targetRole = modelRole;
        break;
      }
    }
  }

  const currentModel =
    extras.config.selectedModelByRole[
      targetRole as keyof typeof extras.config.selectedModelByRole
    ];

  // Console logging for debugging
  console.log(`🔄 MODEL SWITCH REQUEST:`);
  console.log(`   Role: ${targetRole}`);
  console.log(`   From: ${currentModel?.title || "unknown"}`);
  console.log(`   To: ${targetModel}`);
  console.log(`   Reason: ${reason}`);

  // Check if target model exists in available models for the target role
  const availableModels =
    extras.config.modelsByRole[
      targetRole as keyof typeof extras.config.modelsByRole
    ] || [];
  const targetModelExists = availableModels.some(
    (model) => model.title === targetModel || model.model === targetModel,
  );

  if (!targetModelExists) {
    // If not found in target role, check other roles
    let foundInRole = null;
    for (const [roleName, models] of Object.entries(
      extras.config.modelsByRole,
    )) {
      if (
        models.some(
          (model) => model.title === targetModel || model.model === targetModel,
        )
      ) {
        foundInRole = roleName;
        break;
      }
    }

    if (foundInRole) {
      console.log(
        `⚠️ Target model ${targetModel} found in ${foundInRole} role, not ${targetRole} role`,
      );
      return [
        {
          name: "Model Switch Error",
          description: "Model in different role",
          content: `Error: Model "${targetModel}" is available for ${foundInRole} role, but not for ${targetRole} role. Available ${targetRole} models: ${availableModels.map((m) => m.title || m.model).join(", ")}`,
        },
      ];
    } else {
      console.log(`❌ Target model ${targetModel} not found in any role`);
      return [
        {
          name: "Model Switch Error",
          description: "Target model not available",
          content: `Error: Model "${targetModel}" is not available in the current configuration. Available ${targetRole} models: ${availableModels.map((m) => m.title || m.model).join(", ")}`,
        },
      ];
    }
  }

  // Find the target model object to get proper reference
  const targetModelObj = availableModels.find(
    (model) => model.title === targetModel || model.model === targetModel,
  );

  if (!targetModelObj) {
    console.log(`❌ Unable to find model object for ${targetModel}`);
    return [
      {
        name: "Model Switch Error",
        description: "Model object not found",
        content: `Error: Unable to find model object for "${targetModel}"`,
      },
    ];
  }

  // Perform the actual model switch
  if (extras.updateSelectedModel) {
    try {
      const modelTitle = targetModelObj.title || targetModelObj.model;
      await extras.updateSelectedModel(targetRole, modelTitle);
      console.log(`✅ Model switch completed successfully`);
      console.log(`   Role: ${targetRole}`);
      console.log(`   Switched from: ${currentModel?.title}`);
      console.log(`   Switched to: ${modelTitle}`);

      return [
        {
          name: "Model Switch",
          description: "Model switch completed",
          content: `Successfully switched ${targetRole} model to ${targetModel}. Reason: ${reason}`,
        },
      ];
    } catch (error) {
      console.log(`❌ Model switch failed: ${error}`);
      return [
        {
          name: "Model Switch Error",
          description: "Model switch failed",
          content: `Failed to switch to ${targetModel}. Error: ${error}`,
        },
      ];
    }
  } else {
    console.log(
      `❌ Model switch not available (updateSelectedModel not provided)`,
    );
    return [
      {
        name: "Model Switch Error",
        description: "Model switch not available",
        content: `Model switching is not available in this context.`,
      },
    ];
  }
};
