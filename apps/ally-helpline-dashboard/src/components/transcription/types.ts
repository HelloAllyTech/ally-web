interface Thread {
  startIndex: number;
  endIndex: number;
  selectedText: string;
  comments: {
    text: string;
  }[];
}

interface TextSegment {
  id: number;
  content: string;
  isComment: boolean;
  commentIndex?: number;
  comments?: {
    text: string;
  }[];
  overlappingThreads?: Thread[];
}

export type { Thread, TextSegment };
