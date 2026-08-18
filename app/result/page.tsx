"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Record } from "@/lib/store";
import { GRADES, PAGE_BACKGROUND, SEALED_COLOR, SEALED_LABEL, gradeColor, matchGrade } from "@/lib/grade";

export default function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = use(searchParams);
  const [record, setRecord] = useState<Record | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");
  const [showGuide, setShowGuide] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus("notfound");
      return;
    }
    fetch(`/api/records?code=${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRecord(data.record);
        setStatus("ok");
      })
      .catch(() => setStatus("notfound"));
  }, [code]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-400">조회 중…</p>
      </main>
    );
  }

  if (status === "notfound" || !record) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-neutral-300 text-center">
          인증번호 <span className="font-bold text-white">{code || "(없음)"}</span> 에 해당하는
          <br />
          음반 정보를 찾을 수 없습니다.
        </p>
        <Link href="/" className="bg-white text-black font-bold rounded-xl px-6 py-3">
          다시 조회하기
        </Link>
      </main>
    );
  }

  const isSealed = record.sealed;
  const mediaColor = gradeColor(record.mediaGrade);
  const sleeveColor = gradeColor(record.sleeveGrade);
  const currentMedia = matchGrade(record.mediaGrade);
  const currentSleeve = matchGrade(record.sleeveGrade);

  // 밀봉(Sealed)이면 알판(디스크)·청음 등 내부 검수 섹션은 자동 숨김
  const MEDIA_KEYWORDS = ["디스크", "알판", "a면", "b면", "청음", "media", "미디어"];
  const visibleSections = isSealed
    ? record.sections.filter((s) => !MEDIA_KEYWORDS.some((k) => s.title.toLowerCase().includes(k)))
    : record.sections;

  const meta = [
    record.releaseYear,
    record.label,
    record.catalogNo,
    record.country,
  ].filter((v) => v && v.trim());

  return (
    <main className="min-h-screen text-white px-6 py-12" style={{ background: PAGE_BACKGROUND }}>
      <div className="mx-auto max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-white/[0.04] backdrop-blur-sm shadow-2xl">
        {/* 헤더 */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-white/10">
          <p className="text-sm tracking-[0.3em] text-white/60">MINT 감정 리포트</p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold flex items-center justify-center flex-wrap gap-2">
            <span>{record.albumTitle}</span>
            {record.format && (
              <span className="text-sm font-semibold px-2.5 py-1 rounded-md border border-white/25 text-white/80">
                {record.format}
              </span>
            )}
          </h1>
          {meta.length > 0 && (
            <p className="mt-2 text-sm text-white/50">{meta.join(" · ")}</p>
          )}
          <p className="mt-3 text-xs text-white/40 leading-relaxed">
            본 감정은 골드마인(Goldmine) 표준을 참고한 육안(외관) 기준이며, 청음은 포함하지 않습니다.
          </p>
        </div>

        {/* 대표 사진 */}
        <div className="bg-black/20">
          {record.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.coverImage}
              alt={record.albumTitle}
              onClick={() => setZoom(record.coverImage!)}
              className="w-full object-contain max-h-[480px] cursor-zoom-in"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center text-white/30">
              [ {record.albumTitle} 전체 사진 ]
            </div>
          )}
        </div>

        {/* 등급 (알판/자켓) + 등급표 버튼 */}
        <div className="px-8 py-6 border-b border-white/10 text-center">
          <div className="flex items-center justify-center mb-3">
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/25 text-white/70 hover:bg-white/10 transition"
            >
              골드마인 등급표 보기
            </button>
          </div>
          {isSealed ? (
            <div className="text-3xl font-black" style={{ color: SEALED_COLOR }}>
              {SEALED_LABEL}
              <p className="mt-2 text-sm font-normal text-white/50">밀봉 상태로 내부 알판은 미검수입니다.</p>
            </div>
          ) : (
            <div className="flex justify-center gap-10">
              <div>
                <span className="text-white/50 text-sm">알판 (Media)</span>
                <div className="mt-1 text-2xl sm:text-3xl font-black" style={{ color: mediaColor }}>
                  {record.mediaGrade || "—"}
                </div>
              </div>
              <div>
                <span className="text-white/50 text-sm">자켓 (Sleeve)</span>
                <div className="mt-1 text-2xl sm:text-3xl font-black" style={{ color: sleeveColor }}>
                  {record.sleeveGrade || "—"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* O/X 확인 항목 */}
        {record.checks && record.checks.length > 0 && (
          <div className="px-8 py-5 border-b border-white/10 flex flex-wrap gap-3 justify-center">
            {record.checks.map((c) => {
              const isO = c.value.trim().toUpperCase() === "O";
              const isX = c.value.trim().toUpperCase() === "X";
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm"
                >
                  <span className="text-white/70">{c.label}</span>
                  <span className="font-bold" style={{ color: isO ? "#4ade80" : isX ? "#f87171" : "#e5e7eb" }}>
                    {c.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 상세 감정 리포트 */}
        <div className="px-8 py-8">
          <h2 className="text-lg font-bold tracking-wide">상세 감정 리포트</h2>
          {isSealed && (
            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
              🔒 밀봉(Sealed) 상태로, 알판(디스크) 내부는 개봉하지 않아 검수하지 않았습니다. 외관(자켓·밀봉) 기준으로만 감정되었습니다.
            </div>
          )}
          <div className="mt-6 space-y-8">
            {visibleSections.map((s) => (
              <div key={s.id}>
                <h3 className="font-bold">{s.title}</h3>
                {(() => {
                  const imgs = s.images && s.images.length ? s.images : s.image ? [s.image] : [];
                  if (!imgs.length) return null;
                  return (
                    <div className={`mt-3 grid gap-2 ${imgs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {imgs.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt={s.title}
                          onClick={() => setZoom(url)}
                          className="rounded-lg w-full object-contain max-h-80 bg-black/20 cursor-zoom-in"
                        />
                      ))}
                    </div>
                  );
                })()}
                {s.body && s.body.trim() && (
                  <p className="mt-3 text-white/80 leading-relaxed whitespace-pre-wrap">{s.body}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 총평 */}
        <div className="px-8 py-6 border-t border-white/10 bg-black/10">
          <h2 className="font-bold">📋 총평 (Grader&apos;s Summary)</h2>
          <p className="mt-3 text-white/80 leading-relaxed whitespace-pre-wrap">{record.summary}</p>
          {(record.gradedDate || record.graderName) && (
            <p className="mt-4 text-sm text-white/50">
              {record.gradedDate && <>감정일자 {record.gradedDate}</>}
              {record.gradedDate && record.graderName && " · "}
              {record.graderName && <>감정사 {record.graderName}</>}
            </p>
          )}
        </div>

        {/* 면책 및 재검수 조항 */}
        <div className="px-8 py-6 border-t border-white/10">
          <h2 className="font-bold text-sm text-white/50">[ 면책 및 재검수 조항 ]</h2>
          <p className="mt-3 text-white/50 text-sm leading-relaxed whitespace-pre-wrap">{record.disclaimer}</p>
          <button
            className="mt-6 w-full border border-white/20 rounded-xl py-3 font-bold text-white/50 cursor-not-allowed"
            onClick={() => alert("재검수 신청은 현재 준비 중입니다.")}
          >
            재검수 신청하기 (준비 중)
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl mt-6 text-center">
        <Link href="/" className="text-sm text-white/50 hover:text-white transition">
          ← 다른 인증번호 조회
        </Link>
      </div>

      {/* 등급표 모달 */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setShowGuide(false)}>
          <div
            className="bg-neutral-950 border border-neutral-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between sticky top-0 bg-neutral-950 pb-3">
              <h2 className="text-lg font-bold">골드마인(Goldmine) 등급표</h2>
              <button onClick={() => setShowGuide(false)} className="text-neutral-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <ul className="space-y-2">
              {GRADES.map((g) => {
                const tags: string[] = [];
                if (currentMedia?.code === g.code) tags.push("알판");
                if (currentSleeve?.code === g.code) tags.push("자켓");
                const isCurrent = tags.length > 0;
                return (
                  <li
                    key={g.code}
                    className={`rounded-xl border p-3 ${isCurrent ? "border-white bg-white/10" : "border-neutral-800"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: g.color }} />
                      <span className="font-bold" style={{ color: g.color }}>{g.name}</span>
                      {isCurrent && <span className="ml-auto text-xs text-white/60">이 음반 · {tags.join("/")}</span>}
                    </div>
                    <div className="mt-2 space-y-1.5 text-sm text-neutral-400 leading-relaxed">
                      <p><span className="text-neutral-500 font-semibold">알판(Media)</span> · {g.mediaDesc}</p>
                      <p><span className="text-neutral-500 font-semibold">자켓(Sleeve)</span> · {g.sleeveDesc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* 사진 확대(라이트박스) */}
      {zoom && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setZoom(null)}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(null);
            }}
            aria-label="닫기"
            className="fixed top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl leading-none flex items-center justify-center z-10"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain cursor-zoom-out"
          />
        </div>
      )}
    </main>
  );
}
