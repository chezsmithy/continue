import { homedir } from "os";
import { basename, isAbsolute, join } from "path";
import { resolveRelativePathInDir } from "../../util/ideUtils";
import { getUriPathBasename } from "../../util/uri";

import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";
import { throwIfFileExceedsHalfOfContext } from "./readFileLimit";

export const readFileImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, "filepath");

  const firstUriMatch = await resolveRelativePathInDir(filepath, extras.ide);
  let content: string;
  let resolvedUri: string;

  if (!firstUriMatch) {
    // Handle home directory expansion
    let expandedPath = filepath;
    const isHomePath = filepath.startsWith("~");

    if (filepath.startsWith("~/")) {
      expandedPath = join(homedir(), filepath.slice(2));
    } else if (filepath === "~") {
      expandedPath = homedir();
    }

    // Check if path is absolute or home directory path
    const isAbsolutePath = isAbsolute(filepath) || isHomePath;

    if (isAbsolutePath) {
      // For absolute paths and home directory paths, try passing directly to IDE
      try {
        content = await extras.ide.readFile(expandedPath);
        resolvedUri = expandedPath;
      } catch (ideError) {
        return [
          {
            name: basename(expandedPath),
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
          name: basename(filepath),
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

  await throwIfFileExceedsHalfOfContext(
    filepath,
    content,
    extras.config.selectedModelByRole.chat,
  );

  return [
    {
      name: getUriPathBasename(resolvedUri),
      description: filepath,
      content: content,
      uri: {
        type: "file",
        value: resolvedUri,
      },
    },
  ];
};
