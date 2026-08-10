import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { isAuthed } from "@/lib/auth";

// GET /api/qr?code=MINT/8AEF9  -> 해당 음반 감정 리포트로 연결되는 QR PNG 다운로드
export async function GET(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code가 필요합니다." }, { status: 400 });
  }

  // 현재 접속 중인 사이트 주소 기준으로 조회 페이지 URL 생성
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const url = `${proto}://${host}/result?code=${encodeURIComponent(code)}`;

  const png = await QRCode.toBuffer(url, {
    width: 600,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const safeName = code.replace(/[^a-zA-Z0-9]+/g, "-");
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="MINT-${safeName}.png"`,
    },
  });
}
