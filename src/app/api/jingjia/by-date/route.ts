import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

const dbName = process.env.MONGODB_DB || "chaogu";
const collectionName = "jingjia";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") || "").trim();
  const exclude = (searchParams.get("exclude") || "").trim() === "1";
  const code = (searchParams.get("code") || "").trim();
  const name = (searchParams.get("name") || "").trim();

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date must be YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (!date && !code && !name) {
    return NextResponse.json(
      { error: "At least one filter is required." },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const query: Record<string, unknown> = {};
    if (date) {
      query.create_date = date;
    }
    if (exclude) {
      query.code = {
        $type: "string",
        $ne: "",
        $not: /^(SH688|SZ300|SZ301)/,
      };
      query.name = { $not: /ST/ };
    }
    if (code) {
      query.code = {
        ...(typeof query.code === "object" ? query.code : {}),
        $regex: escapeRegex(code),
        $options: "i",
      };
    }
    if (name) {
      query.name = {
        ...(typeof query.name === "object" ? query.name : {}),
        $regex: escapeRegex(name),
        $options: "i",
      };
    }
    const collection = db.collection(collectionName);
    const [items, total] = await Promise.all([
      collection
        .find(query, {
          projection: { _id: 0, code: 1, name: 1, type: 1, create_date: 1 },
        })
        .sort({ code: 1 })
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({ date, total, items });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load list data." },
      { status: 500 }
    );
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
