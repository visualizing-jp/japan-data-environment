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
  FORM_CODES,
  FORM_DIMS,
  METRICS,
  SURVEY_YEARS,
  VACANT_CODE_MAP,
  VACANT_YEARS,
  type FormDim,
} from "../src/lib/data/labels.ts";

const OUT_DIR = resolve(import.meta.dirname, "../public/data");

const PREF_AREAS = [
  "00000",
  ...Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0") + "000"),
];

function timeCode(year: string): string {
  // 社会・人口統計体系の調査年は「YYYY年度」→ YYYY100000
  return `${year}100000`;
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

function getSsds(t: Table, code: string, area: string, year: string): number | null {
  return t.get({
    観測値: "00001",
    "Ｈ　居住": code,
    地域: area,
    調査年: timeCode(year),
  });
}

function vacantGet(t: Table, catCode: string, areaCode = "00000"): number | null {
  const tab = [...t.axes.values()].find((a) => a.id === "tab")!;
  const cat = [...t.axes.values()].find((a) => a.id === "cat01")!;
  const area = [...t.axes.values()].find((a) => a.id === "area")!;
  const time = [...t.axes.values()].find((a) => a.id === "time")!;
  return t.get({
    [tab.name]: tab.items[0]!["@code"],
    [cat.name]: catCode,
    [area.name]: areaCode,
    [time.name]: time.items[0]!["@code"],
  });
}

async function buildEra(counts: Table, rates: Table) {
  const metrics = metricsDict();
  const years = [...SURVEY_YEARS];
  const metricCodes = METRICS.map((m) => m.code);

  const cube = new Cube(
    [
      { name: "metric", codes: metricCodes },
      { name: "year", codes: years },
    ],
    ["dwellings", "rate", "share"],
  );

  for (const year of years) {
    const total = getSsds(counts, "H1100", "00000", year);
    const occupied = getSsds(counts, "H1101", "00000", year);

    for (const m of METRICS) {
      let dwellings: number | null = null;
      let rate: number | null = null;
      let share: number | null = null;

      if (m.kind === "area" && m.countCode) {
        rate = getSsds(counts, m.countCode, "00000", year);
      } else if (m.countCode) {
        dwellings = getSsds(counts, m.countCode, "00000", year);
        if (m.code === "total") share = 1;
        else if (m.code === "vacant" || m.code === "occupied") share = shareOf(dwellings, total);
        else share = shareOf(dwellings, occupied);
      }

      if (m.rateCode) {
        rate = ratePctToFrac(getSsds(rates, m.rateCode, "00000", year));
      }

      cube.set("dwellings", [m.code, year], dwellings === null ? null : round(dwellings, 0));
      cube.set("rate", [m.code, year], rate);
      cube.set("share", [m.code, year], share);
    }
  }

  await writeJson("era", { ...cube.toJSON(), metrics });
}

async function buildForm(counts: Table) {
  const formDims = FORM_DIMS.map((d) => ({ code: d.id, label: d.label, level: 1 }));
  const codes = FORM_CODES.map((c) => ({
    code: c.code,
    label: c.label,
    level: c.level,
    parent: c.dim,
  }));

  const dimIds = FORM_DIMS.map((d) => d.id);
  const codeIds = FORM_CODES.map((c) => c.code);
  const years = [...SURVEY_YEARS];

  const cube = new Cube(
    [
      { name: "dim", codes: dimIds },
      { name: "code", codes: codeIds },
      { name: "year", codes: years },
    ],
    ["dwellings", "share"],
  );

  for (const year of years) {
    const occupied = getSsds(counts, "H1101", "00000", year);

    let sizeSum = 0;
    let sizeAny = false;
    for (const c of FORM_CODES.filter((x) => x.dim === "size")) {
      const v = getSsds(counts, c.countCode!, "00000", year);
      if (v !== null) {
        sizeAny = true;
        sizeSum += v;
      }
    }
    const sizeDenom = sizeAny ? sizeSum : null;

    const denomOf: Record<FormDim, number | null> = {
      tenure: occupied,
      building: occupied,
      size: sizeDenom,
      vacancy: null,
    };

    for (const c of FORM_CODES) {
      if (c.dim === "vacancy") continue;
      const dwellings = getSsds(counts, c.countCode!, "00000", year);
      cube.set("dwellings", [c.dim, c.code, year], dwellings === null ? null : round(dwellings, 0));
      cube.set("share", [c.dim, c.code, year], shareOf(dwellings, denomOf[c.dim]));
    }
  }

  const vacantTables: Record<string, string> = {
    "2013": "vacant-2013",
    "2018": "vacant-2018",
    "2023": "vacant-2023",
  };

  for (const year of VACANT_YEARS) {
    const t = await loadTable(vacantTables[year]!);
    const map = VACANT_CODE_MAP[year]!;
    const vacantTotal = vacantGet(t, map.vacant_total!);

    for (const key of ["secondary", "for_rent", "for_sale", "other_vacant"] as const) {
      const dwellings = vacantGet(t, map[key]!);
      cube.set(
        "dwellings",
        ["vacancy", key, year],
        dwellings === null ? null : round(dwellings, 0),
      );
      cube.set("share", ["vacancy", key, year], shareOf(dwellings, vacantTotal));
    }
  }

  await writeJson("form", { ...cube.toJSON(), formDims, codes });
}

async function buildGeo(counts: Table, rates: Table) {
  const geoMetrics = METRICS.filter((m) => m.geo);
  const metrics = metricsDict(geoMetrics);
  const years = [...SURVEY_YEARS];
  const metricCodes = geoMetrics.map((m) => m.code);

  const areaAxis = counts.axis("地域");
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
      const national =
        m.kind === "area" && m.countCode
          ? getSsds(counts, m.countCode, "00000", year)
          : m.rateCode
            ? ratePctToFrac(getSsds(rates, m.rateCode, "00000", year))
            : null;

      for (const area of PREF_AREAS) {
        const value =
          m.kind === "area" && m.countCode
            ? getSsds(counts, m.countCode, area, year)
            : m.rateCode
              ? ratePctToFrac(getSsds(rates, m.rateCode, area, year))
              : null;
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
  const counts = await loadTable("ssds-count");
  const rates = await loadTable("ssds-rate");
  console.log("build era...");
  await buildEra(counts, rates);
  console.log("build form...");
  await buildForm(counts);
  console.log("build geo...");
  await buildGeo(counts, rates);
  console.log("done");
}

await main();
