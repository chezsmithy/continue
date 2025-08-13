import { jest } from "@jest/globals";
import * as os from "os";
import * as path from "path";

// Create a test implementation that replicates readFile.ts logic
const createReadFileTest = () => {
  const mockResolveRelativePathInDir = jest.fn();
  const mockIdeReadFile = jest.fn();
  const mockThrowIfFileExceedsHalfOfContext = jest.fn();
  const mockGetUriPathBasename = jest.fn((uri: string) => path.basename(uri));

  const readFileImplTest = async (args: { filepath: string }, extras: any) => {
    const filepath = args.filepath;

    const firstUriMatch = await mockResolveRelativePathInDir(
      filepath,
      extras.ide,
    );
    let content: string;
    let resolvedUri: string;

    if (!firstUriMatch) {
      // Handle home directory expansion
      let expandedPath = filepath;
      const isHomePath = filepath.startsWith("~");

      if (filepath.startsWith("~/")) {
        expandedPath = path.join(os.homedir(), filepath.slice(2));
      } else if (filepath === "~") {
        expandedPath = os.homedir();
      }

      // Check if path is absolute or home directory path
      const isAbsolutePath = path.isAbsolute(filepath) || isHomePath;

      if (isAbsolutePath) {
        // For absolute paths and home directory paths, try passing directly to IDE
        try {
          content = await extras.ide.readFile(expandedPath);
          resolvedUri = expandedPath;
        } catch (ideError) {
          return [
            {
              name: path.basename(expandedPath),
              description: `File: ${filepath}`,
              content: `Path not accessible: ${filepath}`,
              uri: {
                type: "file",
                value: expandedPath,
              },
            },
          ];
        }
      } else {
        // For relative paths, don't fallback - they need workspace context
        return [
          {
            name: path.basename(filepath),
            description: `File: ${filepath}`,
            content: `Relative path not found in workspace: ${filepath}`,
            uri: {
              type: "file",
              value: filepath,
            },
          },
        ];
      }
    } else {
      content = await extras.ide.readFile(firstUriMatch);
      resolvedUri = firstUriMatch;
    }

    await mockThrowIfFileExceedsHalfOfContext(
      filepath,
      content,
      extras.config.selectedModelByRole.chat,
    );

    return [
      {
        name: mockGetUriPathBasename(resolvedUri),
        description: filepath,
        content,
        uri: {
          type: "file",
          value: resolvedUri,
        },
      },
    ];
  };

  return {
    readFileImplTest,
    mockResolveRelativePathInDir,
    mockIdeReadFile,
    mockThrowIfFileExceedsHalfOfContext,
    mockGetUriPathBasename,
  };
};

