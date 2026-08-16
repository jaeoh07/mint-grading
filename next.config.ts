import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 중 좌측 하단에 뜨는 Next.js 표시기 숨김 (배포 화면에는 원래 안 나옴)
  devIndicators: false,
  // sharp(네이티브 모듈)는 서버에서 번들하지 않고 그대로 사용
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
