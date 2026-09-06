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

/** 社会生活統計指標 Ｈ居住（下水道・水洗化）。 */
const HOUSING_RATE_CODES = [
  "#H05304",
  "#H0530401",
  "#H05306",
  "#H05307",
  "#H05308",
].join(",");

/** 基礎データ Ｋ安全（公害苦情件数）。 */
const SAFETY_COUNT_CODES = ["K6101", "K6103", "K610301", "K610302"].join(",");

/** 社会生活統計指標 Ｋ安全（人口当たり苦情）。 */
const SAFETY_RATE_CODES = ["#K09201"].join(",");

export const DATASETS = {
  ssdsHousingRate: {
    key: "ssds-housing-rate",
    statsDataId: "0000010208",
    label: "社会・人口統計体系 社会生活統計指標 Ｈ居住（下水道・水洗化）",
    query: { cdCat01: HOUSING_RATE_CODES },
  },

  ssdsSafetyCount: {
    key: "ssds-safety-count",
    statsDataId: "0000010111",
    label: "社会・人口統計体系 基礎データ Ｋ安全（公害苦情件数）",
    query: { cdCat01: SAFETY_COUNT_CODES },
  },

  ssdsSafetyRate: {
    key: "ssds-safety-rate",
    statsDataId: "0000010211",
    label: "社会・人口統計体系 社会生活統計指標 Ｋ安全（公害苦情比率）",
    query: { cdCat01: SAFETY_RATE_CODES },
  },

  complaintKind: {
    key: "complaint-kind",
    statsDataId: "0003293269",
    label: "公害苦情調査 公害の種類別苦情件数の推移",
  },
} as const satisfies Record<string, DatasetDef>;

export const ALL_DATASETS: DatasetDef[] = Object.values(DATASETS);

export const BUILD_DATASETS: DatasetDef[] = ALL_DATASETS;
