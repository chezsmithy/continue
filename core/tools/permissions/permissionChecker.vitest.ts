import { describe, expect, it } from "vitest";
import type { Tool } from "../..";
import {
  checkToolPermission,
  filterExcludedTools,
  matchesArguments,
  matchesToolPattern,
} from "./permissionChecker";
import type { ToolPermissions } from "./types";

describe("matchesToolPattern", () => {
  it("should match exact tool names", () => {
    expect(
      matchesToolPattern("run_terminal_command", "run_terminal_command"),
    ).toBe(true);
    expect(matchesToolPattern("read_file", "read_file")).toBe(true);
    expect(matchesToolPattern("run_terminal_command", "read_file")).toBe(false);
  });

  it("should match wildcard patterns", () => {
    expect(matchesToolPattern("anything", "*")).toBe(true);
    expect(matchesToolPattern("mcp__server1", "mcp__*")).toBe(true);
    expect(matchesToolPattern("read_file", "read_*")).toBe(true);
    expect(matchesToolPattern("write_file", "read_*")).toBe(false);
  });

  it("should match terminal command patterns", () => {
    const args = { command: "npm install" };
    expect(
      matchesToolPattern(
        "run_terminal_command",
        "run_terminal_command(npm install)",
        args,
      ),
    ).toBe(true);
    expect(
      matchesToolPattern(
        "run_terminal_command",
        "run_terminal_command(npm install)",
        args,
      ),
    ).toBe(true);
  });

  it("should match terminal command patterns with wildcards", () => {
    expect(
      matchesToolPattern("run_terminal_command", "run_terminal_command(npm*)", {
        command: "npm install",
      }),
    ).toBe(true);
    expect(
      matchesToolPattern("run_terminal_command", "run_terminal_command(git*)", {
        command: "git status",
      }),
    ).toBe(true);
    expect(
      matchesToolPattern("run_terminal_command", "run_terminal_command(git*)", {
        command: "npm install",
      }),
    ).toBe(false);
  });

  it("should not match terminal patterns for non-terminal tools", () => {
    expect(
      matchesToolPattern("read_file", "run_terminal_command(ls*)", {
        command: "ls",
      }),
    ).toBe(false);
  });
});

describe("matchesArguments", () => {
  it("should match when no patterns specified", () => {
    expect(matchesArguments({ any: "value" }, undefined)).toBe(true);
  });

  it("should match exact argument values", () => {
    expect(matchesArguments({ path: "/tmp" }, { path: "/tmp" })).toBe(true);
    expect(matchesArguments({ path: "/tmp" }, { path: "/home" })).toBe(false);
  });

  it("should match wildcard argument patterns", () => {
    expect(
      matchesArguments({ path: "/tmp/file.txt" }, { path: "/tmp/*" }),
    ).toBe(true);
    expect(matchesArguments({ path: "/tmp/file.txt" }, { path: "*.txt" })).toBe(
      true,
    );
    expect(matchesArguments({ path: "/tmp/file.txt" }, { path: "*.js" })).toBe(
      false,
    );
  });

  it("should match all patterns with wildcard *", () => {
    expect(matchesArguments({ path: "anything" }, { path: "*" })).toBe(true);
  });
});

