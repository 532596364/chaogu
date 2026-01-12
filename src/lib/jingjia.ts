import clientPromise from "@/lib/mongodb";
import type { TypeOfBiddingItem } from "@/types";
import { COLLECTIONS, DB_NAME_DEFAULT } from "@/shared/contants";

const dbName = process.env.MONGODB_DB || DB_NAME_DEFAULT;

export type JingjiaMeta = {
  sourceFileName: string;
  sheetName: string;
  uploadedAt: Date;
};

export type JingjiaRow = TypeOfBiddingItem & {
  create_date?: string;
};

export async function insertJingjiaRows(
  rows: JingjiaRow[],
  meta: JingjiaMeta,
  collectionName: string = COLLECTIONS.JINGJIA
) {
  if (!rows.length) {
    return { insertedCount: 0 };
  }

  const client = await clientPromise;
  const db = client.db(dbName);
  const docs = rows.map((row) => ({
    ...row,
    _meta: meta,
  }));

  const result = await db.collection(collectionName).insertMany(docs);
  return { insertedCount: result.insertedCount };
}
