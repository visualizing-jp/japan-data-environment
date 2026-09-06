/**
 * 指標・公害種類のヘルパ。
 */

import type { DictEntry } from "./cube.ts";

export function listMetrics(items: DictEntry[]): DictEntry[] {
  return items;
}

export function geoMetrics(items: DictEntry[]): DictEntry[] {
  return items;
}

/** 大気水質ビューで主に見せる種類（合計・典型7計は補助）。 */
export function primaryKinds(items: DictEntry[]): DictEntry[] {
  return items.filter((c) => c.parent === "air_water" || c.parent === "other");
}
