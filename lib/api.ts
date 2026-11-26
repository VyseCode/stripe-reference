import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(error.issues[0]?.message ?? "Invalid input", 400);
  }
  if (error instanceof SyntaxError) {
    return fail("Invalid JSON body", 400);
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    return fail("A record with that value already exists", 409);
  }
  console.error("[api] unexpected error:", error);
  return fail("Something went wrong. Please try again.", 500);
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json();
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export type PageQuery = {
  limit: number;
  page: number;
  search: string;
  status: string;
  sort: string;
  cursor: string;
};

export function parsePage(params: URLSearchParams): PageQuery {
  const rawLimit = Number(params.get("limit") ?? "20");
  const rawPage = Number(params.get("page") ?? "1");
  return {
    limit: Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 20,
    page: Number.isFinite(rawPage) ? Math.min(Math.max(Math.trunc(rawPage), 1), 10000) : 1,
    search: (params.get("search") ?? "").trim().slice(0, 120),
    status: (params.get("status") ?? "").trim().slice(0, 40),
    sort: (params.get("sort") ?? "newest").trim().slice(0, 40),
    cursor: (params.get("cursor") ?? "").trim().slice(0, 120),
  };
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
