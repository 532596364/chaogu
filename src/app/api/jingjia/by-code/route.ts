import { NextResponse } from "next/server";
import type { Collection, Document } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

const dbName = process.env.MONGODB_DB || "chaogu";
const collectionName = "jingjia";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") || "").trim();
  const code = (searchParams.get("code") || "").trim();
  const type = (searchParams.get("type") || "").trim();
  const exclude = (searchParams.get("exclude") || "").trim() === "1";
  const days = Number(searchParams.get("days") || "0");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date is required (YYYY-MM-DD)." },
      { status: 400 }
    );
  }
  if (!code) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }
  if (!Number.isFinite(days) || days < 1 || days > 10) {
    return NextResponse.json(
      { error: "days must be between 1 and 10." },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const baseMatch: Record<string, unknown> = {};

    if (type && type !== "全部") {
      baseMatch.type = type;
    }

    const dates = await getRecentDates(collection, baseMatch, date, days);
    if (!dates.length) {
      return NextResponse.json({ date, days, code, items: [] });
    }

    const match: Record<string, unknown> = {
      ...baseMatch,
      create_date: { $in: dates },
      code,
    };

    if (exclude) {
      match.$nor = [
        { code: /^\s*(SH688|SZ300|SZ301)/i },
        { name: /^\s*(SH688|SZ300|SZ301)/i },
        { name: /ST/i },
      ];
    }

    const items = await collection
      .find(match, {
        projection: { _id: 0, code: 1, name: 1, create_date: 1 },
      })
      .sort({ create_date: -1 })
      .toArray();

    return NextResponse.json({ date, days, code, items });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load code list." },
      { status: 500 }
    );
  }
}

async function getRecentDates(
  collection: Collection<Document>,
  baseMatch: Record<string, unknown>,
  baseDate: string,
  days: number
) {
  const match: Record<string, unknown> = {
    ...baseMatch,
    create_date: { $lte: baseDate },
  };

  const dates = await collection
    .aggregate<{ date: string }>([
      { $match: match },
      { $group: { _id: "$create_date" } },
      { $sort: { _id: -1 } },
      { $limit: days },
      { $project: { _id: 0, date: "$_id" } },
    ])
    .toArray();

  return dates.map((item) => item.date).filter(Boolean);
}
