/**
 * 大気・水質ビュー。公害の種類別苦情件数の推移。
 */

import { use, useMemo, useState } from "react";
import { loadKind } from "../data/chunks.ts";
import { primaryKinds } from "../data/hierarchy.ts";
import { TypeList } from "../components/TypeList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { TrendStack, type Panel, type Point } from "../components/TrendStack.tsx";
import { useWidth } from "../hooks/useWidth.ts";
import { useUrlState } from "../hooks/useUrlState.ts";
import { KIND_FROM, KIND_TO } from "../../lib/data/labels.ts";

const int = new Intl.NumberFormat("ja-JP");
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const GROUPS = [
  { value: "focus", label: "大気・水質" },
  { value: "all", label: "主な種類" },
] as const;

type GroupId = (typeof GROUPS)[number]["value"];

function dense(yearsAsc: number[], values: (number | null)[]): Point[] {
  const byYear = new Map(yearsAsc.map((y, i) => [y, values[i] ?? null]));
  return Array.from({ length: KIND_TO - KIND_FROM + 1 }, (_, i) => ({
    year: KIND_FROM + i,
    value: byYear.get(KIND_FROM + i) ?? null,
  }));
}

export function KindView() {
  const { codes, cube, years } = use(loadKind());
  const yearsAsc = useMemo(() => cube.codes("year").map(Number), [cube]);
  const base = useMemo(() => primaryKinds(codes), [codes]);

  const [group, setGroup] = useUrlState<GroupId>("group", "focus", (v) =>
    GROUPS.some((g) => g.value === v),
  );

  const visible = useMemo(() => {
    if (group === "focus") return base.filter((c) => c.parent === "air_water");
    return base;
  }, [base, group]);

  const defaultCode =
    visible.find((c) => c.code === "air")?.code ?? visible[0]?.code ?? codes[0]!.code;

  const [year, setYear] = useUrlState("year", years[0]!, (v) => years.includes(v));
  const [code, setCode] = useUrlState<string>("kind", defaultCode, (v) =>
    codes.some((c) => c.code === v),
  );
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();

  const current = visible.find((c) => c.code === code) ?? visible[0] ?? codes[0]!;
  const activeCode = current.code;

  const rows = useMemo(
    () =>
      visible.map((c) => ({
        type: c,
        values: cube.series("share", "year", { code: c.code }),
      })),
    [visible, cube],
  );

  const yearShare = useMemo(() => {
    return [...visible]
      .map((c) => ({
        code: c.code,
        label: c.label,
        share: cube.at("share", { code: c.code, year }) ?? 0,
        cases: cube.at("cases", { code: c.code, year }) ?? 0,
      }))
      .sort((a, b) => b.share - a.share);
  }, [visible, cube, year]);

  const panels = useMemo((): Panel[] => {
    return [
      {
        key: "share",
        title: "合計に占める割合",
        unit: "構成比",
        format: (v) => `${pct.format(v * 100)}%`,
        formatTick: (v) => `${pct.format(v * 100)}%`,
        series: [
          {
            key: "share",
            label: "",
            points: dense(yearsAsc, cube.series("share", "year", { code: activeCode })),
            emphasized: true,
          },
        ],
      },
      {
        key: "cases",
        title: "件数",
        unit: "件",
        format: (v) => `${int.format(Math.round(v))}件`,
        formatTick: (v) =>
          v >= 10_000
            ? `${int.format(Math.round(v / 10_000))}万`
            : int.format(Math.round(v)),
        series: [
          {
            key: "cases",
            label: "",
            points: dense(yearsAsc, cube.series("cases", "year", { code: activeCode })),
            emphasized: true,
          },
        ],
      },
    ];
  }, [cube, activeCode, yearsAsc]);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[288px] shrink-0 max-lg:w-full">
        <div className="px-2 pb-3">
          <Segmented
            options={[...GROUPS]}
            value={group}
            onChange={(v) => {
              setGroup(v);
              const next =
                v === "focus"
                  ? codes.find((c) => c.parent === "air_water")
                  : primaryKinds(codes)[0];
              if (next) setCode(next.code);
            }}
            label="表示"
          />
        </div>
        <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          公害の種類
        </h2>
        <div className="max-h-[50vh] overflow-y-auto lg:max-h-[calc(100dvh-14rem)]">
          <TypeList
            rows={rows}
            years={yearsAsc}
            selected={activeCode}
            onSelect={setCode}
          />
        </div>
        <div className="mt-3 border-t border-rule px-2 pt-2">
          <p className="pb-1 text-[10.5px] text-faint">{year}年度の構成（合計比）</p>
          <ul className="flex flex-col gap-0.5 text-[11.5px]">
            {yearShare.map((r) => (
              <li key={r.code} className="flex justify-between gap-2 tnum">
                <span className={r.code === activeCode ? "font-semibold" : "text-muted"}>
                  {r.label}
                </span>
                <span className="text-faint">{pct.format(r.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{current.label}</h1>
            <p
              className={`tnum text-[13px] ${hoverYear === null ? "text-faint" : "text-ink"}`}
            >
              {hoverYear ?? Number(year)}年度
            </p>
          </div>
          <YearSelect years={years} value={year} onChange={setYear} />
        </header>

        <div ref={ref} className="min-h-[280px]">
          {width > 0 && (
            <TrendStack
              panels={panels}
              domain={[KIND_FROM, KIND_TO]}
              width={width}
              hoverYear={hoverYear}
              onHoverYear={setHoverYear}
            />
          )}
        </div>

        <p className="mt-5 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          公害苦情調査の種類別推移（1972–2016年度）。割合は各年の合計件数に対する比。
          2017年度以降の種類別は e-Stat 推移表に無く、総数のみ時代ビューで延長。
        </p>
      </main>
    </div>
  );
}
