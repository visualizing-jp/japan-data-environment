/**
 * 地域ビュー。都道府県 × 住宅指標の相対比較。
 */

import { use, useMemo, useState } from "react";
import { loadGeo } from "../data/chunks.ts";
import { geoMetrics } from "../data/hierarchy.ts";
import { AreaTypes, type StandoutRow } from "../components/AreaTypes.tsx";
import { TypePicker, type PickerRow } from "../components/TypePicker.tsx";
import { TileMap, type Tile } from "../components/TileMap.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const STANDOUT = 5;

const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const areaFmt = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatValue(metric: string, value: number | null): string {
  if (value === null) return "データなし";
  if (metric === "floor_area") return `${areaFmt.format(value)}㎡`;
  return `${pct.format(value * 100)}%`;
}

function Headline({
  ranked,
  metric,
  national,
}: {
  ranked: (Tile & { relative: number })[];
  metric: string;
  national: number | null;
}) {
  const certain = ranked.filter((t) => t.certain);
  if (certain.length === 0) {
    return (
      <span className="text-muted">
        どの県も全国との差が小さい。全国 {formatValue(metric, national)}。
      </span>
    );
  }
  const top = certain[0]!;
  const bottom = certain.at(-1)!;
  if (certain.length === 1 || top.code === bottom.code) {
    return (
      <span className="text-muted">
        目立つのは{" "}
        <span className="font-semibold text-ink">
          {top.label} {one.format(top.relative)}
        </span>
      </span>
    );
  }
  return (
    <span className="text-muted">
      最も高い{" "}
      <span className="font-semibold text-ink">
        {top.label} {one.format(top.relative)}
      </span>
      {"  ／  最も低い "}
      <span className="font-semibold text-ink">
        {bottom.label} {one.format(bottom.relative)}
      </span>
    </span>
  );
}

export function GeoView() {
  const { metrics, areas, cube, years } = use(loadGeo());
  const selectable = useMemo(() => geoMetrics(metrics), [metrics]);

  const [year, setYear] = useUrlState("year", years[0]!, (v) => years.includes(v));
  const [metric, setMetric] = useUrlState<string>("metric", "vacant", (v) =>
    selectable.some((c) => c.code === v),
  );
  const [area, setArea] = useUrlState<string>("area", "", (v) =>
    v === "" || areas.some((a) => a.code === v && a.code !== "00000"),
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const prefectures = useMemo(() => areas.slice(1), [areas]);
  const currentMeta = selectable.find((m) => m.code === metric) ?? selectable[0]!;

  const values = cube.series("value", "area", { metric, year });
  const relatives = cube.series("relative", "area", { metric, year });
  const national = values[0] ?? null;

  const picker = useMemo((): PickerRow[] => {
    return selectable.map((m) => {
      const v = cube.at("value", { metric: m.code, year, area: "00000" });
      const magnitude =
        v === null ? 0 : m.code === "floor_area" ? v * 100 : Math.round(v * 10000);
      return {
        code: m.code,
        label: m.label,
        households: magnitude,
        display: formatValue(m.code, v),
      };
    });
  }, [selectable, cube, year]);

  const tiles = useMemo(
    (): Tile[] =>
      prefectures.map((a, i) => {
        const relative = relatives[i + 1] ?? null;
        const value = values[i + 1] ?? null;
        const certain =
          relative !== null && value !== null && Math.abs(relative - 1) >= 0.05;
        return {
          code: a.code,
          label: a.label,
          relative,
          households: value === null ? null : Math.round(value * 10000),
          certain,
        };
      }),
    [prefectures, relatives, values],
  );

  const ranked = useMemo(
    () =>
      tiles
        .filter((t): t is Tile & { relative: number } => t.relative !== null)
        .sort((a, b) => b.relative - a.relative),
    [tiles],
  );

  const rankOf = useMemo(
    () => new Map(ranked.map((t, i) => [t.code, i + 1])),
    [ranked],
  );

  const areaIndex = area === "" ? -1 : areas.findIndex((a) => a.code === area);
  const pinnedTile = areaIndex < 1 ? undefined : tiles.find((t) => t.code === area);

  const standout = useMemo(() => {
    const empty = {
      high: [] as StandoutRow[],
      low: [] as StandoutRow[],
      moreHigh: 0,
      moreLow: 0,
    };
    if (areaIndex < 1) return empty;

    const mid = selectable.flatMap((m) => {
      const relative = cube.at("relative", {
        metric: m.code,
        year,
        area: areas[areaIndex]!.code,
      });
      const value = cube.at("value", {
        metric: m.code,
        year,
        area: areas[areaIndex]!.code,
      });
      if (relative === null || value === null) return [];
      if (Math.abs(relative - 1) < 0.08) return [];
      return [
        {
          code: m.code,
          label: m.label,
          households: Math.round(value * 10000),
          relative,
        } satisfies StandoutRow,
      ];
    });

    const highAll = mid.filter((r) => r.relative > 1).sort((a, b) => b.relative - a.relative);
    const lowAll = mid.filter((r) => r.relative < 1).sort((a, b) => a.relative - b.relative);
    return {
      high: highAll.slice(0, STANDOUT),
      low: lowAll.slice(0, STANDOUT),
      moreHigh: Math.max(0, highAll.length - STANDOUT),
      moreLow: Math.max(0, lowAll.length - STANDOUT),
    };
  }, [areaIndex, selectable, cube, year, areas]);

  const focusCode = hovered ?? (area === "" ? null : area);
  const focus = focusCode === null ? undefined : tiles.find((t) => t.code === focusCode);
  const focusValue =
    focusCode === null
      ? null
      : (values[areas.findIndex((a) => a.code === focusCode)] ?? null);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <h2 className="flex items-baseline justify-between px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          <span>
            指標 <span className="font-normal">{picker.length}</span>
          </span>
          <span className="font-normal">全国</span>
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TypePicker rows={picker} selected={metric} onSelect={setMetric} />
        </div>
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          地図の色は全国比。率・面積とも同じ相対尺度。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-[19px] font-semibold tracking-tight">
              {currentMeta.label}
            </h1>
            <p className="tnum shrink-0 text-[13px] text-muted">
              全国 {formatValue(metric, national)}
            </p>
          </div>
          <YearSelect years={years} value={year} onChange={setYear} />
        </header>

        <p className="tnum min-h-9 pb-4 text-[12.5px]">
          {focus !== undefined ? (
            <>
              <span className="font-semibold">{focus.label}</span>
              <span className="text-muted">
                {` ${formatValue(metric, focusValue)}`}
                {focus.relative === null
                  ? " データなし"
                  : ` · 全国の${one.format(focus.relative)}倍 · ${ranked.length}県中${rankOf.get(focus.code)}位`}
              </span>
            </>
          ) : (
            <Headline ranked={ranked} metric={metric} national={national} />
          )}
        </p>

        <TileMap
          tiles={tiles}
          hovered={hovered}
          onHover={setHovered}
          pinned={area === "" ? null : area}
          onPin={(code) => setArea(code ?? "")}
        />

        {pinnedTile !== undefined && (
          <AreaTypes
            areaLabel={pinnedTile.label}
            high={standout.high}
            low={standout.low}
            moreHigh={standout.moreHigh}
            moreLow={standout.moreLow}
            selected={metric}
            onSelect={setMetric}
            onClear={() => setArea("")}
          />
        )}

        <p className="mt-5 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          数値は県の指標値を全国値で割った相対値。全国が1。地図は模式図。色の尺度は指標で共通（全国の1/1.5〜1.5倍）。
        </p>
      </main>
    </div>
  );
}
