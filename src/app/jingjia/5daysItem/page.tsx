"use client";

import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  Modal,
  Pagination,
  Space,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { DATE_FORMAT } from "@/shared/contants";
import type { TypeFivedaysItems } from "@/types";

type FetchState = "idle" | "loading" | "error" | "updated";

type FivedaysItem = TypeFivedaysItems & {
  id: string;
};

export default function FivedaysItemPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [list, setList] = useState<FivedaysItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState<FetchState>("idle");
  const [message, setMessage] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FivedaysItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [form] = Form.useForm<FivedaysItem>();
  const requiredFields = useMemo(
    () => new Set(["name", "code", "filter_date"]),
    []
  );

  const formItems = useMemo(
    () => [
      { label: "股票名称", name: "name" },
      { label: "股票代码", name: "code" },
      { label: "筛选时间", name: "filter_date" },
      { label: "隔日正负", name: "next_day_sign" },
      { label: "隔三日正负", name: "three_days_sign" },
      { label: "隔五日正负", name: "five_days_sign" },
      { label: "隔十日正负", name: "ten_days_sign" },
      { label: "隔二十日正负", name: "twenty_days_sign" },
      { label: "隔四十日正负", name: "forty_days_sign" },
    ],
    []
  );

  const loadList = async (nextPage = page, nextPageSize = pageSize) => {
    setQuerying(true);
    setState("loading");
    setMessage("");
    try {
      const url = new URL("/api/fivedays-items", window.location.origin);
      if (code.trim()) {
        url.searchParams.set("code", code.trim());
      }
      if (name.trim()) {
        url.searchParams.set("name", name.trim());
      }
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("pageSize", String(nextPageSize));
      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "查询失败");
      }
      setList(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number.isFinite(data?.total) ? data.total : 0);
      setPage(nextPage);
      setPageSize(nextPageSize);
      setState("idle");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "查询失败");
    } finally {
      setQuerying(false);
    }
  };

  const resetFilters = () => {
    setCode("");
    setName("");
    setList([]);
    setTotal(0);
    setPage(1);
    setPageSize(10);
    setState("idle");
    setMessage("");
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: FivedaysItem) => {
    setEditing(record);
    form.setFieldsValue(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const saveItem = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const response = await fetch("/api/fivedays-items", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...values } : values),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "保存失败");
      }
      const item = data?.item as FivedaysItem | null;
      if (item) {
        setList((prev) => {
          if (editing) {
            return prev.map((row) => (row.id === editing.id ? item : row));
          }
          return [item, ...prev];
        });
      }
      closeDrawer();
      setState("updated");
      setMessage(editing ? "已更新数据。" : "已创建数据。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (record: FivedaysItem) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定删除 ${record.name}(${record.code}) 吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          const response = await fetch(
            `/api/fivedays-items?id=${record.id}`,
            { method: "DELETE" }
          );
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error || "删除失败");
          }
          setList((prev) => prev.filter((item) => item.id !== record.id));
          setState("updated");
          setMessage("已删除数据。");
        } catch (error) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "删除失败");
        }
      },
    });
  };

  const columns: ColumnsType<FivedaysItem> = [
    { title: "股票名称", dataIndex: "name" },
    { title: "股票代码", dataIndex: "code" },
    { title: "筛选时间", dataIndex: "filter_date" },
    { title: "隔日正负", dataIndex: "next_day_sign" },
    { title: "隔三日正负", dataIndex: "three_days_sign" },
    { title: "隔五日正负", dataIndex: "five_days_sign" },
    { title: "隔十日正负", dataIndex: "ten_days_sign" },
    { title: "隔二十日正负", dataIndex: "twenty_days_sign" },
    { title: "隔四十日正负", dataIndex: "forty_days_sign" },
    {
      title: "操作",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space size={8}>
          <Button size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button size="small" danger onClick={() => deleteItem(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              5daysItem 列表
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              按股票名称与代码查询 fivedaysItems 数据。
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                股票名称
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="支持模糊匹配"
                className="mt-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                股票代码
              </label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="支持模糊匹配"
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button onClick={resetFilters}>重置</Button>
            <Button
              onClick={() => loadList(1, pageSize)}
              loading={querying}
              type="primary"
              className="w-full sm:w-32"
            >
              查询
            </Button>
          </div>
          <div className="flex justify-end">
            <Button type="primary" onClick={openCreate}>
              创建
            </Button>
          </div>
        </div>

        {message ? (
          <Alert
            type={state === "error" ? "error" : "info"}
            showIcon
            message={message}
          />
        ) : null}

        <Table<FivedaysItem>
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={list}
          pagination={false}
          size="middle"
          scroll={{ x: "max-content" }}
        />
        <div className="flex justify-end">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            onChange={(nextPage, nextPageSize) =>
              loadList(nextPage, nextPageSize)
            }
          />
        </div>
      </div>

      <Drawer
        title={editing ? "编辑数据" : "创建数据"}
        placement="right"
        width={520}
        onClose={closeDrawer}
        open={drawerOpen}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="w-full">
          {formItems.map((item) => (
            <Form.Item
              key={item.name}
              label={item.label}
              name={item.name}
              rules={[{ required: requiredFields.has(item.name) }]}
              getValueProps={
                item.name === "filter_date"
                  ? (value) => ({
                      value: value ? dayjs(value, DATE_FORMAT) : null,
                    })
                  : undefined
              }
              getValueFromEvent={
                item.name === "filter_date"
                  ? (value) => (value ? value.format(DATE_FORMAT) : "")
                  : undefined
              }
            >
              {item.name === "filter_date" ? (
                <DatePicker allowClear className="w-full" format={DATE_FORMAT} />
              ) : (
                <Input />
              )}
            </Form.Item>
          ))}
          <Space className="w-full" size={12}>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" onClick={saveItem} loading={saving}>
              保存
            </Button>
          </Space>
        </Form>
      </Drawer>
    </div>
  );
}
