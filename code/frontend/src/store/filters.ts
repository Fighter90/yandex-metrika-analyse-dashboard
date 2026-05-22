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
