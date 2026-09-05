/**
 * 形態ビュー。所有・建て方・広さ・空き家種類の断面ランキング。
 */

import { use, useEffect, useMemo } from "react";
import { loadForm } from "../data/chunks.ts";
import { codesForDim } from "../data/hierarchy.ts";
import { TypeRanking, type RankRow } from "../components/TypeRanking.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const int = new Intl.NumberFormat("ja-JP");
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const DIMS = [
  { value: "tenure", label: "所有" },
  { value: "building", label: "建て方" },
  { value: "size", label: "広さ" },
  { value: "vacancy", label: "空き家" },
] as const;

type DimId = (typeof DIMS)[number]["value"];

export function FormView() {
  const { formDims, codes, cube, years } = use(loadForm());

  const [dim, setDim] = useUrlState<DimId>("dim", "tenure", (v) =>
    DIMS.some((d) => d.value === v),
  );

  const yearPool = useMemo(
    () =>
      dim === "vacancy"
        ? years.filter((y) => ["2013", "2018", "2023"].includes(y))
        : years,
    [dim, years],
  );

  const [year, setYear] = useUrlState("year", yearPool[0]!, (v) => years.includes(v));
  const effectiveYear = yearPool.includes(year) ? year : yearPool[0]!;

  useEffect(() => {
    if (year !== effectiveYear) setYear(effectiveYear);
  }, [year, effectiveYear, setYear]);

  const dimCodes = useMemo(() => codesForDim(codes, dim), [codes, dim]);

  const rows = useMemo((): RankRow[] => {
    return dimCodes
      .map((c) => {
        const dwellings = cube.at("dwellings", { dim, code: c.code, year: effectiveYear });
        const share = cube.at("share", { dim, code: c.code, year: effectiveYear });
        const shareByYear = cube.series("share", "year", { dim, code: c.code });
        return {
          code: c.code,
          label: c.label,
          households: dwellings ?? 0,
          share: share ?? 0,
          shareByAge: shareByYear.map((v) => v ?? 0),
        } satisfies RankRow;
      })
      .filter((r) => r.households > 0 || r.share > 0)
      .sort((a, b) => b.share - a.share || b.households - a.households);
  }, [dimCodes, cube, dim, effectiveYear]);

  const total = rows.reduce((n, r) => n + r.households, 0);
  const dimLabel = formDims.find((d) => d.code === dim)?.label ?? dim;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[280px] shrink-0 max-lg:w-full">
        <h2 className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-faint">
          切り口
        </h2>
        <Segmented
          label="形態の切り口"
          options={DIMS.map((d) => ({ value: d.value, label: d.label }))}
          value={dim}
          onChange={setDim}
        />
        <p className="mt-4 px-2 text-[10.5px] leading-relaxed text-faint">
          {dim === "vacancy"
            ? "空き家総数に占める種類別の割合。2013・2018・2023年。"
            : dim === "size"
              ? "居住室の畳数階級。居住世帯あり住宅の構成。"
              : "居住世帯あり住宅に占める構成比。"}
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{dimLabel}</h1>
            <p className="tnum shrink-0 text-[13px] text-muted">
              {total > 0 ? `${int.format(total)}戸` : ""}
              {rows[0] && (
                <span className="ml-2 text-[12px]">
                  首位 {rows[0].label} {pct.format(rows[0].share * 100)}%
                </span>
              )}
            </p>
          </div>
          <YearSelect years={yearPool} value={effectiveYear} onChange={setYear} />
        </header>

        <TypeRanking rows={rows} ageIndex={null} />

        <p className="mt-5 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          右端の折れ線は調査年ごとの構成比。空き家種類は2023年にコード定義が変わったが、表示は意味で揃えている。
        </p>
      </main>
    </div>
  );
}
