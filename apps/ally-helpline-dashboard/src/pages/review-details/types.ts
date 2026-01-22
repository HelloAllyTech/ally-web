interface CommentItem {
  id: number;
  createdBy: {
    id: number;
    name: string;
    profileImage: string | null;
  };
  createdAt: string;
  content: string;
  reactions: {
    [key: string]: number;
  };
  replyCount: number;
}
interface Thread {
  id: number;
  selection: {
    text: string;
    startIndex: number;
    endIndex: number;
    messageId: number;
  };
  comments: CommentItem[];
}

export type { Thread, CommentItem };
