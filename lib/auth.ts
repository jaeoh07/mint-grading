import { cookies } from "next/headers";
import crypto from "crypto";

export const AUTH_COOKIE = "mint_auth";

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "mint1234";
}

// 비밀번호를 그대로 쿠키에 담지 않기 위해 해시 토큰을 사용
export function sessionToken(): string {
  return crypto.createHash("sha256").update(adminPassword()).digest("hex");
}

export function checkPassword(input: string): boolean {
  return input === adminPassword();
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(AUTH_COOKIE)?.value;
  return !!value && value === sessionToken();
}
