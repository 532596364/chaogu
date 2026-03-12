"use client";

import {
  Alert,
  Button,
  Card,
  DatePicker,
  Select,
  Space,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  COLLECTIONS,
  COLLECTION_OPTIONS,
  CREATE_TIME_SUFFIX,
  DATE_FORMAT,
  DB_NAME_DEFAULT,
} from "@/shared/contants";

type UploadState = "idle" | "uploading" | "done" | "error";
type CollectionName = (typeof COLLECTION_OPTIONS)[number]["value"];

export default function JingjiaUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [createDate, setCreateDate] = useState(() => getLocalDate());
  const [collection, setCollection] = useState<CollectionName>(
    COLLECTIONS.JINGJIA
  );

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
      formData.append("collection", collection);

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
          <Space vertical={true} size={20} className="w-full">
            <div>
              <Typography.Title level={3} className="!mb-1">
                竞价数据导入
              </Typography.Title>
              <Typography.Text type="secondary">
                上传 Excel 文件后，将写入数据库{" "}
                <Typography.Text strong>{DB_NAME_DEFAULT}</Typography.Text> 的{" "}
                <Typography.Text strong>{collection}</Typography.Text> 集合。
              </Typography.Text>
            </div>
            <Space size={8} wrap>
              <Link href="/jingjia/list">
                <Button>竞价列表</Button>
              </Link>
              <Link href="/jingjia/rank">
                <Button>抢筹排行</Button>
              </Link>
              <Link href="/jingjia/5daysItem">
                <Button>5daysItem</Button>
              </Link>
            </Space>

            <form onSubmit={onSubmit}>
              <Space vertical={true} size={16} className="w-full">
                <div>
                  <Typography.Text strong>选择数据表</Typography.Text>
                  <Select<CollectionName>
                    className="mt-2 w-full"
                    options={COLLECTION_OPTIONS}
                    value={collection}
                    onChange={(value) => setCollection(value)}
                  />
                </div>
                <div>
                  <Typography.Text strong>
                    选择日期（时间固定为 {CREATE_TIME_SUFFIX}）
                  </Typography.Text>
                  <DatePicker
                    allowClear
                    value={createDate ? dayjs(createDate, DATE_FORMAT) : null}
                    onChange={(value) =>
                      setCreateDate(value ? value.format(DATE_FORMAT) : "")
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
