import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TestWrapper } from '@/test/wrapper';
import type { TrackerAttentionItem, TrackerDeveloperSignals } from '@/types';

// ── Mock fns ────────────────────────────────────────────

const mockStatusUpdateMutate = vi.fn();
const mockSetCurrentMutate = vi.fn();
const mockUpdateAvailabilityMutate = vi.fn();
const mockAddToast = vi.fn();

let statusUpdatePending = false;
let setCurrentPending = false;

// ── Mocks ───────────────────────────────────────────────

vi.mock('@/hooks/useTeamTrackerMutations', () => ({
  useStatusUpdate: () => ({ mutate: mockStatusUpdateMutate, isPending: statusUpdatePending }),
  useSetCurrentItem: () => ({ mutate: mockSetCurrentMutate, isPending: setCurrentPending }),
  useUpdateAvailability: () => ({ mutate: mockUpdateAvailabilityMutate, isPending: false, variables: undefined }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { AttentionCard } from '@/components/team-tracker/AttentionCard';

// ── Helpers ─────────────────────────────────────────────

function buildSignals(overrides?: {
  freshness?: Partial<TrackerDeveloperSignals['freshness']>;
  risk?: Partial<TrackerDeveloperSignals['risk']>;
}): TrackerDeveloperSignals {
  return {
    freshness: {
      staleThresholdHours: 4,
      noCurrentThresholdHours: 2,
      statusFollowUpThresholdHours: 2,
      staleByTime: false,
      staleWithOpenRisk: false,
      staleWithoutCurrentWork: false,
      statusChangeWithoutFollowUp: false,
      ...overrides?.freshness,
    },
    risk: {
      openRisk: false,
      overdueLinkedWork: false,
      overdueLinkedCount: 0,
      overCapacity: false,
      capacityDelta: 0,
      ...overrides?.risk,
    },
  };
}

function buildAttentionItem(overrides: Partial<TrackerAttentionItem> = {}): TrackerAttentionItem {
  return {
    developer: { accountId: 'dev-1', displayName: 'Alice Smith', isActive: true },
    status: 'on_track',
    reasons: [{ code: 'no_current', label: 'No current item', priority: 4 }],
    isStale: false,
    signals: buildSignals(),
    hasCurrentItem: false,
    plannedCount: 2,
    availableQuickActions: ['update_status', 'set_current', 'mark_inactive', 'capture_follow_up'],
    setCurrentCandidates: [
      { id: 101, title: 'Fix regression bug', jiraKey: 'AM-456', lifecycle: 'tracker_only' },
      { id: 102, title: 'Review PR #42', lifecycle: 'manager_desk_linked' },
    ],
    ...overrides,
  };
}

function renderCard(item: TrackerAttentionItem, props: Partial<{
  onOpen: () => void;
  onMarkInactive: () => void;
  onCaptureFollowUp: () => void;
}> = {}) {
  return render(
    <TestWrapper>
      <AttentionCard
        item={item}
        index={0}
        date="2026-03-07"
        onOpen={props.onOpen ?? vi.fn()}
        onMarkInactive={props.onMarkInactive ?? vi.fn()}
        onCaptureFollowUp={props.onCaptureFollowUp ?? vi.fn()}
      />
    </TestWrapper>,
  );
}

// ── Tests ───────────────────────────────────────────────

describe('AttentionCard quick actions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
    statusUpdatePending = false;
    setCurrentPending = false;
    mockStatusUpdateMutate.mockReset();
    mockSetCurrentMutate.mockReset();
    mockUpdateAvailabilityMutate.mockReset();
    mockAddToast.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Rendering ───────────────────────────────────────

  it('renders quick actions only when listed in availableQuickActions', () => {
    const item = buildAttentionItem({
      availableQuickActions: ['update_status', 'capture_follow_up'],
    });
    renderCard(item);

    expect(screen.getByTestId('quick-action-update_status')).toBeInTheDocument();
    expect(screen.getByTestId('quick-action-capture_follow_up')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-action-set_current')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-action-mark_inactive')).not.toBeInTheDocument();
  });

  it('does not render quick actions strip when availableQuickActions is empty', () => {
    const item = buildAttentionItem({ availableQuickActions: [] });
    renderCard(item);

    expect(screen.queryByTestId('quick-action-update_status')).not.toBeInTheDocument();
  });

  it('hides Set Current when not in availableQuickActions', () => {
    const item = buildAttentionItem({
      availableQuickActions: ['update_status', 'mark_inactive', 'capture_follow_up'],
      setCurrentCandidates: [],
    });
    renderCard(item);

    expect(screen.queryByTestId('quick-action-set_current')).not.toBeInTheDocument();
  });

  // ── Propagation ─────────────────────────────────────

  it('action button clicks do not trigger onOpen (drawer)', () => {
    const onOpen = vi.fn();
    const item = buildAttentionItem();
    renderCard(item, { onOpen });

    const statusBtn = screen.getByTestId('quick-action-update_status');
    fireEvent.click(statusBtn);

    expect(onOpen).not.toHaveBeenCalled();
  });

  // ── Set Current ─────────────────────────────────────

  it('Set Current directly calls mutate for single candidate', () => {
    const item = buildAttentionItem({
      setCurrentCandidates: [{ id: 101, title: 'Fix regression bug', jiraKey: 'AM-456', lifecycle: 'tracker_only' }],
    });
    renderCard(item);

    const btn = screen.getByTestId('quick-action-set_current');
    fireEvent.click(btn);

    expect(mockSetCurrentMutate).toHaveBeenCalledWith(101, expect.any(Object));
  });

  it('Set Current shows candidate menu for multiple candidates', () => {
    const item = buildAttentionItem();
    renderCard(item);

    const btn = screen.getByTestId('quick-action-set_current');
    fireEvent.click(btn);

    expect(screen.getByText('Fix regression bug')).toBeInTheDocument();
    expect(screen.getByText('Review PR #42')).toBeInTheDocument();
    expect(screen.getByText('AM-456')).toBeInTheDocument();
  });

  it('selecting a candidate from the menu calls mutate', () => {
    const item = buildAttentionItem();
    renderCard(item);

    fireEvent.click(screen.getByTestId('quick-action-set_current'));
    fireEvent.click(screen.getByText('Fix regression bug'));

    expect(mockSetCurrentMutate).toHaveBeenCalledWith(101, expect.any(Object));
  });

  // ── Status Update ───────────────────────────────────

  it('Update Status opens the status sheet dialog', () => {
    const item = buildAttentionItem();
    renderCard(item);

    fireEvent.click(screen.getByTestId('quick-action-update_status'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Update status/)).toBeInTheDocument();
  });

  it('blocked status requires rationale before submit', () => {
    const item = buildAttentionItem({ status: 'on_track' });
    renderCard(item);

    fireEvent.click(screen.getByTestId('quick-action-update_status'));

    // Select blocked status
    const blockedBtn = screen.getByRole('button', { name: 'Blocked' });
    fireEvent.click(blockedBtn);

    // Rationale label should be visible
    expect(screen.getByText(/Rationale/)).toBeInTheDocument();

    // Submit button should exist but the submit should not proceed with empty rationale
    const submitBtn = screen.getByRole('button', { name: 'Update Status' });
    fireEvent.click(submitBtn);

    // Should NOT have called mutate because rationale is empty
    expect(mockStatusUpdateMutate).not.toHaveBeenCalled();
  });

  it('at_risk status requires rationale before submit', () => {
    const item = buildAttentionItem({ status: 'on_track' });
    renderCard(item);

    fireEvent.click(screen.getByTestId('quick-action-update_status'));

    fireEvent.click(screen.getByRole('button', { name: 'At Risk' }));
    expect(screen.getByText(/Rationale/)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'Update Status' });
    fireEvent.click(submitBtn);

    expect(mockStatusUpdateMutate).not.toHaveBeenCalled();
  });

  it('successful status update calls mutate with correct params', () => {
    const item = buildAttentionItem({ status: 'blocked' });
    renderCard(item);

    fireEvent.click(screen.getByTestId('quick-action-update_status'));

    // Select on_track (no rationale needed)
    fireEvent.click(screen.getByRole('button', { name: 'On Track' }));

    const submitBtn = screen.getByRole('button', { name: 'Update Status' });
    fireEvent.click(submitBtn);

    expect(mockStatusUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'dev-1',
        status: 'on_track',
      }),
      expect.any(Object),
    );
  });

  // ── Mark Inactive ───────────────────────────────────

  it('Mark Inactive calls onMarkInactive callback', () => {
    const onMarkInactive = vi.fn();
    const item = buildAttentionItem();
    renderCard(item, { onMarkInactive });

    fireEvent.click(screen.getByTestId('quick-action-mark_inactive'));

    expect(onMarkInactive).toHaveBeenCalled();
  });

  // ── Capture Follow-Up ───────────────────────────────

  it('Capture Follow-Up calls onCaptureFollowUp callback', () => {
    const onCaptureFollowUp = vi.fn();
    const item = buildAttentionItem();
    renderCard(item, { onCaptureFollowUp });

    fireEvent.click(screen.getByTestId('quick-action-capture_follow_up'));

    expect(onCaptureFollowUp).toHaveBeenCalled();
  });

  // ── Error handling ──────────────────────────────────

  it('shows error toast when status update mutation fails', () => {
    mockStatusUpdateMutate.mockImplementation((_params: unknown, opts: { onError?: (err: Error) => void }) => {
      opts.onError?.(new Error('Server error'));
    });

    const item = buildAttentionItem({ status: 'on_track' });
    renderCard(item);

    fireEvent.click(screen.getByTestId('quick-action-update_status'));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update Status' }));

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'Status update failed',
      }),
    );
  });

  it('shows error toast when set current mutation fails', () => {
    mockSetCurrentMutate.mockImplementation((_id: number, opts: { onError?: (err: Error) => void }) => {
      opts.onError?.(new Error('Cannot set current'));
    });

    const item = buildAttentionItem({
      setCurrentCandidates: [{ id: 101, title: 'Task', lifecycle: 'tracker_only' }],
    });
    renderCard(item);

    fireEvent.click(screen.getByTestId('quick-action-set_current'));

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'Failed to set current',
      }),
    );
  });
});
