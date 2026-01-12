import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import "xlsx/dist/cpexcel.full";
import iconv from "iconv-lite";
import { insertJingjiaRows } from "@/lib/jingjia";
import {
  ALLOWED_COLLECTIONS,
  COLLECTIONS,
  CREATE_TIME_SUFFIX,
} from "@/shared/contants";
import type { TypeOfBiddingItem } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file field." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isLegacyXls = file.name.toLowerCase().endsWith(".xls");
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      codepage: isLegacyXls ? 936 : undefined,
      cellDates: true,
    });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json(
        { error: "No worksheet found in the file." },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    const normalizedRows = rows.map((row) => normalizeRow(row));
    const createDateInput = formData.get("create_date");
    const createDate =
      typeof createDateInput === "string" ? createDateInput.trim() : "";
    const collectionInput = formData.get("collection");
    const collectionName =
      typeof collectionInput === "string" && collectionInput.trim()
        ? collectionInput.trim()
        : COLLECTIONS.JINGJIA;

    if (!ALLOWED_COLLECTIONS.has(collectionName)) {
      return NextResponse.json(
        { error: "Invalid collection name." },
        { status: 400 }
      );
    }
    const mappedRows = mapRowsToBiddingItems(normalizedRows, createDate);

    if (!mappedRows.length) {
      return NextResponse.json(
        { error: "No rows found in the worksheet." },
        { status: 400 }
      );
    }

    const result = await insertJingjiaRows(
      mappedRows,
      {
        sourceFileName: file.name,
        sheetName,
        uploadedAt: new Date(),
      },
      collectionName
    );

    return NextResponse.json({
      insertedCount: result.insertedCount,
      sheetName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to import Excel file." },
      { status: 500 }
    );
  }
}

function normalizeRow(row: Record<string, unknown>) {
  const entries = Object.entries(row).map(([key, value]) => [
    fixMojibake(key),
    normalizeValue(value),
  ]);
  return Object.fromEntries(entries);
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return fixMojibake(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => [
      fixMojibake(key),
      normalizeValue(item),
    ]);
    return Object.fromEntries(entries);
  }

  return value;
}

function fixMojibake(input: string) {
  if (!/[^\x00-\x7f]/.test(input)) {
    return input;
  }

  // If the string is Latin-1 mojibake, decode it as GBK and keep it when CJK appears.
  const buffer = Buffer.from(input, "latin1");
  const decoded = iconv.decode(buffer, "gbk");
  if (/[\u4e00-\u9fff]/.test(decoded)) {
    return decoded;
  }

  return input;
}

const headerMap: Record<string, keyof TypeOfBiddingItem> = {
  id: "id",
  序号: "id",
  代码: "code",
  股票代码: "code",
  名称: "name",
  股票名称: "name",
  异动类型: "type",
  异动说明: "desc",
  竞价评级: "bidding_rate",
  匹配价: "match_price",
  竞价涨幅: "bidding_amount_of_increase",
  竞价量: "bidding_quantity",
  竞价金额: "bidding_money",
  未匹配量: "unmatch_quantity",
  未匹配金额: "unmatch_money",
  昨日成交量: "yesterday_quantity",
  昨日换手: "yesterday_change_hands",
  换手: "change_hands",
  昨收: "yesterday_close_pirce",
  现价: "current_price",
  涨幅: "amount_of_increase",
  总手: "total_volume",
  金额: "money",
  量比: "quantity_relative_ratio",
  创建时间: "create_time",
};

const numericFields = new Set<keyof TypeOfBiddingItem>([
  "match_price",
  "bidding_amount_of_increase",
  "bidding_quantity",
  "bidding_money",
  "unmatch_quantity",
  "unmatch_money",
  "yesterday_quantity",
  "yesterday_change_hands",
  "change_hands",
  "yesterday_close_pirce",
  "current_price",
  "amount_of_increase",
  "total_volume",
  "money",
  "quantity_relative_ratio",
]);

function mapRowsToBiddingItems(
  rows: Record<string, unknown>[],
  createDate: string
) {
  return rows
    .map((row, index) => mapRowToBiddingItem(row, index, createDate))
    .filter((item) => item.code || item.name);
}

function mapRowToBiddingItem(
  row: Record<string, unknown>,
  index: number,
  createDate: string
): TypeOfBiddingItem & { create_date?: string } {
  const item: TypeOfBiddingItem & { create_date?: string } = {
    id: "",
    code: "",
    name: "",
    type: "",
    desc: "",
    bidding_rate: "",
    match_price: 0,
    bidding_amount_of_increase: 0,
    bidding_quantity: 0,
    bidding_money: 0,
    unmatch_quantity: 0,
    unmatch_money: 0,
    yesterday_quantity: 0,
    yesterday_change_hands: 0,
    change_hands: 0,
    yesterday_close_pirce: 0,
    current_price: 0,
    amount_of_increase: 0,
    total_volume: 0,
    money: 0,
    quantity_relative_ratio: 0,
    create_time: "",
  };

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = mapHeader(rawKey);
    if (!key) {
      continue;
    }

    if (numericFields.has(key)) {
      item[key] = toNumber(rawValue) as never;
      continue;
    }

    item[key] = toText(rawValue) as never;
  }

  if (!item.id) {
    item.id = item.code || item.name || String(index + 1);
  }

  if (createDate) {
    item.create_time = `${createDate} ${CREATE_TIME_SUFFIX}`;
    item.create_date = createDate;
  }

  return item;
}

function mapHeader(rawKey: string) {
  const normalized = normalizeHeader(rawKey);
  return headerMap[normalized];
}

function normalizeHeader(rawKey: string) {
  return rawKey
    .trim()
    .replace(/\s+/g, "")
    .replace(/（.*?）|\(.*?\)/g, "")
    .replace(/[：:]/g, "")
    .replace(/[％%]/g, "");
}

function toText(value: unknown) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/[，,]/g, "")
      .replace(/[％%]/g, "")
      .trim();
    if (!cleaned) {
      return 0;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
