import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const dbName = process.env.MONGODB_DB || "chaogu";
const collectionName = "todos";

export type Todo = {
  _id: ObjectId;
  title: string;
  completed: boolean;
  createdAt: Date;
};

type TodoInput = {
  title: string;
};

export async function getTodos() {
  const client = await clientPromise;
  const db = client.db(dbName);
  const todos = await db
    .collection<Todo>(collectionName)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return todos.map((todo) => ({
    ...todo,
    _id: todo._id.toString(),
  }));
}

export async function createTodo(input: TodoInput) {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  const client = await clientPromise;
  const db = client.db(dbName);
  const doc = {
    title,
    completed: false,
    createdAt: new Date(),
  };

  const result = await db.collection(collectionName).insertOne(doc);

  return {
    _id: result.insertedId.toString(),
    ...doc,
  };
}
