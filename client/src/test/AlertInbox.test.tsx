import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertInbox } from '@/components/alerts/AlertInbox';
import type { Alert } from '@/types';

const useAlertsMock = vi.fn();
const useDismissAlertsMock = vi.fn();
const addToastMock = vi.fn();

vi.mock('@/hooks/useAlerts', () => ({
  useAlerts: (...args: unknown[]) => useAlertsMock(...args),
  useDismissAlerts: () => useDismissAlertsMock(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

const alertFixture: Alert = {
  id: 'overdue:PROJ-101',
  type: 'overdue',
  severity: 'high',
  issueKey: 'PROJ-101',
  message: 'Issue PROJ-101 is overdue.',
  detectedAt: '2026-03-20T00:00:00.000Z',
};

describe('AlertInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAlertsMock.mockReturnValue({ data: [alertFixture] });
    useDismissAlertsMock.mockReturnValue({ mutate: vi.fn() });
  });

  it('opens the panel, shows the count, and opens an alert from the inbox', async () => {
    const onAlertClick = vi.fn();

    render(<AlertInbox onAlertClick={onAlertClick} />);

    expect(screen.getByRole('button', { name: /1 alerts? need review/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /1 alerts? need review/i }));

    expect(screen.getByText('Alerts inbox')).toBeInTheDocument();
    expect(screen.getByText('Issue PROJ-101 is overdue.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Issue PROJ-101 is overdue.'));

    expect(onAlertClick).toHaveBeenCalledWith(alertFixture);
    await waitFor(() => {
      expect(screen.queryByText('Alerts inbox')).not.toBeInTheDocument();
    });
  });

  it('dismisses one alert and can clear all current alerts', () => {
    const mutate = vi.fn();
    useDismissAlertsMock.mockReturnValue({ mutate });
    useAlertsMock.mockReturnValue({
      data: [
        alertFixture,
        { ...alertFixture, id: 'stale:PROJ-102', issueKey: 'PROJ-102', type: 'stale', message: 'Issue PROJ-102 is stale.' },
      ],
    });

    render(<AlertInbox onAlertClick={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /2 alerts need review/i }));
    fireEvent.click(screen.getByRole('button', { name: /dismiss alert overdue:PROJ-101/i }));

    expect(mutate).toHaveBeenCalledWith(
      { alertIds: ['overdue:PROJ-101'] },
      expect.objectContaining({ onError: expect.any(Function) }),
    );

    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

    expect(mutate).toHaveBeenLastCalledWith(
      { alertIds: ['overdue:PROJ-101', 'stale:PROJ-102'] },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('shows the empty state when there are no active alerts', () => {
    useAlertsMock.mockReturnValue({ data: [] });

    render(<AlertInbox onAlertClick={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /alerts inbox/i }));

    expect(screen.getByText('No active alerts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeDisabled();
  });
});
