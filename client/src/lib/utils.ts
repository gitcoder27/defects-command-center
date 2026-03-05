import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNowStrict, isToday, isBefore, startOfDay } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function isDueToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return isToday(new Date(dateStr));
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return isBefore(new Date(dateStr), startOfDay(new Date()));
}

export function isStale(updatedAt: string, thresholdHours = 48): boolean {
  const dt = new Date(updatedAt);
  return dt.getTime() < Date.now() - thresholdHours * 60 * 60 * 1000;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'Highest': return 'var(--danger)';
    case 'High': return '#F97316';
    case 'Medium': return 'var(--warning)';
    case 'Low': return 'var(--accent)';
    case 'Lowest': return 'var(--text-muted)';
    default: return 'var(--text-secondary)';
  }
}

export function workloadColor(level: string): string {
  switch (level) {
    case 'light': return 'var(--success)';
    case 'medium': return 'var(--warning)';
    case 'heavy': return 'var(--danger)';
    default: return 'var(--text-muted)';
  }
}
