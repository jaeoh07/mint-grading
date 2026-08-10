import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { isAuthed } from "@/lib/auth";

// 상품/문서 페이지 URL에서 제목·표지 이미지 등 메타정보를 자동 추출
// POST /api/import  { url }  -> { albumTitle, coverImage, format, description }

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function metaContent(html: string, prop: string): string | null {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta[^>]*(?:property|name)=["']${esc}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const c = tag.match(/content=["']([^"']*)["']/i);
  return c ? decodeEntities(c[1]) : null;
}

// 사이트명 꼬리표/머리표 제거 (예: "앨범명 - YES24", "kr.ktown4u.com : 앨범명")
function cleanTitle(title: string): string {
  const sites = ["YES24", "예스24", "나무위키", "ktown4u", "케이타운포유", "교보문고", "알라딘", "YGPLUS", "인터파크"];
  const seps = [" - ", " : ", " | ", " – ", " ; "];
  const isSite = (s: string) =>
    sites.some((k) => s.toLowerCase().includes(k.toLowerCase())) || /\.(com|co\.kr|net|kr)\b/i.test(s);
  let t = title.trim();

  // 맨 앞(가장 먼저 나오는 구분자) 사이트명 제거
  {
    let best = -1, bestSep = "";
    for (const sep of seps) {
      const i = t.indexOf(sep);
      if (i > 0 && (best < 0 || i < best)) { best = i; bestSep = sep; }
    }
    if (best > 0 && isSite(t.slice(0, best).trim())) t = t.slice(best + bestSep.length).trim();
  }
  // 맨 뒤(가장 나중 구분자) 사이트명 반복 제거
  let changed = true;
  while (changed) {
    changed = false;
    let last = -1, lastSep = "";
    for (const sep of seps) {
      const i = t.lastIndexOf(sep);
      if (i > 0 && i > last) { last = i; lastSep = sep; }
    }
    if (last > 0 && isSite(t.slice(last + lastSep.length).trim())) {
      t = t.slice(0, last).trim();
      changed = true;
    }
  }
  return t;
}

function guessFormat(text: string): string {
  const t = text.toLowerCase();
  if (/\blp\b|바이닐|vinyl|바이널/.test(t)) return "LP";
  if (/\bcd\b/.test(t)) return "CD";
  return "";
}

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const { url } = await request.json().catch(() => ({ url: "" }));
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "올바른 URL이 아닙니다." }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    if (!res.ok) throw new Error(String(res.status));
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "페이지를 불러오지 못했습니다. 주소를 확인해 주세요." }, { status: 502 });
  }

  const rawTitle = metaContent(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
  const albumTitle = cleanTitle(decodeEntities(rawTitle));
  const description = metaContent(html, "og:description") || "";
  const format = guessFormat(rawTitle + " " + description + " " + url);

  // 표지 이미지 다운로드 (있으면 로컬 uploads 에 저장)
  let coverImage = "";
  const ogImage = metaContent(html, "og:image");
  if (ogImage) {
    try {
      const imgUrl = new URL(ogImage, url).toString();
      const imgRes = await fetch(imgUrl, { headers: { "User-Agent": "Mozilla/5.0", Referer: url } });
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ct = imgRes.headers.get("content-type") || "";
        const ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ct.includes("gif") ? ".gif" : ".jpg";
        const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
        const dir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, name), buf);
        coverImage = `/uploads/${name}`;
      }
    } catch {
      // 이미지는 실패해도 제목만이라도 반환
    }
  }

  return NextResponse.json({ albumTitle, coverImage, format, description });
}
