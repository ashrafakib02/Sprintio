export interface Board {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  boardId: string;
  position: number;
  color: string | null;
}

export interface Card {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  boardId: string;
  position: number;
  priority: string;
  assigneeIds: string[];
  labelIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardView {
  id: string;
  name: string;
  type: 'board' | 'list' | 'calendar' | 'timeline' | 'spreadsheet';
  boardId: string;
  isDefault: boolean;
}
