"use client";

import { Alert, Button, Card, DatePicker, Space, Typography, Upload } from "antd";
import type { UploadFile } from "antd";
import dayjs from "dayjs";
import { useState, type FormEvent } from "react";

type UploadState = "idle" | "uploading" | "done" | "error";

export default function JingjiaUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [createDate, setCreateDate] = useState(() => getLocalDate());

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedFile = file ?? fileList[0]?.originFileObj ?? null;
    if (!selectedFile) {
      setState("error");
      setMessage("请先选择 Excel 文件。");
      return;
    }

    setState("uploading");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("create_date", createDate);

      const response = await fetch("/api/jingjia", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "上传失败");
      }

      setState("done");
      setMessage(
        `导入成功：${data.insertedCount} 条（sheet: ${data.sheetName}）`
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "上传失败，请重试。"
      );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e4e7ec)] px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Card
          className="overflow-hidden rounded-3xl border-zinc-200 shadow-lg"
        >
          <Space direction="vertical" size={20} className="w-full">
            <div>
              <Typography.Title level={3} className="!mb-1">
                竞价数据导入
              </Typography.Title>
              <Typography.Text type="secondary">
                上传 Excel 文件后，将写入数据库{" "}
                <Typography.Text strong>chaogu</Typography.Text> 的{" "}
                <Typography.Text strong>jingjia</Typography.Text> 集合。
              </Typography.Text>
            </div>

            <form onSubmit={onSubmit}>
              <Space direction="vertical" size={16} className="w-full">
                <div>
                  <Typography.Text strong>
                    选择日期（时间固定为 12:00:00）
                  </Typography.Text>
                  <DatePicker
                    allowClear
                    value={createDate ? dayjs(createDate, "YYYY-MM-DD") : null}
                    onChange={(value) =>
                      setCreateDate(value ? value.format("YYYY-MM-DD") : "")
                    }
                    className="mt-2 w-full"
                  />
                </div>
                <Upload
                  accept=".xls,.xlsx"
                  maxCount={1}
                  fileList={fileList}
                  beforeUpload={() => false}
                  onChange={(info) => {
                    const nextList = info.fileList.slice(-1);
                    setFileList(nextList);
                    const nextFile =
                      nextList[0]?.originFileObj ??
                      info.file.originFileObj ??
                      (info.file as unknown as File);
                    setFile(nextFile ?? null);
                  }}
                  onRemove={() => {
                    setFileList([]);
                    setFile(null);
                  }}
                >
                  <Button className="w-full">选择 Excel 文件</Button>
                </Upload>
                <Button
                  htmlType="submit"
                  type="primary"
                  loading={state === "uploading"}
                  className="w-full"
                >
                  开始导入
                </Button>
              </Space>
            </form>

            {message ? (
              <Alert
                type={state === "error" ? "error" : "success"}
                showIcon
                message={message}
              />
            ) : null}
          </Space>
        </Card>
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
