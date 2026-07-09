export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  userId: string;
  type: string;
  enabled: boolean;
  channel: 'email' | 'push' | 'in_app';
}
