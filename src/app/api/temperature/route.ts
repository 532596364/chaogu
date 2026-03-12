import dayjs from "dayjs";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { DATE_FORMAT, DB_NAME_DEFAULT } from "@/shared/contants";
import type { TypeTemperature } from "@/types";

export const runtime = "nodejs";

const dbName = process.env.MONGODB_DB || DB_NAME_DEFAULT;
const TONGJI_COLLECTION = "jingjia_tongji";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date")?.trim() || "";

    if (date && !dayjs(date, DATE_FORMAT, true).isValid()) {
      return NextResponse.json(
        { error: "日期格式不正确，请使用 YYYY-MM-DD。" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const filter = date ? { create_date: date } : {};
    const list = await db
      .collection<TypeTemperature>(TONGJI_COLLECTION)
      .find(filter)
      .sort({ create_date: -1 })
      .toArray();

    return NextResponse.json({ list });
  } catch (error) {
    return NextResponse.json(
      { error: "查询失败，请稍后重试。" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const date = typeof body?.create_date === "string" ? body.create_date.trim() : "";

    if (!dayjs(date, DATE_FORMAT, true).isValid()) {
      return NextResponse.json(
        { error: "日期格式不正确，请使用 YYYY-MM-DD。" },
        { status: 400 }
      );
    }

    const updateFields = sanitizeUpdate(body);
    if (!Object.keys(updateFields).length) {
      return NextResponse.json(
        { error: "没有可更新的字段。" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const result = await db.collection<TypeTemperature>(TONGJI_COLLECTION).findOneAndUpdate(
      { create_date: date },
      {
        $set: {
          ...updateFields,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ item: result.value });
  } catch (error) {
    return NextResponse.json(
      { error: "更新失败，请稍后重试。" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("create_date")?.trim() || "";

    if (!dayjs(date, DATE_FORMAT, true).isValid()) {
      return NextResponse.json(
        { error: "日期格式不正确，请使用 YYYY-MM-DD。" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const result = await db
      .collection<TypeTemperature>(TONGJI_COLLECTION)
      .deleteOne({ create_date: date });

    return NextResponse.json({ deletedCount: result.deletedCount });
  } catch (error) {
    return NextResponse.json(
      { error: "删除失败，请稍后重试。" },
      { status: 500 }
    );
  }
}

function sanitizeUpdate(body: Record<string, unknown>) {
  const fields: Array<keyof TypeTemperature> = [
    "nums_of_1_days",
    "nums_of_2_days",
    "nums_of_3_days",
    "nums_of_4_days",
    "nums_of_5_days",
    "nums_of_jingjia",
    "nums_of_up_stop",
    "stop_height",
    "emotional_temperature",
    "guess_temperature",
  ];
  const update: Partial<TypeTemperature> = {};

  for (const key of fields) {
    const value = body?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      update[key] = value;
      continue;
    }
    if (value === null) {
      update[key] = null as unknown as number;
    }
  }

  return update;
}
