import { NextRequest, NextResponse } from "next/server";
import { createTodo, getTodos } from "@/lib/todos";

export async function GET() {
  try {
    const todos = await getTodos();
    return NextResponse.json({ todos });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load todos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const todo = await createTodo({ title: body?.title });
    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create todo." },
      { status: 400 }
    );
  }
}
