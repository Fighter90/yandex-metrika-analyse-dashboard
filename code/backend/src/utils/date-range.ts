export interface DateChunk {
  readonly from: string;
  readonly to: string;
}

const MS_PER_DAY = 86_400_000;

/**
 * Split an inclusive [from, to] range (YYYY-MM-DD) into request chunks.
 * Ranges of ≤7 days stay whole; longer ranges become per-day chunks
 * (Metrika guidance: split >7-day periods into daily requests).
 */
export function dayChunks(from: string, to: string): DateChunk[] {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const spanDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;

  if (spanDays <= 7) return [{ from, to }];

  const chunks: DateChunk[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
    const day = new Date(t).toISOString().slice(0, 10);
    chunks.push({ from: day, to: day });
  }
  return chunks;
}
