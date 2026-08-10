import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getAll, getByCode, remove, upsert, type Record } from "@/lib/store";

// GET /api/records?code=XXX  -> 공개 조회 (인증 불필요)
// GET /api/records           -> 전체 목록 (관리자 전용)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const record = await getByCode(code);
    if (!record) {
      return NextResponse.json({ error: "해당 인증번호의 음반을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ record });
  }
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  return NextResponse.json({ records: await getAll() });
}

// POST /api/records  -> 생성/수정 (관리자 전용)
// body: { record: Record, originalCode?: string }
export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.record?.code) {
    return NextResponse.json({ error: "인증번호(code)는 필수입니다." }, { status: 400 });
  }
  const record = body.record as Record;
  if (!Array.isArray(record.sections)) record.sections = [];
  if (!Array.isArray(record.checks)) record.checks = [];
  const saved = await upsert(record, body.originalCode);
  return NextResponse.json({ record: saved });
}

// DELETE /api/records?code=XXX  -> 삭제 (관리자 전용)
export async function DELETE(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code가 필요합니다." }, { status: 400 });
  }
  await remove(code);
  return NextResponse.json({ ok: true });
}
