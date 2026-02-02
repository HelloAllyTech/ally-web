type CommentRange = { id: string; start: number; end: number };
type Segment = { text: string; commentIds: string[]; start: number; end: number };

function splitByCommentRanges(text: string, ranges: CommentRange[]): Segment[] {
  const messageLength = text.length;

  // 1) Normalize & clamp
  const cleaned = ranges
    .map(range => ({
      id: range.id,
      start: Math.max(0, Math.min(messageLength, range.start)),
      end: Math.max(0, Math.min(messageLength, range.end)),
    }))
    .filter(range => range.end > range.start);

  if (cleaned.length === 0) {
    return [{ text, commentIds: [], start: 0, end: messageLength }];
  }

  const boundaries = new Set<number>([0, messageLength]);
  for (const range of cleaned) {
    boundaries.add(range.start);
    boundaries.add(range.end);
  }
  const points = Array.from(boundaries).sort((a, b) => a - b);

  const segments: Segment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (start === end) continue;

    // Find all comments covering this interval (any overlap -> here it's full cover because points align to boundaries)
    const activeIds: string[] = [];
    for (const r of cleaned) {
      if (r.start <= start && r.end >= end) activeIds.push(r.id);
    }

    const chunk = text.slice(start, end);
    if (!chunk) continue;

    // Merge with previous if same commentIds (to avoid too many segments)
    const prev = segments[segments.length - 1];
    const same =
      prev &&
      prev.commentIds.length === activeIds.length &&
      prev.commentIds.every((id, idx) => id === activeIds[idx]);

    if (same) {
      prev.text += chunk;
      prev.end = end;
    } else {
      segments.push({ text: chunk, commentIds: activeIds, start, end });
    }
  }

  return segments;
}

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

export { splitByCommentRanges, getFreshUserRange };
