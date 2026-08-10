import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, checkPassword, isAuthed, sessionToken } from "@/lib/auth";

// 로그인 상태 확인
export async function GET() {
  return NextResponse.json({ authed: await isAuthed() });
}

// 로그인
export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (!checkPassword(password ?? "")) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const res = NextResponse.json({ authed: true });
  res.cookies.set(AUTH_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일
  });
  return res;
}

// 로그아웃
export async function DELETE() {
  const res = NextResponse.json({ authed: false });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
