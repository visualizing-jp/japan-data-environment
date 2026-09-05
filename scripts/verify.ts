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

interface FormFile extends CubeJson {
  formDims: DictEntry[];
  codes: DictEntry[];
}

interface GeoFile extends CubeJson {
  metrics: DictEntry[];
  areas: DictEntry[];
}

const eraRaw = JSON.parse(await readFile(resolve(DATA, "era.json"), "utf8")) as EraFile;
const formRaw = JSON.parse(await readFile(resolve(DATA, "form.json"), "utf8")) as FormFile;
const geoRaw = JSON.parse(await readFile(resolve(DATA, "geo.json"), "utf8")) as GeoFile;

const era = new CubeView(eraRaw);
const form = new CubeView(formRaw);
const geo = new CubeView(geoRaw);

const total2023 = era.at("dwellings", { metric: "total", year: "2023" });
ok(
  "era 2023 総住宅数が妥当",
  total2023 !== null && total2023 > 60_000_000 && total2023 < 70_000_000,
  String(total2023),
);

const vacantRate2023 = era.at("rate", { metric: "vacant", year: "2023" });
ok(
  "era 2023 空き家率≈13.8%",
  vacantRate2023 !== null && near(vacantRate2023, 0.138, 0.005),
  String(vacantRate2023),
);

const ownedRate2023 = era.at("rate", { metric: "owned", year: "2023" });
ok(
  "era 2023 持ち家比率≈60.9%",
  ownedRate2023 !== null && near(ownedRate2023, 0.609, 0.01),
  String(ownedRate2023),
);

const vacant1978 = era.at("rate", { metric: "vacant", year: "1978" });
ok(
  "era 空き家率が上昇 (1978→2023)",
  vacant1978 !== null && vacantRate2023 !== null && vacantRate2023 > vacant1978,
  `${vacant1978} → ${vacantRate2023}`,
);

const tenureSum = ["owned", "rented_public", "rented_private", "rented_issued"].reduce(
  (n, code) => n + (form.at("share", { dim: "tenure", code, year: "2023" }) ?? 0),
  0,
);
ok("form 2023 所有 share 合計≈1", near(tenureSum, 1, 0.05), String(tenureSum));

const vacantShareSum = ["secondary", "for_rent", "for_sale", "other_vacant"].reduce(
  (n, code) => n + (form.at("share", { dim: "vacancy", code, year: "2023" }) ?? 0),
  0,
);
ok("form 2023 空き家種類 share 合計≈1", near(vacantShareSum, 1, 0.05), String(vacantShareSum));

ok("geo 都道府県が47+全国", geoRaw.areas.length === 48, String(geoRaw.areas.length));

const tokyoVacant = geo.at("value", { metric: "vacant", year: "2023", area: "13000" });
const nationalVacant = geo.at("value", { metric: "vacant", year: "2023", area: "00000" });
ok(
  "geo 東京の空き家率が全国と異なる",
  tokyoVacant !== null && nationalVacant !== null && tokyoVacant !== nationalVacant,
  `東京 ${tokyoVacant} / 全国 ${nationalVacant}`,
);

const relNat = geo.at("relative", { metric: "vacant", year: "2023", area: "00000" });
ok("geo 全国 relative=1", relNat === 1, String(relNat));

if (failed > 0) {
  console.error(`\n${failed} checks failed`);
  process.exit(1);
}
console.log("\nall checks passed");
