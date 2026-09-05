/**
 * 時代ビュー。住宅ストックの件数・率・構成比の長期推移。
 */

import { use, useMemo, useState } from "react";
import { loadEra } from "../data/chunks.ts";
import { listMetrics } from "../data/hierarchy.ts";
import { MARKS, NOTES } from "../data/annotations.ts";
import { TypeList } from "../components/TypeList.tsx";
import { TrendStack, type Panel, type Point } from "../components/TrendStack.tsx";
import { useWidth } from "../hooks/useWidth.ts";
import { useUrlState } from "../hooks/useUrlState.ts";

const FROM = 1978;
const TO = 2023;

const int = new Intl.NumberFormat("ja-JP");
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const areaFmt = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function dense(years: number[], values: (number | null)[]): Point[] {
  const byYear = new Map(years.map((y, i) => [y, values[i] ?? null]));
  return Array.from({ length: TO - FROM + 1 }, (_, i) => ({
    year: FROM + i,
    value: byYear.get(FROM + i) ?? null,
  }));
}

export function EraView() {
  const { metrics, cube, years } = use(loadEra());
  const selectable = useMemo(() => listMetrics(metrics), [metrics]);
  const defaultMetric = selectable.find((m) => m.code === "vacant")?.code ?? selectable[0]!.code;

  const [metric, setMetric] = useUrlState<string>("metric", defaultMetric, (v) =>
    selectable.some((c) => c.code === v),
  );
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();

  const current = selectable.find((c) => c.code === metric)!;
  const isArea = metric === "floor_area";

  const rows = useMemo(
    () =>
      selectable.map((c) => ({
        type: c,
        values:
          c.code === "floor_area"
            ? cube.series("rate", "year", { metric: c.code })
            : cube.series("rate", "year", { metric: c.code }).some((v) => v !== null)
              ? cube.series("rate", "year", { metric: c.code })
              : cube.series("share", "year", { metric: c.code }),
      })),
    [selectable, cube],
  );

  const panels = useMemo((): Panel[] => {
    const at = (measure: string) => cube.series(measure, "year", { metric });

    if (isArea) {
      return [
        {
          key: "area",
          title: "1住宅当たり延べ面積",
          unit: "㎡",
          format: (v) => `${areaFmt.format(v)}㎡`,
          formatTick: (v) => areaFmt.format(v),
          series: [
            {
              key: "area",
              label: "",
              points: dense(years, at("rate")),
              emphasized: true,
              markSparseSamples: true,
            },
          ],
        },
      ];
    }

    const panels: Panel[] = [
      {
        key: "dwellings",
        title: "住宅数",
        unit: "戸",
        format: (v) => int.format(Math.round(v)),
        formatTick: (v) =>
          v >= 1_000_000 ? `${int.format(Math.round(v / 10_000))}万` : int.format(v),
        series: [
          {
            key: "dwellings",
            label: "",
            points: dense(years, at("dwellings")),
            emphasized: true,
            markSparseSamples: true,
          },
        ],
      },
    ];

    const rates = at("rate");
    if (rates.some((v) => v !== null)) {
      panels.push({
        key: "rate",
        title: "率",
        unit:
          metric === "vacant"
            ? "総住宅数に占める割合"
            : "居住世帯あり住宅に占める割合",
        format: (v) => `${pct.format(v * 100)}%`,
        formatTick: (v) => `${pct.format(v * 100)}%`,
        series: [
          {
            key: "rate",
            label: "",
            points: dense(years, rates),
            emphasized: true,
            markSparseSamples: true,
          },
        ],
      });
    } else {
      panels.push({
        key: "share",
        title: "構成比",
        unit: "分母に占める割合",
        format: (v) => `${pct.format(v * 100)}%`,
        formatTick: (v) => `${pct.format(v * 100)}%`,
        series: [
          {
            key: "share",
            label: "",
            points: dense(years, at("share")),
            emphasized: true,
            markSparseSamples: true,
          },
        ],
      });
    }

    return panels;
  }, [cube, metric, years, isArea]);

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
          折れ線は率（または構成比）の推移。高さは項目ごとに正規化してある。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{current.label}</h1>
            <p
              className={`tnum text-[13px] ${hoverYear === null ? "text-faint" : "text-ink"}`}
            >
              {hoverYear ?? TO}年
            </p>
          </div>
        </header>

        <div ref={ref} className="min-h-[420px]">
          {width > 0 && (
            <TrendStack
              panels={panels}
              domain={[FROM, TO]}
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
                term: `${m.year}年 · ${m.label}`,
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
