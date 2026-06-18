import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";

// Lightweight endpoint for client components to learn the current login state.
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
