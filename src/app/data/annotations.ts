/** 時代ビューの注記・図中マーク。 */

export const MARKS = [
  {
    year: 2000,
    label: "大気汚染苦情の高止まり",
    detail:
      "ディーゼル車規制前後で大気汚染苦情が目立つ時期。件数は濃度そのものではない。",
  },
  {
    year: 2012,
    label: "下水道普及率の定義改定",
    detail:
      "社会生活統計指標の下水道普及率コードが切り替わる。全国値は 2012–2015 が欠測。",
  },
  {
    year: 2016,
    label: "種類別苦情の収録上限",
    detail: "公害苦情調査の種類別推移表は 2016 年度まで。以降は総数のみ SSDS で延長。",
  },
] as const;

export const SPANS: readonly {
  from: number;
  to: number;
  label: string;
  detail: string;
  kind: "missing" | "scope";
}[] = [
  {
    from: 2012,
    to: 2015,
    label: "下水道・全国欠測",
    detail: "定義改定後コードに全国セルが無く、都道府県のみ収録。",
    kind: "missing",
  },
] as const;

export const NOTES = [
  {
    term: "下水道普及率",
    detail:
      "生活排水処理のインフラ整備率。水質の測定値ではない。2011以前と2012以降で定義が異なる。",
  },
  {
    term: "公害苦情",
    detail:
      "行政が受け付けた件数。規制・意識・定義変更の複合で動く。環境濃度の直接指標ではない。",
  },
  {
    term: "大気・水質",
    detail: "種類別は公害苦情調査の推移表（〜2016）。大気汚染と水質汚濁を主軸に見る。",
  },
  {
    term: "出典",
    detail:
      "公害等調整委員会「公害苦情調査」、下水道関連は社会・人口統計体系（Ｈ居住・Ｋ安全）経由（e-Stat）。",
  },
] as const;
