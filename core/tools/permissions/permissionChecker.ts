import { ToolPolicy } from "@continuedev/terminal-security";
import type { Tool } from "../..";
import type {
  PermissionCheckResult,
  PermissionPolicy,
  ToolPermissionPolicy,
  ToolPermissions,
} from "./types";

/**
 * Checks if a tool name matches a pattern.
 * Supports wildcards (*) for pattern matching.
 * Also handles special command patterns like "runTerminalCommand(ls*)"
 */
export function matchesToolPattern(
  toolName: string,
  pattern: string,
  toolArguments?: Record<string, any>,
): boolean {
  if (pattern === "*") return true;
  if (pattern === toolName) return true;

  // Handle special command patterns like "run_terminal_command(ls*)" or legacy "runTerminalCommand(ls*)"
  const commandMatch = pattern.match(
    /^(?:run_terminal_command|runTerminalCommand)\((.+)\)$/,
  );
  if (commandMatch) {
    // Check if this is the run_terminal_command tool
    const isTerminalTool =
      toolName === "runTerminalCommand" || toolName === "run_terminal_command";

    if (isTerminalTool && toolArguments?.command) {
      const commandPattern = commandMatch[1];
      const command = toolArguments.command;

      // Handle command patterns with wildcards
      if (commandPattern.includes("*") || commandPattern.includes("?")) {
        // Escape all regex metacharacters except * and ?
        const escaped = commandPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
        // Convert * and ? to their regex equivalents
        const regexPattern = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(command);
      }

      // Exact command match
      return command === commandPattern;
    }
    return false;
  }

  // Handle regular wildcard patterns like "mcp__*"
  if (pattern.includes("*") || pattern.includes("?")) {
    // Escape all regex metacharacters except * and ?
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    // Convert * and ? to their regex equivalents
    const regexPattern = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(toolName);
  }

  return false;
}

/**
 * Checks if tool call arguments match the specified patterns.
 * Supports glob patterns with * and ? wildcards.
 */
export function matchesArguments(
  args: Record<string, any>,
  patterns?: Record<string, any>,
): boolean {
  if (!patterns) return true;

  for (const [key, pattern] of Object.entries(patterns)) {
    const argValue = args[key];

    if (pattern === "*") continue; // Wildcard matches anything

    // Handle glob patterns with wildcards (only for string patterns)
    if (
      typeof pattern === "string" &&
      (pattern.includes("*") || pattern.includes("?"))
    ) {
      // Convert argValue to string for pattern matching
      const stringValue = String(argValue ?? "");

      // Escape all regex metacharacters except * and ?
      const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      // Convert * and ? to their regex equivalents
      const regexPattern = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
      const regex = new RegExp(`^${regexPattern}$`);

      if (!regex.test(stringValue)) {
        return false;
      }
    } else {
      // Exact match for non-glob patterns (preserve original behavior)
      if (argValue !== pattern) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Converts Permission Policy to ToolPolicy
 */
function permissionPolicyToToolPolicy(
  permission: PermissionPolicy,
): ToolPolicy {
  switch (permission) {
    case "allow":
      return "allowedWithoutPermission";
    case "ask":
      return "allowedWithPermission";
    case "exclude":
      return "disabled";
    default:
      return "allowedWithPermission";
  }
}

/**
 * Converts ToolPolicy to Permission Policy
 */
function toolPolicyToPermissionPolicy(policy: ToolPolicy): PermissionPolicy {
  switch (policy) {
    case "allowedWithoutPermission":
      return "allow";
    case "allowedWithPermission":
      return "ask";
    case "disabled":
      return "exclude";
    default:
      return "ask";
  }
}

/**
 * Evaluates a tool call request against a set of permission policies.
 * Returns the permission for the first matching policy.
 *
 * Respects dynamic policy evaluation from the terminal-security package.
 */
export function checkToolPermission(
  toolName: string,
  toolArguments: Record<string, any>,
  permissions: ToolPermissions,
  processedArgs?: Record<string, unknown>,
  tool?: Tool,
): PermissionCheckResult {
  const policies = permissions.policies;

  // First, get the base permission from static policies
  // Default to "allow" (most lenient) so permissions.yaml only restricts, never loosens
  let basePermission: PermissionPolicy = "allow";
  let matchedPolicy: ToolPermissionPolicy | undefined;

  for (const policy of policies) {
    if (
      matchesToolPattern(toolName, policy.tool, toolArguments) &&
      matchesArguments(toolArguments, policy.argumentMatches)
    ) {
      basePermission = policy.permission;
      matchedPolicy = policy;
      break;
    }
  }

  // Check if tool has dynamic policy evaluation (e.g., file access policies)
  if (tool?.evaluateToolCallPolicy) {
    // Convert permission to policy
    const basePolicy = permissionPolicyToToolPolicy(basePermission);

    // Evaluate the dynamic policy with both parsed and processed args
    const evaluatedPolicy = tool.evaluateToolCallPolicy(
      basePolicy,
      toolArguments,
      processedArgs,
    );

    // Convert evaluated policy back to permission
    const evaluatedPermission = toolPolicyToPermissionPolicy(evaluatedPolicy);

    // Return the most restrictive between YAML and evaluated policy
    // Order: exclude > ask > allow
    if (basePermission === "exclude" || evaluatedPermission === "exclude") {
      return {
        permission: "exclude",
        matchedPolicy,
      };
    }
    if (basePermission === "ask" || evaluatedPermission === "ask") {
      return {
        permission: "ask",
        matchedPolicy,
      };
    }
    return {
      permission: "allow",
      matchedPolicy,
    };
  }

  // No dynamic evaluation, return static result
  return {
    permission: basePermission,
    matchedPolicy,
  };
}

/**
 * Filters out tools that have "exclude" permission from a list of tools.
 * Supports dynamic policy evaluation by passing full Tool objects.
 */
export function filterExcludedTools(
  tools: Tool[],
  permissions: ToolPermissions,
): Tool[] {
  return tools.filter((tool) => {
    const result = checkToolPermission(
      tool.function.name,
      {},
      permissions,
      undefined, // No processed args for filtering
      tool, // Pass tool for dynamic evaluation
    );
    return result.permission !== "exclude";
  });
}
