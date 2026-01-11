"use client";

import { Button, Checkbox, DatePicker, Input } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

type JingjiaRow = {
  code: string;
  name: string;
  type: string;
  create_date: string;
};

type FetchState = "idle" | "loading" | "error";

export default function JingjiaListPage() {
  const [date, setDate] = useState(() => getLocalDate());
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [items, setItems] = useState<JingjiaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<FetchState>("idle");
  const [message, setMessage] = useState("");
  const [excludeEnabled, setExcludeEnabled] = useState(true);
  const [queryKey, setQueryKey] = useState(() => ({
    date: getLocalDate(),
    exclude: true,
    code: "",
    name: "",
  }));

  useEffect(() => {
    const loadList = async () => {
      setState("loading");
      setMessage("");

      try {
        const url = new URL("/api/jingjia/by-date", window.location.origin);
        url.searchParams.set("date", queryKey.date);
        if (queryKey.exclude) {
          url.searchParams.set("exclude", "1");
        }
        if (queryKey.code) {
          url.searchParams.set("code", queryKey.code);
        }
        if (queryKey.name) {
          url.searchParams.set("name", queryKey.name);
        }

        const response = await fetch(url.toString());
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "查询失败");
        }

        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setState("idle");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "查询失败");
      }
    };

    if (queryKey.date || queryKey.code || queryKey.name) {
      loadList();
    }
  }, [queryKey]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            竞价数据列表
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            选择日期后，展示当天录入的竞价数据。共 {total} 条。
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
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
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                代码
              </label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="支持模糊匹配"
                className="mt-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                名称
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="支持模糊匹配"
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Checkbox
              checked={excludeEnabled}
              onChange={(event) => setExcludeEnabled(event.target.checked)}
            >
              排除 SH688、SZ300、SZ301，且名称不含 ST
            </Checkbox>
            <Button
              onClick={() =>
                setQueryKey({ date, exclude: excludeEnabled, code, name })
              }
              disabled={!date && !code && !name}
              loading={state === "loading"}
              type="primary"
              className="w-full sm:w-32"
            >
              查询
            </Button>
          </div>
        </div>

        {state === "error" ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">代码</th>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">竞价类型</th>
                <th className="px-4 py-3 font-medium">创建日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.length ? (
                items.map((item, index) => (
                  <tr key={`${item.code}-${index}`} className="text-zinc-800">
                    <td className="px-4 py-3">{item.code}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">{item.create_date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-sm text-zinc-400"
                    colSpan={4}
                  >
                    {state === "loading" ? "加载中..." : "暂无数据"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getLocalDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}
