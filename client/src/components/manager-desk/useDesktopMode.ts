import { useEffect, useState } from 'react';

const DESKTOP_BREAKPOINT = 1280;

function getDesktopMode() {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= DESKTOP_BREAKPOINT;
}

export function useDesktopMode() {
  const [isDesktop, setIsDesktop] = useState(getDesktopMode);

  useEffect(() => {
    const handleResize = () => setIsDesktop(getDesktopMode());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
}
