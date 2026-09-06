/**
 * 配信 cube の健全性チェック。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CubeView, type CubeJson, type DictEntry } from "../src/app/data/cube.ts";

const DATA = resolve(import.meta.dirname, "../public/data");

let failed = 0;

function ok(label: string, cond: boolean, detail = ""): void {
  console.log(`${cond ? "OK" : "NG"}  ${label}${detail ? `: ${detail}` : ""}`);
  if (!cond) failed += 1;
}

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

interface EraFile extends CubeJson {
  metrics: DictEntry[];
}

interface KindFile extends CubeJson {
  codes: DictEntry[];
}

interface GeoFile extends CubeJson {
  metrics: DictEntry[];
  areas: DictEntry[];
}

const eraRaw = JSON.parse(await readFile(resolve(DATA, "era.json"), "utf8")) as EraFile;
const kindRaw = JSON.parse(await readFile(resolve(DATA, "kind.json"), "utf8")) as KindFile;
const geoRaw = JSON.parse(await readFile(resolve(DATA, "geo.json"), "utf8")) as GeoFile;

const era = new CubeView(eraRaw);
const kind = new CubeView(kindRaw);
const geo = new CubeView(geoRaw);

const sewer1975 = era.at("rate", { metric: "sewerage", year: "1975" });
ok(
  "era 1975 下水道普及率≈22.8%",
  sewer1975 !== null && near(sewer1975, 0.228, 0.002),
  String(sewer1975),
);

const sewer2011 = era.at("rate", { metric: "sewerage", year: "2011" });
ok(
  "era 2011 下水道普及率≈74.4%",
  sewer2011 !== null && near(sewer2011, 0.744, 0.002),
  String(sewer2011),
);

const sewer2021 = era.at("rate", { metric: "sewerage", year: "2021" });
ok(
  "era 2021 下水道普及率≈80.5%",
  sewer2021 !== null && near(sewer2021, 0.805, 0.002),
  String(sewer2021),
);

const sewer2013 = era.at("rate", { metric: "sewerage", year: "2013" });
ok("era 2013 全国下水道は欠測", sewer2013 === null, String(sewer2013));

const complaints1975 = era.at("cases", { metric: "complaints", year: "1975" });
ok(
  "era 1975 公害苦情取扱≈94,654",
  complaints1975 !== null && near(complaints1975, 94_654, 1),
  String(complaints1975),
);

const complaints2023 = era.at("cases", { metric: "complaints", year: "2023" });
ok(
  "era 2023 公害苦情取扱≈74,608",
  complaints2023 !== null && near(complaints2023, 74_608, 1),
  String(complaints2023),
);

const per100k1975 = era.at("rate", { metric: "complaints_per_100k", year: "1975" });
ok(
  "era 1975 人口10万人当たり≈60.1",
  per100k1975 !== null && near(per100k1975, 60.1, 0.05),
  String(per100k1975),
);

const water1972 = kind.at("cases", { code: "water", year: "1972" });
ok(
  "kind 1972 水質汚濁≈14,197",
  water1972 !== null && near(water1972, 14_197, 1),
  String(water1972),
);

const water2016 = kind.at("cases", { code: "water", year: "2016" });
ok(
  "kind 2016 水質汚濁≈6,442",
  water2016 !== null && near(water2016, 6_442, 1),
  String(water2016),
);

const kindShareSum = ["air", "water", "noise", "vibration", "odor", "soil", "subsidence"].reduce(
  (n, code) => n + (kind.at("share", { code, year: "2016" }) ?? 0),
  0,
);
// 典型7内訳の合計は典型7計に近く、合計(100)には典型7以外も含まれる
ok("kind 2016 主要種類 share>0", kindShareSum > 0.3, String(kindShareSum));

ok("geo 都道府県が47+全国", geoRaw.areas.length === 48, String(geoRaw.areas.length));

const tokyo = geo.at("value", { metric: "complaints_per_100k", year: "2023", area: "13000" });
const national = geo.at("value", { metric: "complaints_per_100k", year: "2023", area: "00000" });
ok(
  "geo 東京の人口当たり苦情が全国と異なる",
  tokyo !== null && national !== null && tokyo !== national,
  `東京 ${tokyo} / 全国 ${national}`,
);

const relNat = geo.at("relative", { metric: "complaints_per_100k", year: "2023", area: "00000" });
ok("geo 全国 relative=1", relNat === 1, String(relNat));

const flush1975 = era.at("rate", { metric: "flush", year: "1975" });
ok("era 1975 水洗化人口比率あり", flush1975 !== null && flush1975 > 0, String(flush1975));

if (failed > 0) {
  console.error(`\n${failed} checks failed`);
  process.exit(1);
}
console.log("\nall checks passed");
