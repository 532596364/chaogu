import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

const dbName = process.env.MONGODB_DB || "chaogu";
const collectionName = "jingjia";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const values = await db.collection(collectionName).distinct("type");
    const types = values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return NextResponse.json({ types });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load types." },
      { status: 500 }
    );
  }
}
