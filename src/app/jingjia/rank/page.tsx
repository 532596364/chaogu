"use client";

import { Button, Checkbox, DatePicker, Modal, Table, Select, Switch } from "antd";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

type RankItem = {
  code: string;
  name: string;
  count: number;
};

type RankBucket = {
  days: number;
  items: RankItem[];
};

type FetchState = "idle" | "loading" | "error";

type DetailItem = {
  code: string;
  name: string;
  create_date: string;
};

export default function JingjiaRankPage() {
  const [date, setDate] = useState(() => getLocalDate());
  const [type, setType] = useState("全部");
  const [types, setTypes] = useState<string[]>([]);
  const [buckets, setBuckets] = useState<RankBucket[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [message, setMessage] = useState("");
  const [excludeEnabled, setExcludeEnabled] = useState(true);
  const [includeSpecialEnabled, setIncludeSpecialEnabled] = useState(false);
  const [exactCountOnly, setExactCountOnly] = useState(false);
  const [queryKey, setQueryKey] = useState(() => ({
    date: getLocalDate(),
    type: "全部",
    exclude: true,
    includeSpecial: false,
  }));
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailItems, setDetailItems] = useState<DetailItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const typeOptions = useMemo(() => ["全部", ...types], [types]);
  const detailColumns = useMemo(
    () => [
      { title: "代码", dataIndex: "code", key: "code" },
      { title: "名称", dataIndex: "name", key: "name" },
      { title: "创建日期", dataIndex: "create_date", key: "create_date" },
    ],
    []
  );
  const displayBuckets = useMemo(() => {
    if (!exactCountOnly) {
      return buckets;
    }
    return buckets.map((bucket) => ({
      ...bucket,
      items: bucket.items.filter((item) => item.count === bucket.days),
    }));
  }, [buckets, exactCountOnly]);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const response = await fetch("/api/jingjia/types");
        const data = await response.json();
        if (response.ok && Array.isArray(data.types)) {
          setTypes(data.types);
        }
      } catch (error) {
        setTypes([]);
      }
    };

    loadTypes();
  }, []);

  useEffect(() => {
    const loadRank = async () => {
      setState("loading");
      setMessage("");

      try {
        const url = new URL("/api/jingjia/rank", window.location.origin);
        url.searchParams.set("date", queryKey.date);
        if (queryKey.type && queryKey.type !== "全部") {
          url.searchParams.set("type", queryKey.type);
        }
        if (queryKey.exclude) {
          url.searchParams.set("exclude", "1");
        }
        if (queryKey.includeSpecial) {
          url.searchParams.set("includeSpecial", "1");
        }
        if (queryKey.includeSpecial) {
          url.searchParams.set("includeSpecial", "1");
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "查询失败");
        }

        setBuckets(data.buckets || []);
        setState("idle");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "查询失败");
      }
    };

    if (queryKey.date) {
      loadRank();
    }
  }, [queryKey]);

  const openDetail = async (input: {
    days: number;
    code: string;
    name: string;
  }) => {
    setDetailOpen(true);
    setDetailTitle(`${input.days}天内 ${input.name || input.code} 出现记录`);
    setDetailLoading(true);
    setDetailItems([]);

    try {
      const url = new URL("/api/jingjia/by-code", window.location.origin);
      url.searchParams.set("date", queryKey.date);
      url.searchParams.set("days", String(input.days));
      url.searchParams.set("code", input.code);
      if (queryKey.type && queryKey.type !== "全部") {
        url.searchParams.set("type", queryKey.type);
      }
      if (queryKey.exclude) {
        url.searchParams.set("exclude", "1");
      }
      if (queryKey.includeSpecial) {
        url.searchParams.set("includeSpecial", "1");
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "查询失败");
      }

      setDetailItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadCodes = async (bucket: RankBucket) => {
    if (!queryKey.date) {
      return;
    }

    try {
      const url = new URL("/api/jingjia/rank", window.location.origin);
      url.searchParams.set("date", queryKey.date);
      url.searchParams.set("days", String(bucket.days));
      url.searchParams.set("limit", "0");
      if (queryKey.type && queryKey.type !== "全部") {
        url.searchParams.set("type", queryKey.type);
      }
      if (queryKey.exclude) {
        url.searchParams.set("exclude", "1");
      }
      if (queryKey.includeSpecial) {
        url.searchParams.set("includeSpecial", "1");
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "下载失败");
      }

      const items = Array.isArray(data.buckets) ? data.buckets[0]?.items : [];
      const codes = items.map((item: RankItem) => item.code).filter(Boolean);
      if (!codes.length) {
        return;
      }

      const content = codes.join("\r\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${bucket.days}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      return;
    }
  };

  const downloadExclusiveCounts = async (days: number) => {
    if (!queryKey.date) {
      return;
    }
    const nextDays = days + 1;
    try {
      const baseUrl = new URL("/api/jingjia/rank", window.location.origin);
      baseUrl.searchParams.set("date", queryKey.date);
      baseUrl.searchParams.set("limit", "0");
      if (queryKey.type && queryKey.type !== "全部") {
        baseUrl.searchParams.set("type", queryKey.type);
      }
      if (queryKey.exclude) {
        baseUrl.searchParams.set("exclude", "1");
      }

      const currentUrl = new URL(baseUrl.toString());
      currentUrl.searchParams.set("days", String(days));
      const nextUrl = new URL(baseUrl.toString());
      nextUrl.searchParams.set("days", String(nextDays));

      const [currentRes, nextRes] = await Promise.all([
        fetch(currentUrl.toString()),
        fetch(nextUrl.toString()),
      ]);
      const currentData = await currentRes.json();
      const nextData = await nextRes.json();

      if (!currentRes.ok || !nextRes.ok) {
        throw new Error("下载失败");
      }

      const currentItems = Array.isArray(currentData.buckets)
        ? currentData.buckets[0]?.items || []
        : [];
      const nextItems = Array.isArray(nextData.buckets)
        ? nextData.buckets[0]?.items || []
        : [];

      const nextSet = new Set(
        nextItems
          .filter((item: RankItem) => item.count === nextDays)
          .map((item: RankItem) => item.code)
      );

      const codes = currentItems
        .filter(
          (item: RankItem) =>
            item.count === days && item.code && !nextSet.has(item.code)
        )
        .map((item: RankItem) => item.code);

      if (!codes.length) {
        return;
      }

      const content = codes.join("\r\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${days}${days}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      return;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            竞价抢筹排行榜
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            选择日期和竞价类型，按近 10 天到近 1 天统计代码出现次数。
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-700">
              查询日期
            </label>
            <DatePicker
              allowClear
              value={date ? dayjs(date, "YYYY-MM-DD") : null}
              onChange={(value) =>
                setDate(value ? value.format("YYYY-MM-DD") : "")
              }
              className="mt-2 w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-700">
              竞价类型
            </label>
            <Select
              value={type}
              onChange={(value) => setType(value)}
              options={typeOptions.map((option) => ({
                value: option,
                label: option,
              }))}
              className="mt-2 w-full"
            />
          </div>
          <Checkbox
            checked={excludeEnabled}
            onChange={(event) => setExcludeEnabled(event.target.checked)}
            className="sm:pb-2"
          >
            排除 SH688、SZ300、SZ301，且名称不含 ST
          </Checkbox>
          <Checkbox
            checked={includeSpecialEnabled}
            onChange={(event) => setIncludeSpecialEnabled(event.target.checked)}
            className="sm:pb-2"
          >
            仅包含 SH688、SZ300、SZ301
          </Checkbox>
          <div className="flex items-center gap-2 sm:pb-2">
            <Switch checked={exactCountOnly} onChange={setExactCountOnly} />
            <span className="text-sm text-zinc-700">只展示出现 x 次</span>
          </div>
          <Button
            onClick={() =>
              setQueryKey({
                date,
                type,
                exclude: excludeEnabled,
                includeSpecial: includeSpecialEnabled,
              })
            }
            disabled={!date}
            loading={state === "loading"}
            type="primary"
            className="w-full sm:w-32"
          >
            查询
          </Button>
        </div>

        {state === "error" ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {displayBuckets.map((bucket) => (
            <div
              key={bucket.days}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">
                  {bucket.days}天抢筹排行榜
                </h2>
                <div className="flex items-center gap-1">
                  {bucket.days === 1 || bucket.days === 2 ? (
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => downloadCodes(bucket)}
                    />
                  ) : null}
                  {bucket.days === 2 || bucket.days === 3 ? (
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => downloadExclusiveCounts(bucket.days)}
                    />
                  ) : null}
                </div>
              </div>
              <ol className="mt-4 divide-y divide-zinc-100 text-sm text-zinc-800">
                {bucket.items.length ? (
                  bucket.items.map((item, index) => (
                    <li
                      key={`${item.code}-${index}`}
                      className="flex items-center justify-between py-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openDetail({
                            days: bucket.days,
                            code: item.code,
                            name: item.name,
                          })
                        }
                        className="flex flex-1 items-center justify-between gap-3 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-xs text-zinc-400">
                            {index + 1}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-zinc-900">
                              {item.name || item.code}
                            </span>
                            {item.name && item.code ? (
                              <span className="text-xs text-zinc-400">
                                {item.code}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className="text-zinc-500">{item.count}</span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="py-3 text-xs text-zinc-400">暂无数据</li>
                )}
              </ol>
            </div>
          ))}
        </div>

        {state === "loading" ? (
          <div className="text-sm text-zinc-500">加载中...</div>
        ) : null}
      </div>

      <Modal
        open={detailOpen}
        title={detailTitle}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={560}
      >
        <Table
          columns={detailColumns}
          dataSource={detailItems}
          loading={detailLoading}
          pagination={false}
          rowKey={(record) => `${record.code}-${record.create_date}`}
          size="middle"
        />
      </Modal>
    </div>
  );
}

function getLocalDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}
