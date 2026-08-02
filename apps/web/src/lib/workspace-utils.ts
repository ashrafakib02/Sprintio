/**
 * Shared workspace visual utilities used by multiple components.
 * Extracted from workspace-switcher.tsx and workspace-settings-layout.tsx
 * to eliminate duplication (M-C02).
 */

export function getWorkspaceInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const WORKSPACE_AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

export function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WORKSPACE_AVATAR_COLORS[Math.abs(hash) % WORKSPACE_AVATAR_COLORS.length];
}
