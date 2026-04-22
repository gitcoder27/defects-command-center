const DEFAULT_POPOVER_WIDTH = 280;
const DEFAULT_VIEWPORT_PADDING = 8;
const DEFAULT_POPOVER_OFFSET = 8;
const DEFAULT_POPOVER_HEIGHT = 236;

interface TagPopoverPositionInput {
  triggerRect: Pick<DOMRect, 'top' | 'bottom' | 'left'>;
  viewportWidth: number;
  viewportHeight: number;
  popoverWidth?: number;
  popoverHeight?: number;
  viewportPadding?: number;
  offset?: number;
}

export const resolveTagPopoverPosition = ({
  triggerRect,
  viewportWidth,
  viewportHeight,
  popoverWidth = DEFAULT_POPOVER_WIDTH,
  popoverHeight = DEFAULT_POPOVER_HEIGHT,
  viewportPadding = DEFAULT_VIEWPORT_PADDING,
  offset = DEFAULT_POPOVER_OFFSET,
}: TagPopoverPositionInput) => {
  const maxLeft = Math.max(viewportPadding, viewportWidth - popoverWidth - viewportPadding);
  const left = Math.min(Math.max(triggerRect.left, viewportPadding), maxLeft);

  const spaceBelow = viewportHeight - triggerRect.bottom - offset;
  const spaceAbove = triggerRect.top - offset;
  const shouldOpenAbove = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

  const preferredTop = shouldOpenAbove
    ? triggerRect.top - popoverHeight - offset
    : triggerRect.bottom + offset;

  const maxTop = Math.max(viewportPadding, viewportHeight - popoverHeight - viewportPadding);
  const top = Math.min(Math.max(preferredTop, viewportPadding), maxTop);

  return { top, left };
};
