import { describe, it, expect } from "vitest";
import {
  parseToolPattern,
  yamlConfigToPolicies,
} from "./permissionsYamlLoader";
import type { PermissionsYamlConfig } from "./types";

describe("parseToolPattern", () => {
  it("should parse simple tool names", () => {
    const policy = parseToolPattern("run_terminal_command", "allow");
    expect(policy).toEqual({
      tool: "run_terminal_command",
      permission: "allow",
    });
  });

  it("should parse tool patterns with arguments", () => {
    const policy = parseToolPattern("run_terminal_command(npm install)", "ask");
    expect(policy).toEqual({
      tool: "run_terminal_command",
      permission: "ask",
      argumentMatches: {
        command: "npm install",
      },
    });
  });

  it("should parse tool patterns with wildcard arguments", () => {
    const policy = parseToolPattern("run_terminal_command(git*)", "allow");
    expect(policy).toEqual({
      tool: "run_terminal_command",
      permission: "allow",
      argumentMatches: {
        command: "git*",
      },
    });
  });

  it("should parse read_file patterns", () => {
    const policy = parseToolPattern("read_file(/tmp/*)", "allow");
    expect(policy).toEqual({
      tool: "read_file",
      permission: "allow",
      argumentMatches: {
        file_path: "/tmp/*",
      },
    });
  });

  it("should handle empty parentheses", () => {
    const policy = parseToolPattern("run_terminal_command()", "allow");
    expect(policy).toEqual({
      tool: "run_terminal_command",
      permission: "allow",
    });
  });

  it("should throw on invalid patterns", () => {
    expect(() => parseToolPattern("invalid((pattern", "allow")).toThrow();
  });
});

describe("yamlConfigToPolicies", () => {
  it("should convert YAML config to policies", () => {
    const config: PermissionsYamlConfig = {
      allow: ["read_file", "run_terminal_command(git*)"],
      ask: ["run_terminal_command(npm*)"],
      exclude: ["run_terminal_command(sudo*)"],
    };

    const policies = yamlConfigToPolicies(config);

    expect(policies).toHaveLength(4);

    // Exclude should come first (most restrictive)
    expect(policies[0]).toEqual({
      tool: "run_terminal_command",
      permission: "exclude",
      argumentMatches: { command: "sudo*" },
    });

    // Then ask
    expect(policies[1]).toEqual({
      tool: "run_terminal_command",
      permission: "ask",
      argumentMatches: { command: "npm*" },
    });

    // Then allow
    expect(policies[2]).toEqual({
      tool: "read_file",
      permission: "allow",
    });
    expect(policies[3]).toEqual({
      tool: "run_terminal_command",
      permission: "allow",
      argumentMatches: { command: "git*" },
    });
  });

  it("should handle empty config", () => {
    const config: PermissionsYamlConfig = {};
    const policies = yamlConfigToPolicies(config);
    expect(policies).toHaveLength(0);
  });

  it("should handle partial config", () => {
    const config: PermissionsYamlConfig = {
      allow: ["read_file"],
    };
    const policies = yamlConfigToPolicies(config);
    expect(policies).toHaveLength(1);
    expect(policies[0]).toEqual({
      tool: "read_file",
      permission: "allow",
    });
  });

  it("should maintain order within each permission level", () => {
    const config: PermissionsYamlConfig = {
      allow: ["tool1", "tool2", "tool3"],
    };
    const policies = yamlConfigToPolicies(config);
    expect(policies[0].tool).toBe("tool1");
    expect(policies[1].tool).toBe("tool2");
    expect(policies[2].tool).toBe("tool3");
  });
});
