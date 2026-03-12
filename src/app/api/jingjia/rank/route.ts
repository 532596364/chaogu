import { NextResponse } from "next/server";
import type { Collection, Document } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { COLLECTIONS, DB_NAME_DEFAULT } from "@/shared/contants";

export const runtime = "nodejs";

const dbName = process.env.MONGODB_DB || DB_NAME_DEFAULT;
const collectionName = COLLECTIONS.JINGJIA;

type RankItem = {
  code: string;
  name: string;
  count: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") || "").trim();
  const type = (searchParams.get("type") || "").trim();
  const exclude = (searchParams.get("exclude") || "").trim() === "1";
  const includeSpecial = (searchParams.get("includeSpecial") || "").trim() === "1";
  const daysParam = (searchParams.get("days") || "").trim();
  const limitParam = (searchParams.get("limit") || "").trim();
  const limit = limitParam ? Number(limitParam) : 50;
  const daysValue = daysParam ? Number(daysParam) : null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date is required (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  if (daysParam) {
    if (!Number.isFinite(daysValue) || daysValue < 1 || daysValue > 10) {
      return NextResponse.json(
        { error: "days must be between 1 and 10." },
        { status: 400 }
      );
    }
  }

  if (limitParam && (!Number.isFinite(limit) || limit < 0)) {
    return NextResponse.json(
      { error: "limit must be >= 0." },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const dayBuckets = [];

    const baseMatch: Record<string, unknown> = {};
    if (type && type !== "全部") {
      baseMatch.type = type;
    }
    if (includeSpecial) {
      baseMatch.code = { $type: "string", $regex: /^(SH688|SZ300|SZ301)/i };
    }

    const daysList = daysValue ? [daysValue] : Array.from({ length: 10 }, (_, i) => i + 1);

    for (const days of daysList) {
      const dates = await getRecentDates(
        collection,
        baseMatch,
        date,
        days
      );

      if (!dates.length) {
        dayBuckets.push({ days, items: [] });
        continue;
      }

      const match: Record<string, unknown> = {
        ...baseMatch,
        create_date: { $in: dates },
        code: { $type: "string", $ne: "" },
      };
      if (exclude) {
        match.$nor = [
          { code: /^\s*(SH688|SZ300|SZ301)/i },
          { name: /ST/i },
        ];
      }
      if (includeSpecial) {
        match.code = { $type: "string", $regex: /^(SH688|SZ300|SZ301)/i };
      }

      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: "$code",
            name: { $first: "$name" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
      ];

      if (limit > 0) {
        pipeline.push({ $limit: limit });
      }

      pipeline.push({
        $project: {
          _id: 0,
          code: "$_id",
          name: 1,
          count: 1,
        },
      });

      const items = await collection.aggregate<RankItem>(pipeline).toArray();

      dayBuckets.push({ days, items });
    }

    return NextResponse.json({
      date,
      type: type || "全部",
      buckets: dayBuckets,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load ranking data." },
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