describe("checkToolPermission", () => {
  it("should apply first matching policy", () => {
    const permissions: ToolPermissions = {
      policies: [
        { tool: "run_terminal_command", permission: "ask" },
        { tool: "*", permission: "allow" },
      ],
    };

    const result = checkToolPermission("run_terminal_command", {}, permissions);
    expect(result.permission).toBe("ask");
  });

  it("should fall through to wildcard policy", () => {
    const permissions: ToolPermissions = {
      policies: [
        { tool: "run_terminal_command", permission: "exclude" },
        { tool: "*", permission: "allow" },
      ],
    };

    const result = checkToolPermission("read_file", {}, permissions);
    expect(result.permission).toBe("allow");
  });

  it("should match argument patterns", () => {
    const permissions: ToolPermissions = {
      policies: [
        {
          tool: "run_terminal_command",
          permission: "allow",
          argumentMatches: { command: "git*" },
        },
        { tool: "run_terminal_command", permission: "ask" },
      ],
    };

    const result1 = checkToolPermission(
      "run_terminal_command",
      { command: "git status" },
      permissions,
    );
    expect(result1.permission).toBe("allow");

    const result2 = checkToolPermission(
      "run_terminal_command",
      { command: "npm install" },
      permissions,
    );
    expect(result2.permission).toBe("ask");
  });

  it("should respect dynamic policy evaluation", () => {
    const permissions: ToolPermissions = {
      policies: [{ tool: "run_terminal_command", permission: "allow" }],
    };

    // Simulate terminal security evaluation that disables the command
    const mockTool = {
      evaluateToolCallPolicy: () => "disabled" as const,
    } as any;

    const result = checkToolPermission(
      "run_terminal_command",
      { command: "sudo rm -rf /" },
      permissions,
      undefined,
      mockTool,
    );
    expect(result.permission).toBe("exclude");
  });

  it("should preserve user preference when dynamic evaluation allows", () => {
    const permissions: ToolPermissions = {
      policies: [{ tool: "run_terminal_command", permission: "ask" }],
    };

    // Simulate terminal security evaluation that allows the command
    const mockTool = {
      evaluateToolCallPolicy: () => "allowedWithoutPermission" as const,
    } as any;

    const result = checkToolPermission(
      "run_terminal_command",
      { command: "ls" },
      permissions,
      undefined,
      mockTool,
    );
    // User preference (ask) should win over dynamic evaluation (allow)
    expect(result.permission).toBe("ask");
  });

  it("should default to allow for unknown tools", () => {
    const permissions: ToolPermissions = {
      policies: [],
    };

    const result = checkToolPermission("unknown_tool", {}, permissions);
    expect(result.permission).toBe("allow");
  });
});

describe("filterExcludedTools", () => {
  it("should filter out excluded tools", () => {
    const permissions: ToolPermissions = {
      policies: [
        { tool: "grep_search", permission: "exclude" },
        { tool: "*", permission: "allow" },
      ],
    };

    const tools: Tool[] = [
      { function: { name: "read_file" } } as Tool,
      { function: { name: "grep_search" } } as Tool,
      { function: { name: "create_new_file" } } as Tool,
    ];

    const filtered = filterExcludedTools(tools, permissions);
    expect(filtered.length).toBe(2);
    expect(filtered.map((t) => t.function.name)).toEqual([
      "read_file",
      "create_new_file",
    ]);
  });

  it("should keep all tools when none are excluded", () => {
    const permissions: ToolPermissions = {
      policies: [{ tool: "*", permission: "allow" }],
    };

    const tools: Tool[] = [
      { function: { name: "read_file" } } as Tool,
      { function: { name: "create_new_file" } } as Tool,
    ];

    const filtered = filterExcludedTools(tools, permissions);
    expect(filtered.length).toBe(2);
  });

  it("should support dynamic policy evaluation during filtering", () => {
    const permissions: ToolPermissions = {
      policies: [{ tool: "*", permission: "allow" }],
    };

    const tools: Tool[] = [
      {
        type: "function" as const,
        function: { name: "read_file" },
        displayTitle: "Read File",
        readonly: true,
        group: "Built-In",
        evaluateToolCallPolicy: () => "allowedWithoutPermission" as const,
      } as Tool,
      {
        type: "function" as const,
        function: { name: "run_terminal_command" },
        displayTitle: "Run Terminal Command",
        readonly: false,
        group: "Built-In",
        evaluateToolCallPolicy: () => "disabled" as const,
      } as Tool,
    ];

    const filtered = filterExcludedTools(tools, permissions);
    expect(filtered.length).toBe(1);
    expect(filtered[0].function.name).toBe("read_file");
  });
});
