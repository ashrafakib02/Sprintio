const STORAGE_KEY = 'sprintio:activeOrganizationId';

export function getStoredOrganizationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredOrganizationId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // silent
  }
}

export function clearStoredOrganizationId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}
