/**
 * 指標・形態カテゴリのヘルパ。
 */

import type { DictEntry } from "./cube.ts";

export function listMetrics(items: DictEntry[]): DictEntry[] {
  return items;
}

export function codesForDim(items: DictEntry[], dim: string): DictEntry[] {
  return items.filter((d) => d.parent === dim);
}

export function geoMetrics(items: DictEntry[]): DictEntry[] {
  return items;
}
