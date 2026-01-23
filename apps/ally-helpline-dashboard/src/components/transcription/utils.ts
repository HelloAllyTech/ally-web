import { v4 as uuidv4 } from "uuid";

import { Thread, TextSegment } from "@types";

const splitTextByComments = (text: string, comments?: Thread[]): TextSegment[] => {
  if (!comments || comments.length === 0) {
    return [{ id: uuidv4(), content: text, isComment: false }];
  }

  // Sort comments by startIndex to process them in order
  const sortedComments = [...comments].sort(
    (a, b) => a.selection.startIndex - b.selection.startIndex,
  );

  const segments: TextSegment[] = [];
  let currentIndex = 0;
  const processedIndices = new Set<number>();

  for (let i = 0; i < sortedComments.length; i++) {
    // Skip if already processed as part of an overlapping group
    if (processedIndices.has(i)) continue;

    const comment = sortedComments[i];

    // Add text before this comment (if any)
    if (comment.selection.startIndex > currentIndex) {
      segments.push({
        id: uuidv4(),
        content: text.slice(currentIndex, comment.selection.startIndex),
        isComment: false,
        selection: {
          startIndex: currentIndex,
          endIndex: comment.selection.startIndex,
        },
      });
    }

    // Get all other comments that overlap with this one (partially or fully)
    const overlappingThreads: Thread[] = [];
    const overlappingIndices: number[] = [];

    sortedComments.forEach((other, j) => {
      if (
        i !== j &&
        !processedIndices.has(j) &&
        comment.selection.startIndex < other.selection.endIndex &&
        comment.selection.endIndex > other.selection.startIndex
      ) {
        overlappingThreads.push(other);
        overlappingIndices.push(j);
      }
    });

    // Mark overlapping comments as processed so they won't be added as separate segments
    overlappingIndices.forEach(idx => processedIndices.add(idx));

    // Calculate merged content if there's overlap
    let mergedContent: string | undefined;
    let mergedEndIndex = comment.selection.endIndex;

    if (overlappingThreads.length > 0) {
      const allOverlapping = [comment, ...overlappingThreads];
      const minStart = Math.min(...allOverlapping.map(c => c.selection.startIndex));
      const maxEnd = Math.max(...allOverlapping.map(c => c.selection.endIndex));
      mergedContent = text.slice(minStart, maxEnd);
      mergedEndIndex = maxEnd;
    }

    // Add the commented text
    segments.push({
      id: uuidv4(),
      content:
        mergedContent || text.slice(comment.selection.startIndex, comment.selection.endIndex),
      isComment: true,
      commentIndex: i,
      threadId: comment.id,
      comments: comment.comments,
      selection: {
        startIndex: comment.selection.startIndex,
        endIndex: comment.selection.endIndex,
      },
      overlappingThreads: overlappingThreads.length > 0 ? overlappingThreads : undefined,
    });

    currentIndex = mergedEndIndex;
  }

  // Add remaining text after the last comment (if any)
  if (currentIndex < text.length) {
    segments.push({
      id: uuidv4(),
      content: text.slice(currentIndex),
      isComment: false,
      selection: {
        startIndex: currentIndex,
        endIndex: currentIndex + text.length,
      },
    });
  }

  return segments;
};

function getFreshUserRange(selection: Selection): Range {
  const range = document.createRange();

  const anchorNode = selection.anchorNode!;
  const anchorOffset = selection.anchorOffset;
  const focusNode = selection.focusNode!;
  const focusOffset = selection.focusOffset;

  // Determine document order
  const isForward =
    anchorNode === focusNode
      ? anchorOffset <= focusOffset
      : anchorNode.compareDocumentPosition(focusNode) & Node.DOCUMENT_POSITION_FOLLOWING;

  if (isForward) {
    range.setStart(anchorNode, anchorOffset);
    range.setEnd(focusNode, focusOffset);
  } else {
    range.setStart(focusNode, focusOffset);
    range.setEnd(anchorNode, anchorOffset);
  }

  return range;
}

export { splitTextByComments, getFreshUserRange };
