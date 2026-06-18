import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { OPENAPI_SPEC } from "@/lib/openapiSpec";

// Serves the OpenAPI spec ONLY to a logged-in superadmin. The spec is no longer
// a public static file, so the API surface is not exposed to anonymous users.
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "superadmin") {
    return new NextResponse("forbidden", { status: 403 });
  }
  return new NextResponse(OPENAPI_SPEC, {
    headers: { "content-type": "text/yaml; charset=utf-8" },
  });
}
