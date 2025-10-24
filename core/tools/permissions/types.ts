/**
 * Permission policy types for tools
 *
 * - allow: Execute automatically without prompting
 * - ask: Require user confirmation before execution
 * - exclude: Tool is disabled entirely
 */
export type PermissionPolicy = "allow" | "ask" | "exclude";

/**
 * Represents a single permission rule for a tool
 */
export interface ToolPermissionPolicy {
  /** The tool name to match against (supports wildcards) */
  tool: string;
  /** The permission to apply when this rule matches */
  permission: PermissionPolicy;
  /** Optional argument matching patterns. If not specified, applies to all calls to this tool */
  argumentMatches?: Record<string, any>;
}

/**
 * Complete set of permission policies
 */
export interface ToolPermissions {
  /** Array of permission policies that are evaluated in order */
  policies: ToolPermissionPolicy[];
}

/**
 * Result of checking a tool call against permission policies
 */
export interface PermissionCheckResult {
  /** The permission that applies to this tool call */
  permission: PermissionPolicy;
  /** The policy rule that matched this tool call */
  matchedPolicy?: ToolPermissionPolicy;
}

/**
 * YAML configuration structure for permissions.yaml
 */
export interface PermissionsYamlConfig {
  allow?: string[];
  ask?: string[];
  exclude?: string[];
}
