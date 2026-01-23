"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Form,
  Modal,
  InputNumber,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Line } from "@ant-design/charts";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { DATE_FORMAT } from "@/shared/contants";
import type { TypeTemperature } from "@/types";

type ActionState = "idle" | "updating" | "updated" | "queried" | "error";

export default function TemperaturePage() {
  const [date, setDate] = useState(() => getLocalDate());
  const [state, setState] = useState<ActionState>("idle");
  const [message, setMessage] = useState("");
  const [list, setList] = useState<TypeTemperature[]>([]);
  const [querying, setQuerying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TypeTemperature | null>(null);
  const [form] = Form.useForm<TypeTemperature>();
  const [saving, setSaving] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);

  const seriesOptions = useMemo(
    () => [
      { key: "nums_of_1_days", label: "抢筹1天" },
      { key: "nums_of_2_days", label: "抢筹2天" },
      { key: "nums_of_3_days", label: "抢筹3天" },
      { key: "nums_of_4_days", label: "抢筹4天" },
      { key: "nums_of_5_days", label: "抢筹5天" },
      { key: "nums_of_jingjia", label: "竞价数" },
      { key: "nums_of_up_stop", label: "涨停数" },
      { key: "emotional_temperature", label: "情绪温度" },
      { key: "guess_temperature", label: "猜测温度" },
    ],
    []
  );

  const selectedSet = useMemo(() => {
    if (!selectedSeries.length) {
      return new Set(seriesOptions.map((item) => item.key));
    }
    return new Set(selectedSeries);
  }, [selectedSeries, seriesOptions]);

  const updateData = async () => {
    if (!date) {
      setState("error");
      setMessage("请先选择日期。");
      return;
    }

    setState("updating");
    setMessage("");

    try {
      const response = await fetch("/api/temperature/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "更新失败");
      }

      setState("updated");
      setMessage(
        `更新完成：${date} 总数 ${data.counts?.nums_of_jingjia ?? 0}，` +
          `1天 ${data.counts?.nums_of_1_days ?? 0}，` +
          `2天 ${data.counts?.nums_of_2_days ?? 0}，` +
          `3天 ${data.counts?.nums_of_3_days ?? 0}，` +
          `4天 ${data.counts?.nums_of_4_days ?? 0}，` +
          `5天 ${data.counts?.nums_of_5_days ?? 0}。`
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "更新失败，请重试。");
    }
  };

  const queryData = async () => {
    setQuerying(true);
    setMessage("");
    try {
      const url = date ? `/api/temperature?date=${date}` : "/api/temperature";
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "查询失败");
      }
      setList(Array.isArray(data?.list) ? data.list : []);
      setState("queried");
      setMessage(`已查询到 ${Array.isArray(data?.list) ? data.list.length : 0} 条记录。`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "查询失败，请重试。");
    } finally {
      setQuerying(false);
    }
  };

  const columns: ColumnsType<TypeTemperature> = [
    { title: "日期", dataIndex: "create_date" },
    { title: "抢筹1天", dataIndex: "nums_of_1_days" },
    { title: "抢筹2天", dataIndex: "nums_of_2_days" },
    { title: "抢筹3天", dataIndex: "nums_of_3_days" },
    { title: "抢筹4天", dataIndex: "nums_of_4_days" },
    { title: "抢筹5天", dataIndex: "nums_of_5_days" },
    { title: "竞价数", dataIndex: "nums_of_jingjia" },
    { title: "涨停数", dataIndex: "nums_of_up_stop" },
    { title: "情绪温度", dataIndex: "emotional_temperature" },
    { title: "猜测温度", dataIndex: "guess_temperature" },
    {
      title: "操作",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            onClick={() => {
              setEditing(record);
              form.setFieldsValue(record);
              setDrawerOpen(true);
            }}
          >
            编辑
          </Button>
          <Button size="small" danger onClick={() => deleteRow(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const formItems = useMemo(
    () => [
      { label: "抢筹1天", name: "nums_of_1_days" },
      { label: "抢筹2天", name: "nums_of_2_days" },
      { label: "抢筹3天", name: "nums_of_3_days" },
      { label: "抢筹4天", name: "nums_of_4_days" },
      { label: "抢筹5天", name: "nums_of_5_days" },
      { label: "竞价数", name: "nums_of_jingjia" },
      { label: "涨停数", name: "nums_of_up_stop" },
      { label: "情绪温度", name: "emotional_temperature" },
      { label: "猜测温度", name: "guess_temperature" },
    ],
    []
  );

  const chartData = useMemo(() => {
    const sorted = [...list].sort((a, b) =>
      a.create_date.localeCompare(b.create_date)
    );
    return sorted.flatMap((item) =>
      seriesOptions
        .filter((s) => selectedSet.has(s.key))
        .map((s) => ({
          date: item.create_date,
          type: s.label,
          value: Number(item[s.key as keyof TypeTemperature]) || 0,
        }))
    );
  }, [list, seriesOptions, selectedSet]);

  const chartConfig = useMemo(
    () => ({
      data: chartData,
      xField: "date",
      yField: "value",
      seriesField: "type",
      height: 320,
      autoFit: true,
      legend: { position: "top" },
      smooth: true,
      tooltip: { showMarkers: false },
      xAxis: { title: { text: "日期" } },
      yAxis: { title: { text: "数值" } },
    }),
    [chartData]
  );

  const deleteRow = (record: TypeTemperature) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定删除 ${record.create_date} 的数据吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          const response = await fetch(
            `/api/temperature?create_date=${record.create_date}`,
            { method: "DELETE" }
          );
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error || "删除失败");
          }
          setList((prev) =>
            prev.filter((item) => item.create_date !== record.create_date)
          );
          setState("updated");
          setMessage(`已删除 ${record.create_date} 的数据。`);
        } catch (error) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "删除失败，请重试。");
        }
      },
    });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const saveEdits = async () => {
    const values = await form.validateFields();
    if (!editing) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/temperature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ create_date: editing.create_date, ...values }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "保存失败");
      }
      const updated = data?.item ?? { ...editing, ...values };
      setList((prev) =>
        prev.map((item) =>
          item.create_date === editing.create_date ? updated : item
        )
      );
      closeDrawer();
      setState("updated");
      setMessage(`已保存 ${editing.create_date} 的修改。`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e4e7ec)] px-6 py-16">
      <div className="mx-auto w-full">
        <Card className="overflow-hidden rounded-3xl border-zinc-200 shadow-lg">
          <Space vertical={true} size={20} className="w-full">
            <div>
              <Typography.Title level={3} className="!mb-1">
                温度数据
              </Typography.Title>
              <Typography.Text type="secondary">
                选择日期后更新数据或查询结果。
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>选择日期</Typography.Text>
              <DatePicker
                allowClear
                value={date ? dayjs(date, DATE_FORMAT) : null}
                onChange={(value) =>
                  setDate(value ? value.format(DATE_FORMAT) : "")
                }
                className="mt-2 w-full"
              />
            </div>
            <Space size={12} className="w-full" wrap>
              <Button
                type="primary"
                className="flex-1 min-w-[140px]"
                onClick={updateData}
                loading={state === "updating"}
              >
                更新数据
              </Button>
              <Button
                className="flex-1 min-w-[140px]"
                onClick={queryData}
                loading={querying}
              >
                查询
              </Button>
            </Space>
            {message ? (
              <Alert
                type={state === "error" ? "error" : "info"}
                showIcon
                message={message}
              />
            ) : null}
            <div className="w-full">
              <Typography.Text strong>图例筛选</Typography.Text>
              <Checkbox.Group
                className="mt-2 flex flex-wrap gap-3"
                options={seriesOptions.map((item) => ({
                  label: item.label,
                  value: item.key,
                }))}
                value={selectedSeries.length ? selectedSeries : undefined}
                onChange={(values) =>
                  setSelectedSeries(values.map((value) => String(value)))
                }
              />
            </div>
            <div className="w-full">
              {chartData.length ? (
                <Line {...chartConfig} />
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                  暂无图表数据
                </div>
              )}
            </div>
            <Table<TypeTemperature>
              rowKey={(record) => record.create_date}
              columns={columns}
              dataSource={list}
              pagination={{ pageSize: 10 }}
              size="middle"
              scroll={{ x: "max-content" }}
            />
          </Space>
        </Card>
      </div>
      <Drawer
        title={`编辑温度数据 ${editing?.create_date ?? ""}`}
        placement="right"
        width={520}
        onClose={closeDrawer}
        open={drawerOpen}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="w-full">
          {formItems.map((item) => (
            <Form.Item  key={item.name} label={item.label} name={item.name}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          ))}
          <Space className="w-full" size={12}>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" onClick={saveEdits} loading={saving}>
              保存
            </Button>
          </Space>
        </Form>
      </Drawer>
    </div>
  );
}

function getLocalDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}
