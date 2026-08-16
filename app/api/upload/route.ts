import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { isAuthed } from "@/lib/auth";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// POST /api/upload  (multipart/form-data, field: "file")  -> { url }
// 업로드 시 자동 압축(긴 변 1800px·WebP 품질 80). 배포=Vercel Blob, 로컬=public/uploads
export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const original = Buffer.from(await file.arrayBuffer());

  // 압축 (실패 시 원본 사용)
  let data: Buffer = original;
  let ext = (path.extname(file.name) || ".jpg").toLowerCase();
  let contentType = file.type || "image/jpeg";
  try {
    data = await sharp(original)
      .rotate() // EXIF 회전 반영
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    ext = ".webp";
    contentType = "image/webp";
  } catch {
    // 압축 실패(비이미지 등) 시 원본 그대로
  }

  const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;

  if (USE_BLOB) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, data, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return NextResponse.json({ url: blob.url });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, name), data);
  return NextResponse.json({ url: `/uploads/${name}` });
}
