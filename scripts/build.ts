/**
 * 生データから配信用 cube を組み立てて public/data/ に書き出す。
 *
 *   npm run data
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadTable, type Table } from "../src/lib/transform/table.ts";
import { Cube, round } from "../src/lib/transform/cube.ts";
import { formatBytes } from "../src/lib/cache.ts";
import type { DictEntry } from "../src/app/data/cube.ts";
import {
  ERA_FROM,
  ERA_TO,
  KIND_CODES,
  KIND_FROM,
  KIND_TO,
  METRICS,
  PREF_AREAS,
  type MetricDef,
} from "../src/lib/data/labels.ts";

const OUT_DIR = resolve(import.meta.dirname, "../public/data");

function timeCode(year: string): string {
  return `${year}100000`;
}

function yearsInclusive(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
}

function shareOf(part: number | null, total: number | null): number | null {
  if (part === null || total === null || total === 0) return null;
  return round(part / total, 4);
}

function ratePctToFrac(v: number | null): number | null {
  if (v === null) return null;
  return round(v / 100, 4);
}

async function writeJson(name: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  await writeFile(resolve(OUT_DIR, `${name}.json`), json);
  console.log(`  ${name}.json  ${formatBytes(Buffer.byteLength(json))}`);
}

function metricsDict(list = METRICS): DictEntry[] {
  return list.map((m) => ({
    code: m.code,
    label: m.label,
    level: 1,
    parent: m.group,
  }));
}

function getHousingRate(t: Table, code: string, area: string, year: string): number | null {
  return t.get({
    観測値: "00001",
    "Ｈ　居住": code,
    地域: area,
    調査年: timeCode(year),
  });
}

function getSafetyCount(t: Table, code: string, area: string, year: string): number | null {
  return t.get({
    観測値: "00001",
    "Ｋ　安全": code,
    地域: area,
    調査年: timeCode(year),
  });
}

function getSafetyRate(t: Table, code: string, area: string, year: string): number | null {
  return t.get({
    観測値: "00001",
    "Ｋ　安全": code,
    地域: area,
    調査年: timeCode(year),
  });
}

/** 下水道普及率: 〜2011 は #H05304、2012〜 は #H0530401（全国の 2012–2015 は欠測）。 */
function sewerageRate(housing: Table, area: string, year: string): number | null {
  const y = Number(year);
  if (y <= 2011) return ratePctToFrac(getHousingRate(housing, "#H05304", area, year));
  return ratePctToFrac(getHousingRate(housing, "#H0530401", area, year));
}

function readMetricValue(
  housing: Table,
  safetyCount: Table,
  safetyRate: Table,
  m: MetricDef,
  area: string,
  year: string,
): number | null {
  if (m.code === "sewerage") return sewerageRate(housing, area, year);
  if (m.kind === "rate" && m.rateCode) {
    return ratePctToFrac(getHousingRate(housing, m.rateCode, area, year));
  }
  if (m.kind === "cases" && m.countCode) {
    const v = getSafetyCount(safetyCount, m.countCode, area, year);
    return v === null ? null : round(v, 0);
  }
  if (m.kind === "per_capita" && m.rateCode) {
    const v = getSafetyRate(safetyRate, m.rateCode, area, year);
    return v === null ? null : round(v, 4);
  }
  return null;
}

async function buildEra(housing: Table, safetyCount: Table, safetyRate: Table) {
  const metrics = metricsDict();
  const years = yearsInclusive(ERA_FROM, ERA_TO);
  const metricCodes = METRICS.map((m) => m.code);

  const cube = new Cube(
    [
      { name: "metric", codes: metricCodes },
      { name: "year", codes: years },
    ],
    ["cases", "rate"],
  );

  for (const year of years) {
    for (const m of METRICS) {
      const value = readMetricValue(housing, safetyCount, safetyRate, m, "00000", year);
      if (m.kind === "cases") {
        cube.set("cases", [m.code, year], value);
        cube.set("rate", [m.code, year], null);
      } else {
        cube.set("cases", [m.code, year], null);
        cube.set("rate", [m.code, year], value);
      }
    }
  }

  await writeJson("era", { ...cube.toJSON(), metrics });
}

