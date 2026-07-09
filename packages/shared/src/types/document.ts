export interface Document {
  id: string;
  title: string;
  content: Record<string, unknown>;
  workspaceId: string;
  spaceId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentBlock {
  id: string;
  documentId: string;
  type: string;
  content: Record<string, unknown>;
  position: number;
}
