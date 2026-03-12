import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { COLLECTIONS, DB_NAME_DEFAULT } from "@/shared/contants";
import type { TypeFivedaysItems } from "@/types";

export const runtime = "nodejs";

const dbName = process.env.MONGODB_DB || DB_NAME_DEFAULT;
const collectionName = COLLECTIONS.FIVEDAYS_ITEMS;

type FivedaysDoc = TypeFivedaysItems & {
  id: string;
  created_at: Date;
  updated_at: Date;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = (searchParams.get("name") || "").trim();
    const code = (searchParams.get("code") || "").trim();
    const pageParam = (searchParams.get("page") || "").trim();
    const pageSizeParam = (searchParams.get("pageSize") || "").trim();
    const page = pageParam ? Number(pageParam) : 1;
    const pageSize = pageSizeParam ? Number(pageSizeParam) : 10;
    if (!Number.isFinite(page) || page < 1) {
      return NextResponse.json(
        { error: "page 必须是大于等于 1 的数字。" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 200) {
      return NextResponse.json(
        { error: "pageSize 必须是 1-200 的数字。" },
        { status: 400 }
      );
    }
    const query: Record<string, unknown> = {};
    if (name) {
      query.name = { $regex: escapeRegex(name), $options: "i" };
    }
    if (code) {
      query.code = { $regex: escapeRegex(code), $options: "i" };
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const collection = db.collection<FivedaysDoc>(collectionName);
    const [list, total] = await Promise.all([
      collection
        .find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      collection.countDocuments(query),
    ]);

    const items = list.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      filter_date: item.filter_date,
      next_day_sign: item.next_day_sign,
      three_days_sign: item.three_days_sign,
      five_days_sign: item.five_days_sign,
      ten_days_sign: item.ten_days_sign,
      twenty_days_sign: item.twenty_days_sign,
      forty_days_sign: item.forty_days_sign,
    }));

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    return NextResponse.json(
      { error: "查询失败，请稍后重试。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const filter_date =
      typeof body?.filter_date === "string" ? body.filter_date.trim() : "";

    if (!name || !code || !filter_date) {
      return NextResponse.json(
        { error: "name、code、filter_date 为必填项。" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const objectId = new ObjectId();
    const now = new Date();
    const doc: FivedaysDoc = {
      id: objectId.toString(),
      name,
      code,
      filter_date,
      next_day_sign:
        typeof body?.next_day_sign === "string" ? body.next_day_sign.trim() : "",
      three_days_sign:
        typeof body?.three_days_sign === "string"
          ? body.three_days_sign.trim()
          : "",
      five_days_sign:
        typeof body?.five_days_sign === "string"
          ? body.five_days_sign.trim()
          : "",
      ten_days_sign:
        typeof body?.ten_days_sign === "string" ? body.ten_days_sign.trim() : "",
      twenty_days_sign:
        typeof body?.twenty_days_sign === "string"
          ? body.twenty_days_sign.trim()
          : "",
      forty_days_sign:
        typeof body?.forty_days_sign === "string"
          ? body.forty_days_sign.trim()
          : "",
      created_at: now,
      updated_at: now,
    };

    await db.collection(collectionName).insertOne({
      _id: objectId,
      ...doc,
    });

    return NextResponse.json({ item: doc });
  } catch (error) {
    return NextResponse.json(
      { error: "插入失败，请稍后重试。" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "id 为必填项。" }, { status: 400 });
    }

    const updateFields: Partial<FivedaysDoc> = {};
    for (const key of [
      "name",
      "code",
      "filter_date",
      "next_day_sign",
      "three_days_sign",
      "five_days_sign",
      "ten_days_sign",
      "twenty_days_sign",
      "forty_days_sign",
    ] as const) {
      if (typeof body?.[key] === "string") {
        updateFields[key] = body[key].trim();
      }
    }

    if (!Object.keys(updateFields).length) {
      return NextResponse.json(
        { error: "没有可更新的字段。" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const result = await db.collection<FivedaysDoc>(collectionName).findOneAndUpdate(
      { id },
      {
        $set: {
          ...updateFields,
          updated_at: new Date(),
        },
      },
      { returnDocument: "after" }
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
    const id = (searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id 为必填项。" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const result = await db.collection(collectionName).deleteOne({ id });

    return NextResponse.json({ deletedCount: result.deletedCount });
  } catch (error) {
    return NextResponse.json(
      { error: "删除失败，请稍后重试。" },
      { status: 500 }
    );
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
