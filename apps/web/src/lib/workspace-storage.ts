const STORAGE_KEY = 'sprintio:activeWorkspaceId';

export function getStoredWorkspaceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredWorkspaceId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // silent
  }
}

export function clearStoredWorkspaceId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}
