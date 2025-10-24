# Tool Permissions System

The tool permissions system provides fine-grained control over which tools the AI can use and how it can use them. This implementation is compatible with the CLI project's permissions system, sharing the same `permissions.yaml` file.

## Overview

The permissions system operates on three levels:

- **allow**: The tool will be executed automatically without asking for permission
- **ask**: The tool will prompt the user for permission before execution
- **exclude**: The tool will be filtered out entirely and won't be available to the AI

## Configuration File

Permissions are configured in `~/.continue/permissions.yaml`:

```yaml
# Tools that are automatically allowed without prompting
allow:
  - read_file
  - grep_search

# Tools that require user confirmation before execution
ask:
  - run_terminal_command
  - create_new_file

# Tools that are completely excluded (model won't know they exist)
exclude:
  - run_terminal_command(sudo*)
```

## Pattern Matching

### Basic Patterns

Match exact tool names:

```yaml
allow:
  - read_file
  - grep_search
```

### Wildcard Patterns

Use wildcards to match multiple tools:

```yaml
allow:
  - read_* # Matches read_file, read_file_range, etc.
  - mcp__* # Matches all MCP tools
```

### Argument Patterns

Match specific tool arguments (especially useful for terminal commands):

```yaml
allow:
  - run_terminal_command(git*) # Allow git commands
  - run_terminal_command(npm test) # Allow npm test specifically

ask:
  - run_terminal_command(npm install*) # Ask before npm install

exclude:
  - run_terminal_command(sudo*) # Block all sudo commands
  - run_terminal_command(rm -rf *) # Block dangerous rm commands
```

## Dynamic Policy Evaluation

The permissions system integrates with the `@continuedev/terminal-security` package to provide dynamic security evaluation for terminal commands. This means:

1. **User preferences take precedence**: If you set a tool to "allow" in permissions.yaml, but terminal security detects a dangerous command, it will require permission anyway.
2. **Critical commands are always blocked**: Extremely dangerous commands (like `sudo rm -rf /`) are always blocked, regardless of user settings.
3. **Smart pattern detection**: The security system analyzes command syntax, including pipes, command substitution, and obfuscation attempts.

## Usage

### Loading Permissions

```typescript
import { loadPermissionsYaml, yamlConfigToPolicies } from "./tools/permissions";

// Load from ~/.continue/permissions.yaml
const yamlConfig = loadPermissionsYaml();

// Convert to policies
const permissions = yamlConfig
  ? { policies: yamlConfigToPolicies(yamlConfig) }
  : { policies: [] };
```

### Checking Permissions

```typescript
import { checkToolPermission } from "./tools/permissions";
import { runTerminalCommandTool } from "./tools/definitions/runTerminalCommand";

const result = checkToolPermission(
  "run_terminal_command",
  { command: "npm install" },
  permissions,
  runTerminalCommandTool.evaluateToolCallPolicy,
);

if (result.permission === "exclude") {
  // Tool is blocked
} else if (result.permission === "ask") {
  // Ask user for permission
} else {
  // Execute automatically
}
```

## Compatibility with CLI Project

This implementation is fully compatible with the CLI project's permissions system:

- **Same file location**: `~/.continue/permissions.yaml`
- **Same file format**: YAML with `allow`, `ask`, and `exclude` arrays
- **Same pattern syntax**: Supports wildcards and argument matching
- **Same evaluation logic**: First-match-wins policy resolution

This means you can use the same `permissions.yaml` file for both the core library and the CLI tool.

## Examples

### Safe Development Environment

```yaml
# Allow read-only operations
allow:
  - read_file
  - read_file_range
  - grep_search
  - file_glob_search

# Require permission for writes
ask:
  - create_new_file
  - run_terminal_command

# Block dangerous commands
exclude:
  - run_terminal_command(sudo*)
  - run_terminal_command(rm -rf*)
```

### Restricted Environment

```yaml
# Only allow safe git and npm commands
allow:
  - run_terminal_command(git status)
  - run_terminal_command(git log*)
  - run_terminal_command(npm test)

# Block everything else
exclude:
  - run_terminal_command(*)
```

### Permissive Environment

```yaml
# Allow most operations
allow:
  - read_*
  - grep_search
  - file_glob_search
  - run_terminal_command(git*)
  - run_terminal_command(npm*)

# Still block dangerous operations
exclude:
  - run_terminal_command(sudo*)
  - run_terminal_command(rm -rf /*)
```

## Architecture

The permissions system consists of three main components:

1. **types.ts**: Type definitions for permissions
2. **permissionsYamlLoader.ts**: Loads and parses `permissions.yaml`
3. **permissionChecker.ts**: Evaluates tool calls against permission policies

The system integrates with:

- **terminal-security package**: For dynamic command security evaluation
- **Tool definitions**: Via `evaluateToolCallPolicy` callbacks
- **Core execution**: Permission checks before tool execution

## See Also

- [CLI Permissions Documentation](../../../extensions/cli/src/permissions/README.md)
- [Terminal Security Package](../../../packages/terminal-security/)
- [Tool Definitions](../definitions/)
