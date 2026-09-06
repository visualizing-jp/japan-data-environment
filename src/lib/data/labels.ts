/**
 * 環境指標・公害種類の表示定義。
 */

export type MetricKind = "cases" | "rate" | "per_capita";

export interface MetricDef {
  code: string;
  label: string;
  group: string;
  kind: MetricKind;
  /** 基礎データ側の件数コード（Ｋ安全）。 */
  countCode?: string;
  /** 社会生活統計指標側の率コード（Ｈ居住 or Ｋ安全）。 */
  rateCode?: string;
  /** 下水道の定義改定後コード（2012〜）。 */
  rateCodeAlt?: string;
  /** 地域ビューに載せるか。 */
  geo: boolean;
}

export interface KindCodeDef {
  code: string;
  label: string;
  /** 公害苦情調査の種類コード。 */
  kindCode: string;
  group: "air_water" | "other" | "total";
}

/** 時代・地域の指標。 */
export const METRICS: readonly MetricDef[] = [
  {
    code: "sewerage",
    label: "下水道普及率",
    group: "水まわり",
    kind: "rate",
    rateCode: "#H05304",
    rateCodeAlt: "#H0530401",
    geo: true,
  },
  {
    code: "flush",
    label: "水洗化人口比率",
    group: "水まわり",
    kind: "rate",
    rateCode: "#H05306",
    geo: true,
  },
  {
    code: "complaints",
    label: "公害苦情取扱件数",
    group: "公害苦情",
    kind: "cases",
    countCode: "K6101",
    geo: false,
  },
  {
    code: "typical7",
    label: "典型7公害受付件数",
    group: "公害苦情",
    kind: "cases",
    countCode: "K6103",
    geo: false,
  },
  {
    code: "complaints_per_100k",
    label: "公害苦情（人口10万人当たり）",
    group: "公害苦情",
    kind: "per_capita",
    rateCode: "#K09201",
    geo: true,
  },
] as const;

/** 大気水質ビューの種類。 */
export const KIND_CODES: readonly KindCodeDef[] = [
  { code: "air", label: "大気汚染", kindCode: "190", group: "air_water" },
  { code: "water", label: "水質汚濁", kindCode: "200", group: "air_water" },
  { code: "noise", label: "騒音", kindCode: "230", group: "other" },
  { code: "vibration", label: "振動", kindCode: "290", group: "other" },
  { code: "odor", label: "悪臭", kindCode: "310", group: "other" },
  { code: "soil", label: "土壌汚染", kindCode: "210", group: "other" },
  { code: "subsidence", label: "地盤沈下", kindCode: "300", group: "other" },
  { code: "typical7", label: "典型7公害計", kindCode: "180", group: "total" },
  { code: "total", label: "合計", kindCode: "100", group: "total" },
] as const;

/** 時代・地域の年範囲（SSDS）。 */
export const ERA_FROM = 1975;
export const ERA_TO = 2023;

/** 種類別苦情の年範囲（公害苦情調査推移表）。 */
export const KIND_FROM = 1972;
export const KIND_TO = 2016;

export const PREF_AREAS = [
  "00000",
  ...Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0") + "000"),
] as const;
