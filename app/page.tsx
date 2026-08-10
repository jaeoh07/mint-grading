"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/result?code=${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-16">
      {/* 대문 */}
      <h1 className="text-6xl sm:text-8xl font-black tracking-[0.15em] select-none">
        MINT
      </h1>
      <p className="mt-4 text-lg sm:text-xl text-neutral-300 tracking-wide">
        바이닐 그레이딩 넘버 조회
      </p>

      {/* 조회 폼 */}
      <form onSubmit={submit} className="mt-14 w-full max-w-md flex flex-col items-center">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="MINT/8AEF9"
          autoFocus
          className="w-full text-center text-xl tracking-widest bg-transparent border border-neutral-600 rounded-xl py-5 px-4 placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
        />

        <div className="mt-6 flex items-center gap-3 w-full">
          <button
            type="submit"
            className="flex-1 bg-white text-black font-bold text-lg rounded-xl py-4 hover:bg-neutral-200 active:scale-[0.99] transition"
          >
            조회하기
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            aria-label="인증번호 입력 방법 도움말"
            className="w-14 h-14 shrink-0 rounded-xl border border-neutral-600 text-2xl font-bold hover:border-white hover:bg-neutral-900 transition"
          >
            ?
          </button>
        </div>
      </form>

      {/* 도움말 모달 */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-neutral-950 border border-neutral-700 rounded-2xl max-w-lg w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">인증번호 입력 방법</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-neutral-400 hover:text-white text-2xl leading-none"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            {/* 도식: 나중에 실제 사진으로 교체 예정 */}
            <div className="mt-6 rounded-xl border border-dashed border-neutral-600 p-6 text-center">
              <div className="text-3xl font-black tracking-widest">
                MINT<span className="text-neutral-500">/</span>
                <span className="text-emerald-400">8AEF9</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-left">
                <div className="rounded-lg bg-neutral-900 p-3">
                  <div className="text-neutral-500">브랜드 코드</div>
                  <div className="font-bold">MINT/</div>
                </div>
                <div className="rounded-lg bg-neutral-900 p-3">
                  <div className="text-neutral-500">인증번호</div>
                  <div className="font-bold text-emerald-400">8AEF9</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-neutral-400">
                감정서(라벨/보증서)에 표기된 인증번호를 그대로 입력하세요.
                <br />
                (예시 이미지는 관리자 페이지에서 실제 사진으로 교체할 수 있습니다.)
              </p>
            </div>
          </div>
        </div>
      )}

      <a
        href="/admin"
        className="mt-16 text-xs text-neutral-600 hover:text-neutral-400 transition"
      >
        관리자 로그인
      </a>
    </main>
  );
}
