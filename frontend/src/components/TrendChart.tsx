"use client";

import React, { useState } from "react";

export interface SeasonalTrend {
  month: string;
  month_num: number;
  count: number;
}

interface TrendChartProps {
  trends: SeasonalTrend[];
}

const ALL_MONTHS = [
  { name: "Jan", num: 1 },
  { name: "Feb", num: 2 },
  { name: "Mar", num: 3 },
  { name: "Apr", num: 4 },
  { name: "May", num: 5 },
  { name: "Jun", num: 6 },
  { name: "Jul", num: 7 },
  { name: "Aug", num: 8 },
  { name: "Sep", num: 9 },
  { name: "Oct", num: 10 },
  { name: "Nov", num: 11 },
  { name: "Dec", num: 12 },
];

export default function TrendChart({ trends }: TrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  // Map API data onto a 12-month array
  const trendMap = new Map<number, number>();
  trends.forEach((t) => trendMap.set(t.month_num, t.count));

  const monthlyData = ALL_MONTHS.map((m) => ({
    month: m.name,
    monthNum: m.num,
    count: trendMap.get(m.num) || 0,
  }));

  const totalRecorded = monthlyData.reduce((acc, curr) => acc + curr.count, 0);
  const rawMax = Math.max(...monthlyData.map((d) => d.count), 0);
  // Calculate nice upper bound for Y axis
  const maxY = rawMax > 0 ? Math.ceil(rawMax * 1.25) : 5;

  // SVG coordinate dimensions
  const svgWidth = 650;
  const svgHeight = 260;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 40;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const xStep = chartWidth / (monthlyData.length - 1);

  // Compute point coordinates
  const points = monthlyData.map((d, i) => {
    const x = padLeft + i * xStep;
    const y = padTop + chartHeight - (d.count / maxY) * chartHeight;
    return { ...d, x, y };
  });

  // SVG Area path & Line path
  const linePath = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, "");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${padTop + chartHeight} L ${points[0].x},${
          padTop + chartHeight
        } Z`
      : "";

  // Y-axis grid ticks (0, 25%, 50%, 75%, 100%)
  const yTicks = [0, Math.round(maxY * 0.25), Math.round(maxY * 0.5), Math.round(maxY * 0.75), maxY];
  // Filter unique ticks to prevent overlapping labels
  const uniqueYTicks = Array.from(new Set(yTicks));

  return (
    <div className="w-full">
      {/* Chart Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-400">
          Annual distribution of observations across calendar months.
        </div>
        <div className="flex items-center bg-gray-950 p-1 rounded-lg border border-gray-800 text-xs">
          <button
            type="button"
            onClick={() => setChartType("area")}
            className={`px-3 py-1 rounded transition-colors ${
              chartType === "area"
                ? "bg-emerald-600 text-white font-medium shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Line View
          </button>
          <button
            type="button"
            onClick={() => setChartType("bar")}
            className={`px-3 py-1 rounded transition-colors ${
              chartType === "bar"
                ? "bg-emerald-600 text-white font-medium shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Bar View
          </button>
        </div>
      </div>

      {totalRecorded === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center bg-gray-950/50 rounded-xl border border-gray-800 text-gray-400">
          <span className="text-3xl mb-2">📉</span>
          <p className="text-sm font-medium text-gray-300">No trend observations recorded</p>
          <p className="text-xs text-gray-500 mt-1">Observations will populate the seasonal curve automatically.</p>
        </div>
      ) : (
        <div className="relative bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-axis Labels */}
            {uniqueYTicks.map((val) => {
              const yPos = padTop + chartHeight - (val / maxY) * chartHeight;
              return (
                <g key={`y-tick-${val}`}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={svgWidth - padRight}
                    y2={yPos}
                    stroke="#1f2937"
                    strokeDasharray={val === 0 ? "none" : "3,3"}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 10}
                    y={yPos + 4}
                    textAnchor="end"
                    className="text-[11px] fill-gray-500 font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Render Area / Line Chart */}
            {chartType === "area" && (
              <>
                <path d={areaPath} fill="url(#areaGradient)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Render Bar Chart */}
            {chartType === "bar" &&
              points.map((pt, idx) => {
                const barWidth = Math.max(12, xStep * 0.45);
                const barX = pt.x - barWidth / 2;
                const barHeight = (pt.count / maxY) * chartHeight;
                const barY = padTop + chartHeight - barHeight;

                return (
                  <rect
                    key={`bar-${pt.month}-${idx}`}
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={Math.max(2, barHeight)}
                    rx="3"
                    fill={hoveredIdx === idx ? "#34d399" : "url(#barGradient)"}
                    className="transition-colors cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}

            {/* X-axis Labels & Interactive Points */}
            {points.map((pt, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <g key={`x-tick-${pt.month}-${idx}`}>
                  {/* Vertical hover guide */}
                  {isHovered && (
                    <line
                      x1={pt.x}
                      y1={padTop}
                      x2={pt.x}
                      y2={padTop + chartHeight}
                      stroke="#34d399"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.6"
                    />
                  )}

                  {/* Month Text Label on X Axis */}
                  <text
                    x={pt.x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    className={`text-[12px] transition-colors ${
                      isHovered
                        ? "fill-emerald-400 font-bold"
                        : pt.count > 0
                        ? "fill-gray-300 font-medium"
                        : "fill-gray-600"
                    }`}
                  >
                    {pt.month}
                  </text>

                  {/* Interactive Dot for Area mode */}
                  {chartType === "area" && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : pt.count > 0 ? 4 : 2.5}
                      fill={isHovered ? "#34d399" : pt.count > 0 ? "#10b981" : "#374151"}
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip Float */}
          {hoveredIdx !== null && (
            <div
              className="absolute pointer-events-none bg-gray-900 border border-emerald-600/60 shadow-xl rounded-lg px-3 py-1.5 text-xs z-20 transform -translate-x-1/2 -translate-y-full transition-all"
              style={{
                left: `${(points[hoveredIdx].x / svgWidth) * 100}%`,
                top: `${(points[hoveredIdx].y / svgHeight) * 100}%`,
                marginTop: "-12px",
              }}
            >
              <div className="font-bold text-emerald-400">
                {points[hoveredIdx].month}
              </div>
              <div className="text-gray-200">
                {points[hoveredIdx].count} observation{points[hoveredIdx].count !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
