"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

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

        <button
          type="submit"
          className="mt-6 w-full bg-white text-black font-bold text-lg rounded-xl py-4 hover:bg-neutral-200 active:scale-[0.99] transition"
        >
          조회하기
        </button>
      </form>

      <a
        href="/admin"
        className="mt-16 text-xs text-neutral-600 hover:text-neutral-400 transition"
      >
        관리자 로그인
      </a>
    </main>
  );
}
