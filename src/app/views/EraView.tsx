/**
 * 時代ビュー。下水道・水洗化・公害苦情の長期推移。
 */

import { use, useMemo, useState } from "react";
import { loadEra } from "../data/chunks.ts";
import { listMetrics } from "../data/hierarchy.ts";
import { MARKS, NOTES } from "../data/annotations.ts";
import { TypeList } from "../components/TypeList.tsx";
import { TrendStack, type Panel, type Point } from "../components/TrendStack.tsx";
import { useWidth } from "../hooks/useWidth.ts";
import { useUrlState } from "../hooks/useUrlState.ts";
import { ERA_FROM, ERA_TO, METRICS } from "../../lib/data/labels.ts";
import type { CubeView } from "../data/cube.ts";

const int = new Intl.NumberFormat("ja-JP");
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function dense(years: number[], values: (number | null)[]): Point[] {
  const byYear = new Map(years.map((y, i) => [y, values[i] ?? null]));
  return Array.from({ length: ERA_TO - ERA_FROM + 1 }, (_, i) => ({
    year: ERA_FROM + i,
    value: byYear.get(ERA_FROM + i) ?? null,
  }));
}

function metricKind(code: string) {
  return METRICS.find((m) => m.code === code)?.kind ?? "rate";
}

function seriesFor(cube: CubeView, code: string): (number | null)[] {
  const kind = metricKind(code);
  if (kind === "cases") return cube.series("cases", "year", { metric: code });
  return cube.series("rate", "year", { metric: code });
}

export function EraView() {
  const { metrics, cube, years } = use(loadEra());
  const selectable = useMemo(() => listMetrics(metrics), [metrics]);
  const defaultMetric =
    selectable.find((m) => m.code === "sewerage")?.code ?? selectable[0]!.code;

  const [metric, setMetric] = useUrlState<string>("metric", defaultMetric, (v) =>
    selectable.some((c) => c.code === v),
  );
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();

  const current = selectable.find((c) => c.code === metric)!;
  const kind = metricKind(metric);

  const rows = useMemo(
    () =>
      selectable.map((c) => ({
        type: c,
        values: seriesFor(cube, c.code),
      })),
    [selectable, cube],
  );

  const panels = useMemo((): Panel[] => {
    if (kind === "cases") {
      return [
        {
          key: "cases",
          title: current.label,
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
              points: dense(years, cube.series("cases", "year", { metric })),
              emphasized: true,
            },
          ],
        },
      ];
    }

    if (kind === "per_capita") {
      return [
        {
          key: "per_capita",
          title: current.label,
          unit: "件/10万人",
          format: (v) => `${one.format(v)}`,
          formatTick: (v) => one.format(v),
          series: [
            {
              key: "per_capita",
              label: "",
              points: dense(years, cube.series("rate", "year", { metric })),
              emphasized: true,
            },
          ],
        },
      ];
    }

    return [
      {
        key: "rate",
        title: current.label,
        unit: "％",
        format: (v) => `${pct.format(v * 100)}%`,
        formatTick: (v) => `${pct.format(v * 100)}%`,
        series: [
          {
            key: "rate",
            label: "",
            points: dense(years, cube.series("rate", "year", { metric })),
            emphasized: true,
          },
        ],
      },
    ];
  }, [cube, metric, years, kind, current.label]);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[288px] shrink-0 max-lg:w-full">
        <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          指標
        </h2>
        <div className="max-h-[70vh] overflow-y-auto lg:max-h-[calc(100dvh-8rem)]">
          <TypeList rows={rows} years={years} selected={metric} onSelect={setMetric} />
        </div>
        <p className="px-2 pt-3 text-[10.5px] leading-relaxed text-faint">
          1975年度以降。下水道は定義改定で 2012–2015 の全国値が欠測。苦情件数は濃度そのものではない。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{current.label}</h1>
            <p
              className={`tnum text-[13px] ${hoverYear === null ? "text-faint" : "text-ink"}`}
            >
              {hoverYear ?? ERA_TO}年度
            </p>
          </div>
        </header>

        <div ref={ref} className="min-h-[280px]">
          {width > 0 && (
            <TrendStack
              panels={panels}
              domain={[ERA_FROM, ERA_TO]}
              width={width}
              hoverYear={hoverYear}
              onHoverYear={setHoverYear}
            />
          )}
        </div>

        <section className="mt-6 border-t border-rule pt-4">
          <h2 className="text-[11px] font-semibold tracking-wide text-faint">注記</h2>
          <dl className="mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              ...MARKS.map((m) => ({
                key: String(m.year),
                term: `${m.year}年度 · ${m.label}`,
                detail: m.detail,
              })),
              ...NOTES.map((n) => ({
                key: n.term,
                term: n.term,
                detail: n.detail,
              })),
            ].map((n) => (
              <div key={n.key}>
                <dt className="tnum text-[12px] font-semibold">{n.term}</dt>
                <dd className="text-[11.5px] leading-relaxed text-muted">{n.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
