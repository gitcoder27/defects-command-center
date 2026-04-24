import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export function ManagerDeskWorkspace({ children, className = '' }: Props) {
  return (
    <div className={`mx-auto w-full max-w-[1720px] px-2 md:px-3 ${className}`}>
      {children}
    </div>
  );
}
