"use client";
import { Card, Space, Typography } from "antd";
import ApexCharts from "apexcharts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TypeTemperature } from "@/types";

type ChartPoint = {
  date: string;
  type: string;
  value: number;
};

const CHART_COLORS =  ['#FF9800', '#546E7A', '#66DA26','#2E93fA' , '#E91E63' , '#E91E63', ];

function buildChart(
  list: TypeTemperature[],
  series: Array<[keyof TypeTemperature, string]>
) {
  const points: ChartPoint[] = [];
  for (const item of list) {
    for (const [key, label] of series) {
      points.push({
        date: item.create_date,
        type: label,
        value: Number(item[key]) || 0,
      });
    }
  }
  return points;
}

function buildSeries(points: ChartPoint[]) {
  const seriesMap = new Map<string, { x: string; y: number }[]>();
  for (const point of points) {
    const items = seriesMap.get(point.type) ?? [];
    items.push({ x: point.date, y: point.value });
    seriesMap.set(point.type, items);
  }
  return Array.from(seriesMap.entries()).map(([name, data]) => ({ name, data }));
}

export default function TemperatureDetailPage() {
  const [list, setList] = useState<TypeTemperature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/temperature");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "查询失败");
        }
        setList(Array.isArray(data?.list) ? data.list : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "查询失败");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const sorted = useMemo(() => {
    return [...list]
      .filter((item) => Boolean(item.create_date))
      .sort((a, b) => a.create_date.localeCompare(b.create_date));
  }, [list]);

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 320,
        toolbar: { show: false },
        animations: { enabled: true },
      },
      colors: CHART_COLORS,
      dataLabels: {
        enabled: true,
        formatter: (value: number) => Math.round(value).toString(),
        style: { fontSize: "11px", fontWeight: 600 },
        background: { enabled: false },
      },
      stroke: { curve: "smooth", width: [2, 1.6, 1.6] },
      fill: { opacity: 0.2, type: "solid" },
      xaxis: { type: "category", title: { text: "日期" } },
      yaxis: { title: { text: "数值" } },
      legend: { position: "top" },
      tooltip: { shared: true, intersect: false },
    }),
    []
  );

  // const chart1 = useMemo(
  //   () =>
  //     buildChart(sorted, [
  //       ["nums_of_1_days", "抢筹1天"],
  //       ["emotional_temperature", "情绪温度"],
  //     ]),
  //   [sorted]
  // );

  const chart1 = useMemo(() => {
    const points = buildChart(sorted, [
      ["nums_of_1_days", "抢筹1天"],
      ["emotional_temperature", "情绪温度"],
    ]);
    return points.map((point) =>
      point.type === "抢筹1天" ? { ...point, value: Math.round(point.value / 4) } : point
    );
  }, [sorted]);

  const chart2 = useMemo(() => {
    const points = buildChart(sorted, [
      ["nums_of_2_days", "抢筹2天"],
      ["emotional_temperature", "情绪温度"],
    ]);
    return points.map((point) =>
      point.type === "抢筹2天" ? { ...point, value: Math.round(point.value * 1.5) } : point
    );
  }, [sorted]);

  const chart3 = useMemo(() => {
    const points: ChartPoint[] = [];
    for (const item of sorted) {
      const ratio =
        item.nums_of_jingjia > 0
          ? Math.round((item.nums_of_up_stop * 1000) / item.nums_of_jingjia)
          : 0;
      points.push({
        date: item.create_date,
        type: "涨停数*100/竞价数",
        value: Number.isFinite(ratio) ? ratio : 0,
      });
      points.push({
        date: item.create_date,
        type: "情绪温度",
        value: Number(item.emotional_temperature) || 0,
      });
    }
    return points;
  }, [sorted]);

  // const chart4 = useMemo(
  //   () =>
  //     buildChart(sorted, [
  //       ["nums_of_3_days", "抢筹3天"],
  //       ["emotional_temperature", "情绪温度"],
  //     ]),
  //   [sorted]
  // );
  const chart4 = useMemo(() => {
    const points = buildChart(sorted, [
      ["nums_of_3_days", "抢筹3天"],
      ["emotional_temperature", "情绪温度"],
    ]);
    return points.map((point) =>
      point.type === "抢筹3天" ? { ...point, value: Math.round(point.value * 6) } : point
    );
  }, [sorted]);

  const chart1Ref = useRef<HTMLDivElement | null>(null);
  const chart2Ref = useRef<HTMLDivElement | null>(null);
  const chart3Ref = useRef<HTMLDivElement | null>(null);
  const chart4Ref = useRef<HTMLDivElement | null>(null);

  const chart1Series = useMemo(() => buildSeries(chart1), [chart1]);
  const chart2Series = useMemo(() => buildSeries(chart2), [chart2]);
  const chart3Series = useMemo(() => buildSeries(chart3), [chart3]);
  const chart4Series = useMemo(() => buildSeries(chart4), [chart4]);

  useEffect(() => {
    const instances: ApexCharts[] = [];
    if (chart1Ref.current) {
      const chart = new ApexCharts(chart1Ref.current, {
        ...chartOptions,
        series: chart1Series,
      });
      chart.render();
      instances.push(chart);
    }
    if (chart2Ref.current) {
      const chart = new ApexCharts(chart2Ref.current, {
        ...chartOptions,
        series: chart2Series,
      });
      chart.render();
      instances.push(chart);
    }
    if (chart3Ref.current) {
      const chart = new ApexCharts(chart3Ref.current, {
        ...chartOptions,
        series: chart3Series,
      });
      chart.render();
      instances.push(chart);
    }
    if (chart4Ref.current) {
      const chart = new ApexCharts(chart4Ref.current, {
        ...chartOptions,
        series: chart4Series,
      });
      chart.render();
      instances.push(chart);
    }

    return () => {
      instances.forEach((chart) => chart.destroy());
    };
  }, [chartOptions, chart1Series, chart2Series, chart3Series, chart4Series]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e4e7ec)] px-6 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <Space direction="vertical" size={20} className="w-full">
          <div>
            <Typography.Title level={3} className="!mb-1">
              温度详情
            </Typography.Title>
            <Typography.Text type="secondary">
              基于 jingjia_tongji 的抢筹与情绪温度面积图。
            </Typography.Text>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <Card loading={loading} className="rounded-2xl">
            <Typography.Text strong>涨停数*100/竞价数 + 情绪温度</Typography.Text>
            <div className="mt-3" ref={chart3Ref} />
          </Card>
          <Card loading={loading} className="rounded-2xl">
            <Typography.Text strong>抢筹1天 + 情绪温度</Typography.Text>
            <div className="mt-3" ref={chart1Ref} />
          </Card>

          <Card loading={loading} className="rounded-2xl">
            <Typography.Text strong>抢筹2天 + 情绪温度</Typography.Text>
            <div className="mt-3" ref={chart2Ref} />
          </Card>
          <Card loading={loading} className="rounded-2xl">
            <Typography.Text strong>抢筹3天 + 情绪温度</Typography.Text>
            <div className="mt-3" ref={chart4Ref} />
          </Card>
        </Space>
      </div>
    </div>
  );
}
