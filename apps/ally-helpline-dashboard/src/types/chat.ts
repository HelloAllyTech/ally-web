export interface ChatMessagePayload {
  role: string;
  content: string;
  citations?: Citation[];
}

export interface Citation {
  timestamp: string;
  content: string;
  senderId: number;
  transcriptId: number;
}
