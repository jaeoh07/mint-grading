import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { isAuthed } from "@/lib/auth";

// POST /api/upload  (multipart/form-data, field: "file")  -> { url }
// 로컬에서는 public/uploads 에 저장합니다.
export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (path.extname(file.name) || ".png").toLowerCase();
  const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, name), bytes);

  return NextResponse.json({ url: `/uploads/${name}` });
}
