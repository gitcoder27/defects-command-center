import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManagerMyDayLanding } from '@/components/my-day/ManagerMyDayLanding';

describe('ManagerMyDayLanding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tells managers to use Today and redirects them to the manager command view', () => {
    const onGoToDashboard = vi.fn();

    render(<ManagerMyDayLanding onGoToDashboard={onGoToDashboard} />);

    expect(screen.getByText('Use Today')).toBeInTheDocument();
    expect(screen.getByText(/My Day is only for developers/i)).toBeInTheDocument();
    expect(screen.getByText('Redirecting to Today...')).toBeInTheDocument();

    vi.advanceTimersByTime(1800);

    expect(onGoToDashboard).toHaveBeenCalledTimes(1);
  });
});
