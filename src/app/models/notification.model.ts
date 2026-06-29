export type NotificationKind = 'info' | 'warning' | 'panic' | 'success';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  timestamp: string;
  target: 'all' | 'admin' | 'driver' | 'registered';
  read: boolean;
  sourceUserId?: string;
  sourcePhone?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'admin' | 'support' | 'driver' | 'user';
  senderName: string;
  message: string;
  timestamp: string;
}
