import { environment } from '../../environments/environment';

export interface MapLoadMeasure {
  label: string;
  durationMs: number;
}

export class MapLoadProfiler {
  private readonly enabled: boolean;
  private readonly measures: MapLoadMeasure[] = [];
  private readonly marks = new Map<string, number>();
  private interactiveLogged = false;

  constructor() {
    this.enabled =
      !environment.production ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('mapProfile') === '1');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  mark(name: string): void {
    if (!this.enabled) {
      return;
    }
    this.marks.set(name, performance.now());
    performance.mark(name);
  }

  measure(label: string, startMark: string, endMark?: string): number {
    if (!this.enabled) {
      return 0;
    }

    const end = endMark ? this.marks.get(endMark) : performance.now();
    const start = this.marks.get(startMark);
    if (start === undefined || end === undefined) {
      return 0;
    }

    const durationMs = end - start;
    this.measures.push({ label, durationMs });
    try {
      performance.measure(label, startMark, endMark);
    } catch {
      // Ignore duplicate measure names in repeated runs.
    }
    return durationMs;
  }

  endMark(name: string): void {
    if (!this.enabled) {
      return;
    }
    this.marks.set(name, performance.now());
    performance.mark(name);
  }

  timeSync<T>(label: string, fn: () => T): T {
    if (!this.enabled) {
      return fn();
    }
    const startMark = `map.sync.${label}.start`;
    const endMark = `map.sync.${label}.end`;
    this.mark(startMark);
    const result = fn();
    this.endMark(endMark);
    this.measure(label, startMark, endMark);
    return result;
  }

  logInteractiveSummary(): void {
    if (!this.enabled || this.interactiveLogged) {
      return;
    }
    this.interactiveLogged = true;
    this.logSummary('interactive');
  }

  logFullSummary(): void {
    if (!this.enabled) {
      return;
    }
    this.logSummary('full');
  }

  private logSummary(kind: 'interactive' | 'full'): void {
    const rows = this.measures.map(({ label, durationMs }) => ({
      step: label,
      ms: Math.round(durationMs),
    }));
    console.group(`[MapLoad] ${kind} summary`);
    console.table(rows);
    const total = rows.reduce((sum, row) => {
      if (row.step.endsWith('total')) {
        return sum;
      }
      return sum;
    }, 0);
    const totalRow = rows.find((row) => row.step.includes('total'));
    if (totalRow) {
      console.info(`[MapLoad] ${kind} total: ${totalRow.ms} ms`);
    }
    console.groupEnd();
  }
}

export function createMapLoadProfiler(): MapLoadProfiler {
  return new MapLoadProfiler();
}
