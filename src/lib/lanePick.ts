// 故事線抽選。權重 0 只可以由 ?lane= 指定，唔會入隨機輪換。

export function pickPositiveWeighted<T extends { weight: number }>(arr: readonly T[]): T {
  const src = arr.filter((item) => item.weight > 0);
  if (src.length === 0) {
    throw new Error("沒有正權重可選");
  }
  const total = src.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of src) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return src[src.length - 1];
}

export function pickLaneByWeight<T extends { key: string; weight: number; types: readonly string[] }>(
  lanes: readonly T[],
  storyType: string,
  exclude: ReadonlySet<string>
): T {
  const eligible = lanes.filter((lane) => lane.types.includes(storyType) && lane.weight > 0);
  const pool = eligible.filter((lane) => !exclude.has(lane.key));
  return pickPositiveWeighted(pool.length > 0 ? pool : eligible);
}

// 手動 ?lane= 唔睇權重；story_type 唔符合就當冇指定，交返隨機輪換。
export function resolveForcedLane<T extends { key: string; types: readonly string[] }>(
  lanes: readonly T[],
  requested: string | null | undefined,
  storyType: string
): T | null {
  if (!requested) return null;
  const lane = lanes.find((item) => item.key === requested);
  if (!lane || !lane.types.includes(storyType)) return null;
  return lane;
}

export function nextSeriesOrder(
  metas: readonly ({ series?: { key?: string; order?: number } | null } | null | undefined)[] | null | undefined,
  seriesKey: string
): number {
  let max = 0;
  for (const meta of metas ?? []) {
    const series = meta?.series;
    if (!series || series.key !== seriesKey) continue;
    const order = series.order;
    if (typeof order !== "number" || !Number.isFinite(order)) continue;
    if (order > max) max = order;
  }
  return Math.floor(max) + 1;
}

export function closureFailNote(storyType: "serial" | "short", laneKey?: string): string {
  if (laneKey === "kanbujian") return "道具未回收:道具要早出現，最後一段 callback，結局要收口";
  return storyType === "short" ? "沒有完整收尾" : "沒有停在抉擇節點";
}
