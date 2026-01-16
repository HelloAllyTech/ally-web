interface CommentItem {
  id: number;
  user: {
    id: number;
    name: string;
  };
  createdAt: string;
  comment: string;
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
    messageId: string;
  };
  comments: CommentItem[];
}

export type { Thread, CommentItem };
