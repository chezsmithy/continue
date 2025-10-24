import fs from "fs";
import type { Tool } from "../..";
import { Logger } from "../../util/Logger";
import { checkToolPermission } from "./permissionChecker";
import {
  ensurePermissionsYamlExists,
  getPermissionsYamlPath,
  loadPermissionsYaml,
  yamlConfigToPolicies,
} from "./permissionsYamlLoader";
import type { PermissionCheckResult, ToolPermissions } from "./types";

/**
 * Singleton service for managing tool permissions
 * Loads permissions from ~/.continue/permissions.yaml and provides checking functionality
 */
export class ToolPermissionsService {
  private static instance: ToolPermissionsService;
  private permissions: ToolPermissions | null = null;
  private watchHandle: fs.FSWatcher | null = null;
  private enabled: boolean = false;

  private constructor() {}

  static getInstance(): ToolPermissionsService {
    if (!ToolPermissionsService.instance) {
      ToolPermissionsService.instance = new ToolPermissionsService();
    }
    return ToolPermissionsService.instance;
  }

  /**
   * Initialize the permissions service
   * - Loads permissions from permissions.yaml
   * - Sets up file watching for hot reload
   * - Creates default permissions.yaml if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Ensure the permissions.yaml file exists
      await ensurePermissionsYamlExists();

      // Load permissions
      this.reload();

      // Watch for changes to permissions.yaml
      this.setupFileWatcher();

      this.enabled = true;
      Logger.info("Tool permissions service initialized", {
        path: getPermissionsYamlPath(),
        policiesCount: this.permissions?.policies.length || 0,
      });
    } catch (error) {
      Logger.error("Failed to initialize tool permissions service", { error });
      this.enabled = false;
    }
  }

  /**
   * Reload permissions from permissions.yaml
   */
  private reload(): void {
    try {
      const yamlConfig = loadPermissionsYaml();
      if (yamlConfig) {
        this.permissions = {
          policies: yamlConfigToPolicies(yamlConfig),
        };
        Logger.debug("Reloaded permissions", {
          policiesCount: this.permissions.policies.length,
        });
      } else {
        // If no config, disable permissions checking
        this.permissions = null;
        Logger.debug(
          "No permissions config found, permissions checking disabled",
        );
      }
    } catch (error) {
      Logger.error("Failed to reload permissions", { error });
      this.permissions = null;
    }
  }

  /**
   * Set up file watcher for hot reload of permissions.yaml
   */
  private setupFileWatcher(): void {
    try {
      const permissionsPath = getPermissionsYamlPath();

      // Close existing watcher if any
      if (this.watchHandle) {
        this.watchHandle.close();
      }

      this.watchHandle = fs.watch(permissionsPath, (eventType) => {
        if (eventType === "change") {
          Logger.debug("Permissions file changed, reloading");
          this.reload();
        }
      });

      Logger.debug("File watcher set up for permissions.yaml");
    } catch (error) {
      Logger.warn("Failed to set up file watcher for permissions.yaml", {
        error,
      });
    }
  }

  /**
   * Check if a tool call is allowed based on permissions
   *
   * @param tool The tool definition
   * @param toolArguments The arguments passed to the tool
   * @param processedArgs The preprocessed arguments (e.g., resolved paths)
   * @returns Permission check result
   */
  checkPermission(
    tool: Tool,
    toolArguments: Record<string, any>,
    processedArgs?: Record<string, unknown>,
  ): PermissionCheckResult {
    // If service not enabled or no permissions loaded, default to "allow" (most lenient)
    // This ensures permissions.yaml doesn't interfere when it doesn't exist or is disabled
    if (!this.enabled || !this.permissions) {
      return {
        permission: "allow",
      };
    }

    return checkToolPermission(
      tool.function.name,
      toolArguments,
      this.permissions,
      processedArgs,
      tool,
    );
  }

  /**
   * Check if permissions checking is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.permissions !== null;
  }

  /**
   * Get current permissions (for debugging/testing)
   */
  getPermissions(): ToolPermissions | null {
    return this.permissions;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.watchHandle) {
      this.watchHandle.close();
      this.watchHandle = null;
    }
  }
}
