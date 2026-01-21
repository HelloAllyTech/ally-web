import { CommentItem } from "@src/pages/review-details/types";

interface Thread {
  id?: number;
  selection: {
    startIndex: number;
    endIndex: number;
  };
  comments: CommentItem[];
}

interface TextSegment {
  id: number;
  content: string;
  isComment: boolean;
  commentIndex?: number;
  threadId?: number;
  selection?: {
    startIndex: number;
    endIndex: number;
  };
  comments?: CommentItem[];
  overlappingThreads?: Thread[];
}

export type { Thread, TextSegment };
