import { priorityColor } from '@/lib/utils';

export function PriorityCell({ priority }: { priority: string }) {
  const color = priorityColor(priority);
  return (
    <span
      className="inline-block w-3 h-3 rounded-full transition-all duration-150 hover:scale-125 cursor-pointer"
      style={{
        background: color,
        boxShadow: `0 0 4px ${color}40`,
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.boxShadow = `0 0 10px ${color}80`;
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.boxShadow = `0 0 4px ${color}40`;
      }}
      title={priority}
    />
  );
}
