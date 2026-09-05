/**
 * 取得対象の e-Stat 統計表。
 * 各表の素性・注意点は docs/data-sources.md を参照。
 */

export interface DatasetDef {
  key: string;
  statsDataId: string;
  label: string;
  expectedCells?: number;
  query?: Record<string, string>;
}

/** 基礎データの件数コード（カンマ区切り、仕様上限100）。 */
const COUNT_CODES = [
  "H1100",
  "H1101",
  "H1102",
  "H110202",
  "H1310",
  "H1320",
  "H1321",
  "H1322",
  "H1323",
  "H1401",
  "H1402",
  "H1403",
  "H1404",
  "H2130",
  "H2101",
  "H2102",
  "H2103",
  "H2104",
  "H2105",
  "H2106",
  "H2107",
  "H2108",
].join(",");

/** 社会生活統計指標の率コード。 */
const RATE_CODES = [
  "#H01301",
  "#H01302",
  "#H0130202",
  "#H01401",
  "#H01402",
  "#H01403",
  "#H01405",
].join(",");

export const DATASETS = {
  ssdsCount: {
    key: "ssds-count",
    statsDataId: "0000010108",
    label: "社会・人口統計体系 基礎データ Ｈ居住（件数・延べ面積・畳数）",
    query: { cdCat01: COUNT_CODES },
  },

  ssdsRate: {
    key: "ssds-rate",
    statsDataId: "0000010208",
    label: "社会・人口統計体系 社会生活統計指標 Ｈ居住（比率）",
    query: { cdCat01: RATE_CODES },
  },

  vacant2013: {
    key: "vacant-2013",
    statsDataId: "0003095315",
    label: "住宅・土地統計調査 2013 居住世帯の有無(9区分)",
  },

  vacant2018: {
    key: "vacant-2018",
    statsDataId: "0003326560",
    label: "住宅・土地統計調査 2018 居住世帯の有無(9区分)",
  },

  vacant2023: {
    key: "vacant-2023",
    statsDataId: "0004015740",
    label: "住宅・土地統計調査 2023 居住世帯の有無(9区分)",
  },
} as const satisfies Record<string, DatasetDef>;

export const ALL_DATASETS: DatasetDef[] = Object.values(DATASETS);

export const BUILD_DATASETS: DatasetDef[] = ALL_DATASETS;