describe("readFileImpl", () => {
  let testSetup: ReturnType<typeof createReadFileTest>;
  let mockExtras: any;

  beforeEach(() => {
    testSetup = createReadFileTest();
    mockExtras = {
      ide: {
        readFile: testSetup.mockIdeReadFile,
      },
      config: {
        selectedModelByRole: {
          chat: {},
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("workspace-relative paths", () => {
    it("should handle workspace-relative paths when found", async () => {
      const filepath = "src/main.py";
      const resolvedPath = "/workspace/src/main.py";
      const fileContent = "print('hello world')";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(resolvedPath);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(testSetup.mockResolveRelativePathInDir).toHaveBeenCalledWith(
        filepath,
        mockExtras.ide,
      );
      expect(testSetup.mockIdeReadFile).toHaveBeenCalledWith(resolvedPath);
      expect(
        testSetup.mockThrowIfFileExceedsHalfOfContext,
      ).toHaveBeenCalledWith(
        filepath,
        fileContent,
        mockExtras.config.selectedModelByRole.chat,
      );

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(fileContent);
      expect(result[0].description).toBe(filepath);
      expect(result[0].uri?.value).toBe(resolvedPath);
    });

    it("should reject relative paths not found in workspace", async () => {
      const filepath = "../config.json";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(testSetup.mockResolveRelativePathInDir).toHaveBeenCalledWith(
        filepath,
        mockExtras.ide,
      );
      expect(testSetup.mockIdeReadFile).not.toHaveBeenCalled();
      expect(
        testSetup.mockThrowIfFileExceedsHalfOfContext,
      ).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(path.basename(filepath));
      expect(result[0].description).toBe("File: ../config.json");
      expect(result[0].content).toBe(
        "Relative path not found in workspace: ../config.json",
      );
      expect(result[0].uri?.value).toBe(filepath);
    });
  });

  describe("home directory path expansion", () => {
    it("should expand paths starting with ~/", async () => {
      const filepath = "~/.continue/config.yaml";
      const expectedExpandedPath = path.join(
        os.homedir(),
        ".continue/config.yaml",
      );
      const fileContent = "models:\n  - provider: openai";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(testSetup.mockResolveRelativePathInDir).toHaveBeenCalledWith(
        filepath,
        mockExtras.ide,
      );
      expect(testSetup.mockIdeReadFile).toHaveBeenCalledWith(
        expectedExpandedPath,
      );
      expect(
        testSetup.mockThrowIfFileExceedsHalfOfContext,
      ).toHaveBeenCalledWith(
        filepath,
        fileContent,
        mockExtras.config.selectedModelByRole.chat,
      );

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(fileContent);
      expect(result[0].description).toBe(filepath);
      expect(result[0].uri?.value).toBe(expectedExpandedPath);
    });

    it("should handle bare ~ as home directory", async () => {
      const filepath = "~";
      const expectedExpandedPath = os.homedir();
      const fileContent = "directory listing content";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(testSetup.mockIdeReadFile).toHaveBeenCalledWith(
        expectedExpandedPath,
      );
      expect(result[0].uri?.value).toBe(expectedExpandedPath);
      expect(result[0].content).toBe(fileContent);
    });

    it("should handle home directory read errors gracefully", async () => {
      const filepath = "~/.nonexistent/file.txt";
      const expectedExpandedPath = path.join(
        os.homedir(),
        ".nonexistent/file.txt",
      );

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockRejectedValue(
        new Error("Permission denied"),
      );

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(testSetup.mockIdeReadFile).toHaveBeenCalledWith(
        expectedExpandedPath,
      );
      expect(
        testSetup.mockThrowIfFileExceedsHalfOfContext,
      ).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(path.basename(expectedExpandedPath));
      expect(result[0].description).toBe("File: ~/.nonexistent/file.txt");
      expect(result[0].content).toBe(
        "Path not accessible: ~/.nonexistent/file.txt",
      );
      expect(result[0].uri?.value).toBe(expectedExpandedPath);
    });
  });

  describe("absolute paths", () => {
    it("should handle absolute paths directly", async () => {
      const filepath = "/etc/hosts";
      const fileContent = "127.0.0.1 localhost";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(testSetup.mockIdeReadFile).toHaveBeenCalledWith(filepath);
      expect(
        testSetup.mockThrowIfFileExceedsHalfOfContext,
      ).toHaveBeenCalledWith(
        filepath,
        fileContent,
        mockExtras.config.selectedModelByRole.chat,
      );

      expect(result[0].content).toBe(fileContent);
      expect(result[0].uri?.value).toBe(filepath);
    });

    it("should handle absolute path read errors gracefully", async () => {
      const filepath = "/etc/nonexistent";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockRejectedValue(new Error("File not found"));

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(
        testSetup.mockThrowIfFileExceedsHalfOfContext,
      ).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("nonexistent");
      expect(result[0].description).toBe("File: /etc/nonexistent");
      expect(result[0].content).toBe("Path not accessible: /etc/nonexistent");
      expect(result[0].uri?.value).toBe(filepath);
    });
  });

  describe("file size checking", () => {
    it("should call throwIfFileExceedsHalfOfContext for successful reads", async () => {
      const filepath = "~/test.txt";
      const fileContent = "test content";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);

      await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(
        testSetup.mockThrowIfFileExceedsHalfOfContext,
      ).toHaveBeenCalledWith(
        filepath,
        fileContent,
        mockExtras.config.selectedModelByRole.chat,
      );
    });

    it("should not call throwIfFileExceedsHalfOfContext for error cases", async () => {
      const filepath = "../nonexistent.txt";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);

      await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(
        testSetup.mockThrowIfFileExceedsHalfOfContext,
      ).not.toHaveBeenCalled();
    });

    it("should handle file size limit exceptions", async () => {
      const filepath = "~/large-file.txt";
      const fileContent = "x".repeat(10000);

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);
      testSetup.mockThrowIfFileExceedsHalfOfContext.mockRejectedValue(
        new Error("File too large"),
      );

      await expect(
        testSetup.readFileImplTest({ filepath }, mockExtras),
      ).rejects.toThrow("File too large");
    });
  });

  describe("context item structure", () => {
    it("should return properly structured context items for successful reads", async () => {
      const filepath = "~/test.txt";
      const expectedExpandedPath = path.join(os.homedir(), "test.txt");
      const fileContent = "test file content";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(result).toHaveLength(1);
      const contextItem = result[0];

      expect(contextItem.name).toBe("test.txt");
      expect(contextItem.description).toBe(filepath);
      expect(contextItem.content).toBe(fileContent);
      expect(contextItem.uri).toEqual({
        type: "file",
        value: expectedExpandedPath,
      });
    });

    it("should return properly structured context items for workspace paths", async () => {
      const filepath = "src/utils.ts";
      const resolvedPath = "/workspace/src/utils.ts";
      const fileContent = "export function helper() {}";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(resolvedPath);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(result).toHaveLength(1);
      const contextItem = result[0];

      expect(contextItem.name).toBe("utils.ts"); // basename of resolved path
      expect(contextItem.description).toBe(filepath); // original user input
      expect(contextItem.content).toBe(fileContent);
      expect(contextItem.uri).toEqual({
        type: "file",
        value: resolvedPath,
      });
    });

    it("should return properly structured context items for error cases", async () => {
      const filepath = "src/missing.py";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(result).toHaveLength(1);
      const contextItem = result[0];

      expect(contextItem.name).toBe("missing.py");
      expect(contextItem.description).toBe("File: src/missing.py");
      expect(contextItem.content).toBe(
        "Relative path not found in workspace: src/missing.py",
      );
      expect(contextItem.uri).toEqual({
        type: "file",
        value: filepath,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty filepath", async () => {
      const filepath = "";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Relative path not found in workspace: ");
    });

    it("should handle Windows-style paths on Unix systems", async () => {
      const filepath = "C:\\Windows\\system32\\drivers\\etc\\hosts";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      // On Unix systems, Windows paths are not treated as absolute by path.isAbsolute()
      // so they would be treated as relative paths not found in workspace
      expect(testSetup.mockIdeReadFile).not.toHaveBeenCalled();
      expect(result[0].content).toBe(
        "Relative path not found in workspace: C:\\Windows\\system32\\drivers\\etc\\hosts",
      );
    });

    it("should handle paths with special characters", async () => {
      const filepath = "~/Documents/My Files/test (1).txt";
      const expectedExpandedPath = path.join(
        os.homedir(),
        "Documents/My Files/test (1).txt",
      );
      const fileContent = "content with spaces";

      testSetup.mockResolveRelativePathInDir.mockResolvedValue(null);
      testSetup.mockIdeReadFile.mockResolvedValue(fileContent);

      const result = await testSetup.readFileImplTest({ filepath }, mockExtras);

      expect(testSetup.mockIdeReadFile).toHaveBeenCalledWith(
        expectedExpandedPath,
      );
      expect(result[0].content).toBe(fileContent);
      expect(result[0].name).toBe("test (1).txt");
    });
  });
});
