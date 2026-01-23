import type { Db } from "mongodb";
import dayjs from "dayjs";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { COLLECTIONS, DATE_FORMAT, DB_NAME_DEFAULT } from "@/shared/contants";

export const runtime = "nodejs";

const dbName = process.env.MONGODB_DB || DB_NAME_DEFAULT;
const TONGJI_COLLECTION = "jingjia_tongji";

type UpdateCounts = {
  nums_of_jingjia: number;
  nums_of_1_days: number;
  nums_of_2_days: number;
  nums_of_3_days: number;
  nums_of_4_days: number;
  nums_of_5_days: number;
  create_date: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = typeof body?.date === "string" ? body.date.trim() : "";

    if (!dayjs(date, DATE_FORMAT, true).isValid()) {
      return NextResponse.json(
        { error: "日期格式不正确，请使用 YYYY-MM-DD。" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const totalCount = await countTotalForDate(db, date);
    const counts = {
      nums_of_jingjia: totalCount,
      nums_of_1_days: await countConsecutiveDays(db, date, 1),
      nums_of_2_days: await countConsecutiveDays(db, date, 2),
      nums_of_3_days: await countConsecutiveDays(db, date, 3),
      nums_of_4_days: await countConsecutiveDays(db, date, 4),
      nums_of_5_days: await countConsecutiveDays(db, date, 5),
      create_date: date,
    } satisfies UpdateCounts;

    await db.collection(TONGJI_COLLECTION).updateOne(
      { create_date: date },
      {
        $set: {
          ...counts,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ date, counts });
  } catch (error) {
    return NextResponse.json(
      { error: "更新失败，请稍后重试。" },
      { status: 500 }
    );
  }
}

async function countTotalForDate(db: Db, date: string) {
  const result = await db
    .collection(COLLECTIONS.JINGJIA)
    .aggregate<{ count: number }>([
      {
        $match: {
          create_date: date,
          code: { $ne: "" },
        },
      },
      { $group: { _id: "$code" } },
      { $count: "count" },
    ])
    .toArray();
  return result[0]?.count ?? 0;
}

async function countConsecutiveDays(
  db: Db,
  date: string,
  days: number
) {
  const dateList = await getRecentDates(db, date, days);
  if (dateList.length < days) {
    return 0;
  }
  const pipeline = [
    {
      $match: {
        create_date: { $in: dateList },
        code: { $type: "string", $ne: "" },
        $nor: [{ code: /^\s*(SH688|SZ300|SZ301)/i }, { name: /ST/i }],
      },
    },
    {
      $group: {
        _id: "$code",
        count: { $sum: 1 },
      },
    },
    { $match: { count: days } },
    { $count: "count" },
  ];

  const result = await db
    .collection(COLLECTIONS.JINGJIA)
    .aggregate<{ count: number }>(pipeline)
    .toArray();
  return result[0]?.count ?? 0;
}

async function getRecentDates(db: Db, baseDate: string, days: number) {
  const dates = await db
    .collection(COLLECTIONS.JINGJIA)
    .aggregate<{ date: string }>([
      { $match: { create_date: { $lte: baseDate } } },
      { $group: { _id: "$create_date" } },
      { $sort: { _id: -1 } },
      { $limit: days },
      { $project: { _id: 0, date: "$_id" } },
    ])
    .toArray();

  return dates.map((item) => item.date).filter(Boolean);
}
