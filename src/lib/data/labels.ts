/**
 * 住宅指標・形態カテゴリの表示定義。
 */

export type MetricKind = "count" | "rate" | "area";
export type FormDim = "tenure" | "building" | "size" | "vacancy";

export interface MetricDef {
  code: string;
  label: string;
  /** 時代リストのグループ表示用。 */
  group: string;
  kind: MetricKind;
  /** 基礎データ側の件数／面積コード。 */
  countCode?: string;
  /** 社会生活統計指標側の率コード。 */
  rateCode?: string;
  /** 地域ビューに載せるか。 */
  geo: boolean;
}

export interface FormCodeDef {
  code: string;
  label: string;
  dim: FormDim;
  /** SSDS 件数コード（vacancy 以外）。 */
  countCode?: string;
  level: number;
}

/** 時代・地域の指標。 */
export const METRICS: readonly MetricDef[] = [
  {
    code: "total",
    label: "総住宅数",
    group: "ストック",
    kind: "count",
    countCode: "H1100",
    geo: false,
  },
  {
    code: "occupied",
    label: "居住世帯あり",
    group: "ストック",
    kind: "count",
    countCode: "H1101",
    geo: false,
  },
  {
    code: "vacant",
    label: "空き家",
    group: "空き家",
    kind: "count",
    countCode: "H110202",
    rateCode: "#H01405",
    geo: true,
  },
  {
    code: "owned",
    label: "持ち家",
    group: "所有",
    kind: "count",
    countCode: "H1310",
    rateCode: "#H01301",
    geo: true,
  },
  {
    code: "rented",
    label: "借家",
    group: "所有",
    kind: "count",
    countCode: "H1320",
    rateCode: "#H01302",
    geo: true,
  },
  {
    code: "rented_private",
    label: "民営借家",
    group: "所有",
    kind: "count",
    countCode: "H1322",
    rateCode: "#H0130202",
    geo: true,
  },
  {
    code: "detached",
    label: "一戸建",
    group: "建て方",
    kind: "count",
    countCode: "H1401",
    rateCode: "#H01401",
    geo: true,
  },
  {
    code: "row",
    label: "長屋建",
    group: "建て方",
    kind: "count",
    countCode: "H1402",
    rateCode: "#H01402",
    geo: true,
  },
  {
    code: "apartment",
    label: "共同住宅",
    group: "建て方",
    kind: "count",
    countCode: "H1403",
    rateCode: "#H01403",
    geo: true,
  },
  {
    code: "floor_area",
    label: "1住宅当たり延べ面積",
    group: "広さ",
    kind: "area",
    countCode: "H2130",
    geo: true,
  },
] as const;

/** 形態ビューのカテゴリ（所有・建て方・畳数）。空き家種類は別途年次表。 */
export const FORM_CODES: readonly FormCodeDef[] = [
  { code: "owned", label: "持ち家", dim: "tenure", countCode: "H1310", level: 1 },
  { code: "rented_public", label: "公営・UR・公社", dim: "tenure", countCode: "H1321", level: 1 },
  { code: "rented_private", label: "民営借家", dim: "tenure", countCode: "H1322", level: 1 },
  { code: "rented_issued", label: "給与住宅", dim: "tenure", countCode: "H1323", level: 1 },

  { code: "detached", label: "一戸建", dim: "building", countCode: "H1401", level: 1 },
  { code: "row", label: "長屋建", dim: "building", countCode: "H1402", level: 1 },
  { code: "apartment", label: "共同住宅", dim: "building", countCode: "H1403", level: 1 },
  { code: "other_build", label: "その他", dim: "building", countCode: "H1404", level: 1 },

  { code: "tatami_lt6", label: "5.9畳以下", dim: "size", countCode: "H2101", level: 1 },
  { code: "tatami_6_12", label: "6.0–11.9畳", dim: "size", countCode: "H2102", level: 1 },
  { code: "tatami_12_18", label: "12.0–17.9畳", dim: "size", countCode: "H2103", level: 1 },
  { code: "tatami_18_24", label: "18.0–23.9畳", dim: "size", countCode: "H2104", level: 1 },
  { code: "tatami_24_30", label: "24.0–29.9畳", dim: "size", countCode: "H2105", level: 1 },
  { code: "tatami_30_36", label: "30.0–35.9畳", dim: "size", countCode: "H2106", level: 1 },
  { code: "tatami_36_48", label: "36.0–47.9畳", dim: "size", countCode: "H2107", level: 1 },
  { code: "tatami_48p", label: "48.0畳以上", dim: "size", countCode: "H2108", level: 1 },

  { code: "secondary", label: "二次的住宅", dim: "vacancy", level: 1 },
  { code: "for_rent", label: "賃貸用", dim: "vacancy", level: 1 },
  { code: "for_sale", label: "売却用", dim: "vacancy", level: 1 },
  { code: "other_vacant", label: "その他の空き家", dim: "vacancy", level: 1 },
] as const;

export const FORM_DIMS: readonly { id: FormDim; label: string }[] = [
  { id: "tenure", label: "所有" },
  { id: "building", label: "建て方" },
  { id: "size", label: "広さ" },
  { id: "vacancy", label: "空き家" },
] as const;

/** 空き家種類：年次表ごとの生コード → 正規化コード。 */
export const VACANT_CODE_MAP: Record<
  string,
  Partial<Record<"secondary" | "for_rent" | "for_sale" | "other_vacant" | "vacant_total", string>>
> = {
  "2013": {
    vacant_total: "00008",
    secondary: "00009",
    for_rent: "00012",
    for_sale: "00013",
    other_vacant: "00014",
  },
  "2018": {
    vacant_total: "22",
    secondary: "221",
    for_rent: "222",
    for_sale: "223",
    other_vacant: "224",
  },
  // 2023 は二次的とその他のコード意味が入れ替わっている（docs/data-sources.md）
  "2023": {
    vacant_total: "22",
    secondary: "224",
    for_rent: "222",
    for_sale: "223",
    other_vacant: "221",
  },
};

export const SURVEY_YEARS = [
  "1978",
  "1983",
  "1988",
  "1993",
  "1998",
  "2003",
  "2008",
  "2013",
  "2018",
  "2023",
] as const;

export const VACANT_YEARS = ["2013", "2018", "2023"] as const;
