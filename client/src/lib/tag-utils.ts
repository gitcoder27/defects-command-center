import type { LocalTag } from '@/types';

export const TAG_COLOR_PALETTE = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
] as const;

export function normalizeTagName(rawName: string): string {
  return rawName.trim().replace(/\s+/g, ' ').slice(0, 50);
}

export function findTagByName(tags: LocalTag[], rawName: string): LocalTag | undefined {
  const normalized = normalizeTagName(rawName).toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return tags.find((tag) => tag.name.toLowerCase() === normalized);
}

export function pickRandomTagColor(): string {
  return TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)]!;
}
