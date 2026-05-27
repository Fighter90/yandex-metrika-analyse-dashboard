import { create } from 'zustand';

export type Segment = 'b2c' | 'b2c_b2b' | 'b2b';

export interface FiltersState {
  from: string;
  to: string;
  channels: string[];
  segment: Segment;
  showArchived: boolean;
  setRange: (from: string, to: string) => void;
  toggleChannel: (channel: string) => void;
  setSegment: (segment: Segment) => void;
  toggleArchived: () => void;
  preset: (days: number) => void;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Global dashboard filters (sticky header). */
export const useFilters = create<FiltersState>((set) => ({
  from: isoDaysAgo(13),
  to: isoDaysAgo(0),
  channels: [],
  segment: 'b2c_b2b',
  showArchived: false,
  setRange: (from, to) => set({ from, to }),
  toggleChannel: (channel) =>
    set((s) => ({
      channels: s.channels.includes(channel)
        ? s.channels.filter((c) => c !== channel)
        : [...s.channels, channel],
    })),
  setSegment: (segment) => set({ segment }),
  toggleArchived: () => set((s) => ({ showArchived: !s.showArchived })),
  preset: (days) => set({ from: isoDaysAgo(days - 1), to: isoDaysAgo(0) }),
}));

/** Helper: format date for display */
export function formatDateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    /* c8 ignore next 3 */
  } catch {
    return iso;
  }
}

/** Helper: parse date input value to ISO date string */
export function parseDateInput(value: string): string {
  if (!value) return isoDaysAgo(0);
  // Ensure YYYY-MM-DD format
  const parts = value.split('-');
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return value;
}
