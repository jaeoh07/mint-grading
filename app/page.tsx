export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-16">
      {/* 대문 */}
      <h1 className="text-6xl sm:text-8xl font-black tracking-[0.15em] select-none">
        MINT
      </h1>
      <p className="mt-4 text-lg sm:text-xl text-neutral-300 tracking-wide">
        바이닐 그레이딩 &amp; 감정
      </p>
      <p className="mt-3 text-sm text-neutral-500 text-center max-w-xs">
        음반에 부착된 QR 코드를 스캔하면 감정 리포트로 연결됩니다.
      </p>

      <a
        href="/admin"
        className="mt-16 text-xs text-neutral-600 hover:text-neutral-400 transition"
      >
        관리자 로그인
      </a>
    </main>
  );
}
