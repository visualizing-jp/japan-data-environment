/** 時代ビューの注記・図中マーク。 */

export const MARKS = [
  {
    year: 1998,
    label: "空き家率が10%超",
    detail: "総住宅数に占める空き家の割合が初めて10%を超えた（社会・人口統計体系）。",
  },
  {
    year: 2018,
    label: "空き家約849万戸",
    detail: "住宅・土地統計調査。空き家率は13.6%。",
  },
  {
    year: 2023,
    label: "空き家約900万戸",
    detail: "住宅・土地統計調査。空き家率は13.8%。",
  },
] as const;

/** TrendStack が参照する帯注記（推計区間なしのため空）。 */
export const SPANS: readonly {
  from: number;
  to: number;
  label: string;
  detail: string;
  kind: "missing" | "scope";
}[] = [];

export const NOTES = [
  {
    term: "単位",
    detail:
      "住宅数。世帯ダッシュボード（一般世帯）とは分母が異なる。「誰と暮らすか」と「どんな箱か」は対になるが数値は接続しない。",
  },
  {
    term: "分母",
    detail:
      "持ち家比率・建て方比率の分母は居住世帯あり住宅。空き家率の分母は総住宅数。",
  },
  {
    term: "出典",
    detail:
      "社会・人口統計体系（都道府県データ）Ｈ居住経由の住宅・土地統計調査。調査は概ね5年ごと。",
  },
  {
    term: "空き家種類",
    detail:
      "2023年の分類コードは2018以前と意味が入れ替わっているが、表示ラベルへ正規化してある。",
  },
] as const;
