import { describe, expect, it } from 'vitest';
import { resolveTagPopoverPosition } from '@/components/table/tagPopoverPosition';

describe('resolveTagPopoverPosition', () => {
  it('opens below the trigger when there is enough space', () => {
    const position = resolveTagPopoverPosition({
      triggerRect: { top: 240, bottom: 264, left: 320 },
      viewportWidth: 1440,
      viewportHeight: 900,
      popoverHeight: 220,
    });

    expect(position).toEqual({
      top: 272,
      left: 320,
    });
  });

  it('opens above the trigger when the viewport is tight below', () => {
    const position = resolveTagPopoverPosition({
      triggerRect: { top: 620, bottom: 644, left: 320 },
      viewportWidth: 1440,
      viewportHeight: 720,
      popoverHeight: 220,
    });

    expect(position).toEqual({
      top: 392,
      left: 320,
    });
  });

  it('keeps the popover inside the viewport when space is limited on every side', () => {
    const position = resolveTagPopoverPosition({
      triggerRect: { top: 120, bottom: 144, left: 400 },
      viewportWidth: 640,
      viewportHeight: 220,
      popoverHeight: 260,
    });

    expect(position.top).toBe(8);
    expect(position.left).toBe(352);
  });
});
