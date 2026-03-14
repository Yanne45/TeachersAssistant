/**
 * Compute virtual scroll window for a list of items.
 * Used across ListeDevoirsPage, ListeElevesPage, TableauNotesPage, BulletinsPage, CorrectionSeriePage.
 */
export interface VirtualScrollParams {
  totalCount: number;
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  overscan: number;
  threshold: number;
}

export interface VirtualScrollResult {
  useVirtual: boolean;
  rowStart: number;
  rowEnd: number;
  topSpacer: number;
  bottomSpacer: number;
}

export function computeVirtualScroll(params: VirtualScrollParams): VirtualScrollResult {
  const { totalCount, scrollTop, viewportHeight, rowHeight, overscan, threshold } = params;

  const useVirtual = totalCount > threshold;

  if (!useVirtual) {
    return {
      useVirtual: false,
      rowStart: 0,
      rowEnd: totalCount,
      topSpacer: 0,
      bottomSpacer: 0,
    };
  }

  const rowStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const rowCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const rowEnd = Math.min(totalCount, rowStart + rowCount);
  const topSpacer = rowStart * rowHeight;
  const bottomSpacer = (totalCount - rowEnd) * rowHeight;

  return { useVirtual, rowStart, rowEnd, topSpacer, bottomSpacer };
}
