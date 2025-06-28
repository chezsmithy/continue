import { headerIsMarkdown } from "./headerIsMarkdown";

/**
 * Determines if a line with bare backticks (```) should be treated as opening
 * a nested code block rather than closing the current block.
 *
 * Uses look-ahead to check if there are more bare backtick lines ahead,
 * which would indicate this is opening a nested block.
 *
 * @param trimmedLines - Array of trimmed lines from the source
 * @param currentIndex - Index of the current line with bare backticks
 * @param nestCount - Current nesting level
 * @returns true if this should open a nested block, false if it should close
 */
export function isOpeningNestedBlock(
  trimmedLines: string[],
  currentIndex: number,
  nestCount: number,
): boolean {
  // We only allow one level of nesting. Therefore if we're already inside
  // a nested block (nestCount > 1) and encounter a line of bare backticks,
  // it must be closing the current block.
  if (nestCount > 1) {
    return false;
  }

  // Look ahead and count bare backtick lines until we hit a terminator
  // for the current markdown block.
  let bareBackticksAhead = 0;
  for (let j = currentIndex + 1; j < trimmedLines.length; j++) {
    const line = trimmedLines[j];

    if (line.match(/^`+$/)) {
      bareBackticksAhead++;
      continue;
    }

    if (
      line.startsWith("~~~") ||
      (line.startsWith("```") && headerIsMarkdown(line.replaceAll("`", "")))
    ) {
      break;
    }
  }

  // At the top level, a bare backtick line opens a nested block when an
  // odd number of additional bare backtick lines appear before the end of
  // the markdown block; otherwise it closes the block.
  return bareBackticksAhead % 2 === 1;
}
