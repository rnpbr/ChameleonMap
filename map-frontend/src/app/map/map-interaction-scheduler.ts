export type BatchWorkItem = () => void;

export interface BatchSchedulerHandle {
  cancel: () => void;
}

/**
 * Runs work items in chunks on idle/animation frames so the main thread stays responsive.
 */
export function runBatchedWork(
  items: BatchWorkItem[],
  chunkSize: number,
  onComplete: () => void
): BatchSchedulerHandle {
  let index = 0;
  let cancelled = false;
  let scheduledId: ReturnType<typeof requestAnimationFrame> | number | null = null;

  const runChunk = () => {
    if (cancelled) {
      return;
    }

    const end = Math.min(index + chunkSize, items.length);
    for (let i = index; i < end; i++) {
      items[i]();
    }
    index = end;

    if (index < items.length) {
      scheduleNext();
    } else {
      onComplete();
    }
  };

  const scheduleNext = () => {
    if (typeof requestIdleCallback !== 'undefined') {
      scheduledId = requestIdleCallback(() => runChunk(), { timeout: 50 }) as unknown as number;
    } else {
      scheduledId = requestAnimationFrame(runChunk);
    }
  };

  scheduleNext();

  return {
    cancel: () => {
      cancelled = true;
      if (scheduledId !== null) {
        if (typeof cancelIdleCallback !== 'undefined' && typeof requestIdleCallback !== 'undefined') {
          cancelIdleCallback(scheduledId as number);
        } else {
          cancelAnimationFrame(scheduledId as number);
        }
      }
    },
  };
}
