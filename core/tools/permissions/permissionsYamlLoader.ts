import fs from "fs";
import path from "path";
import YAML from "yaml";
import { getContinueGlobalPath } from "../../util/paths";
import { Logger } from "../../util/Logger";
import type {
  PermissionsYamlConfig,
  ToolPermissionPolicy,
  PermissionPolicy,
} from "./types";

/**
 * Path to the permissions.yaml file in ~/.continue directory
 */
export function getPermissionsYamlPath(): string {
  return path.join(getContinueGlobalPath(), "permissions.yaml");
}

/**
 * Loads permissions from ~/.continue/permissions.yaml
 * Returns null if file doesn't exist or can't be parsed
 */
export function loadPermissionsYaml(): PermissionsYamlConfig | null {
  const permissionsPath = getPermissionsYamlPath();

  try {
    if (!fs.existsSync(permissionsPath)) {
      Logger.debug(`Permissions YAML file does not exist: ${permissionsPath}`);
      return null;
    }

    const content = fs.readFileSync(permissionsPath, "utf-8");
    const parsed = YAML.parse(content) as PermissionsYamlConfig;

    // Validate the structure
    if (parsed && typeof parsed === "object") {
      const validKeys = ["allow", "ask", "exclude"];
      const hasValidStructure = Object.keys(parsed).every(
        (key) =>
          validKeys.includes(key) &&
          (!parsed[key as keyof PermissionsYamlConfig] ||
            Array.isArray(parsed[key as keyof PermissionsYamlConfig])),
      );

      if (hasValidStructure) {
        Logger.debug("Loaded permissions from YAML", {
          allow: parsed.allow?.length || 0,
          ask: parsed.ask?.length || 0,
          exclude: parsed.exclude?.length || 0,
        });
        return parsed;
      }
    }

    Logger.warn(`Invalid permissions YAML structure: ${permissionsPath}`);
    return null;
  } catch (error) {
    Logger.error("Failed to load permissions YAML", {
      error,
      path: permissionsPath,
    });
    return null;
  }
}

/**
 * Parses a pattern string into a ToolPermissionPolicy
 * Supports formats like:
 * - "runTerminalCommand" -> { tool: "runTerminalCommand", permission }
 * - "runTerminalCommand(npm install)" -> { tool: "runTerminalCommand", permission, argumentMatches: { command: "npm install" } }
 */
export function parseToolPattern(
  pattern: string,
  permission: PermissionPolicy,
): ToolPermissionPolicy {
  const match = pattern.match(/^([^(]+)(?:\(([^)]*)\))?$/);
  if (!match) {
    throw new Error(`Invalid tool pattern: ${pattern}`);
  }

  const [, toolName, args] = match;
  const normalizedName = toolName.trim();

  const policy: ToolPermissionPolicy = {
    tool: normalizedName,
    permission,
  };

  if (args) {
    const trimmedArgs = args.trim();
    if (trimmedArgs) {
      // Map tool names to their primary argument parameter
      const toolArgMappings: Record<string, string> = {
        run_terminal_command: "command",
        runTerminalCommand: "command", // Legacy name for backward compatibility
        read_file: "file_path",
        read_file_range: "file_path",
        create_new_file: "file_path",
        edit_existing_file: "file_path",
        grep_search: "query",
        file_glob_search: "pattern",
        search_web: "query",
      };

      const argKey = toolArgMappings[normalizedName] || "pattern";
      policy.argumentMatches = {
        [argKey]: trimmedArgs,
      };
    }
  }

  return policy;
}

/**
 * Converts permissions YAML config to ToolPermissionPolicy array
 * Order matters: more restrictive policies (exclude) come first
 */
export function yamlConfigToPolicies(
  config: PermissionsYamlConfig,
): ToolPermissionPolicy[] {
  const policies: ToolPermissionPolicy[] = [];

  // Order matters: more restrictive policies first
  if (config.exclude) {
    for (const pattern of config.exclude) {
      policies.push(parseToolPattern(pattern, "exclude"));
    }
  }

  if (config.ask) {
    for (const pattern of config.ask) {
      policies.push(parseToolPattern(pattern, "ask"));
    }
  }

  if (config.allow) {
    for (const pattern of config.allow) {
      policies.push(parseToolPattern(pattern, "allow"));
    }
  }

  return policies;
}

/**
 * Creates the permissions.yaml file with default content if it doesn't exist
 */
export async function ensurePermissionsYamlExists(): Promise<void> {
  const permissionsPath = getPermissionsYamlPath();
  const dir = path.dirname(permissionsPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  // Create file if it doesn't exist
  if (!fs.existsSync(permissionsPath)) {
    const defaultContent = `# Continue tool permissions

# Tools that are automatically allowed without prompting
allow: []

# Tools that require user confirmation before execution
# Format: toolName or toolName(arguments)
# Examples:
#   - run_terminal_command(npm install)
#   - run_terminal_command(git*)
#   - read_file(/etc/*)
#   - grep_search(*password*)
ask: []

# Tools that are completely excluded (won't be available)
exclude: []
`;

    await fs.promises.writeFile(permissionsPath, defaultContent, "utf-8");
    Logger.info(`Created default permissions.yaml at ${permissionsPath}`);
  }
}
