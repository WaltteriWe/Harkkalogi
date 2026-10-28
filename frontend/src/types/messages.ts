export interface ApiUserSummary {
  id: number;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN" | string;
}

export interface ApiAttachment {
  id: number;
  name: string;
  size?: string | null;
  fileUrl: string;
  mimeType?: string | null;
}

export interface ApiMessageReply {
  id: number;
  body: string;
  read: boolean;
  createdAt: string;
  sender: ApiUserSummary;
}

export interface ApiMessageThread {
  id: number;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  senderId: number;
  recipientId: number | null;
  sender: ApiUserSummary;
  recipient: ApiUserSummary | null;
  attachments: ApiAttachment[];
  replies: ApiMessageReply[];
  unreadCount?: number;
}

export interface ApiRecipient {
  id: number;
  name: string;
  email: string;
  role: string;
  label?: string;
  company?: string;
  studyMode?: string;
}

export interface ApiRecipientsResponse {
  hasSupervisor: boolean;
  supervisor: ApiUserSummary | null;
  recipients: ApiRecipient[];
}

