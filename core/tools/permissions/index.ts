/**
 * Tool permissions system
 *
 * This module provides tool permission management using the
 * ~/.continue/permissions.yaml file.
 *
 * Features:
 * - Load permissions from ~/.continue/permissions.yaml
 * - Check tool permissions before execution
 * - Support for wildcards and argument matching
 * - Compatible with terminal-security dynamic evaluation
 */

export type {
  PermissionPolicy,
  PermissionCheckResult,
  ToolPermissionPolicy,
  ToolPermissions,
  PermissionsYamlConfig,
} from "./types";

export {
  loadPermissionsYaml,
  parseToolPattern,
  yamlConfigToPolicies,
  ensurePermissionsYamlExists,
  getPermissionsYamlPath,
} from "./permissionsYamlLoader";

export {
  checkToolPermission,
  matchesToolPattern,
  matchesArguments,
  filterExcludedTools,
} from "./permissionChecker";

export { ToolPermissionsService } from "./ToolPermissionsService";