async function buildKind(kindTable: Table) {
  const codes = KIND_CODES.map((c) => ({
    code: c.code,
    label: c.label,
    level: 1,
    parent: c.group,
  }));
  const codeIds = KIND_CODES.map((c) => c.code);
  const years = yearsInclusive(KIND_FROM, KIND_TO);

  // 軸名はメタ実測に合わせる（部分一致）
  const tabAxis = kindTable.axis("表章");
  const kindAxis = kindTable.axis("公害の種類");
  const timeAxis = kindTable.axis("年度");

  const casesTab =
    tabAxis.items.find((i) => i["@name"].includes("件数") && !i["@name"].includes("構成"))?.[
      "@code"
    ] ?? tabAxis.items[0]!["@code"];

  const cube = new Cube(
    [
      { name: "code", codes: codeIds },
      { name: "year", codes: years },
    ],
    ["cases", "share"],
  );

  for (const year of years) {
    const time = timeCode(year);
    // 時間軸にその年が無ければスキップ（全 null）
    if (!timeAxis.items.some((i) => i["@code"] === time)) continue;

    const total = kindTable.get({
      表章: casesTab,
      公害の種類: "100",
      年度: time,
    });

    for (const c of KIND_CODES) {
      const cases = kindTable.get({
        表章: casesTab,
        公害の種類: c.kindCode,
        年度: time,
      });
      cube.set("cases", [c.code, year], cases === null ? null : round(cases, 0));
      cube.set("share", [c.code, year], shareOf(cases, total));
    }
  }

  // デバッグ用に軸を確認しやすくする（存在確認済み）
  void kindAxis;

  await writeJson("kind", { ...cube.toJSON(), codes });
}

async function buildGeo(housing: Table, safetyCount: Table, safetyRate: Table) {
  const geoMetrics = METRICS.filter((m) => m.geo);
  const metrics = metricsDict(geoMetrics);
  const years = yearsInclusive(ERA_FROM, ERA_TO);
  const metricCodes = geoMetrics.map((m) => m.code);

  const areaAxis = housing.axis("地域");
  const areas: DictEntry[] = PREF_AREAS.map((code) => {
    if (code === "00000") return { code, label: "全国", level: 0 };
    const item = areaAxis.items.find((c) => c["@code"] === code);
    return { code, label: item?.["@name"] ?? code, level: 1 };
  });

  const cube = new Cube(
    [
      { name: "metric", codes: metricCodes },
      { name: "year", codes: years },
      { name: "area", codes: [...PREF_AREAS] },
    ],
    ["value", "relative"],
  );

  for (const year of years) {
    for (const m of geoMetrics) {
      const national = readMetricValue(housing, safetyCount, safetyRate, m, "00000", year);
      for (const area of PREF_AREAS) {
        const value = readMetricValue(housing, safetyCount, safetyRate, m, area, year);
        const relative =
          value !== null && national !== null && national !== 0
            ? round(value / national, 4)
            : null;
        cube.set("value", [m.code, year, area], value);
        cube.set("relative", [m.code, year, area], relative);
      }
    }
  }

  await writeJson("geo", { ...cube.toJSON(), metrics, areas });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("load tables...");
  const housing = await loadTable("ssds-housing-rate");
  const safetyCount = await loadTable("ssds-safety-count");
  const safetyRate = await loadTable("ssds-safety-rate");
  const kindTable = await loadTable("complaint-kind");
  console.log("build era...");
  await buildEra(housing, safetyCount, safetyRate);
  console.log("build kind...");
  await buildKind(kindTable);
  console.log("build geo...");
  await buildGeo(housing, safetyCount, safetyRate);
  console.log("done");
}

await main();
