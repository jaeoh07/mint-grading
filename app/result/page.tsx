"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Record } from "@/lib/store";
import { GRADES, PAGE_BACKGROUND, SEALED_COLOR, SEALED_LABEL, gradeColor, gradeLabels, matchGrade } from "@/lib/grade";

type Section = Record["sections"][number];

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
  const labels = gradeLabels(record.format);

  // 밀봉(Sealed)이면 알판(디스크)·청음 등 내부 검수 섹션은 자동 숨김
  const MEDIA_KEYWORDS = ["디스크", "알판", "a면", "b면", "청음", "media", "미디어"];
  const visibleSections = isSealed
    ? record.sections.filter((s) => !MEDIA_KEYWORDS.some((k) => s.title.toLowerCase().includes(k)))
    : record.sections;

  // 섹션을 성격별로 분류해서 하나의 박스(그룹)로 묶는다.
  const catOf = (title: string): "highlight" | "media" | "closeup" | "sleeve" => {
    const t = title || "";
    if (/가장 큰 흠집|대표 하자/.test(t)) return "highlight";
    if (/클로즈업|근접/.test(t)) return "closeup";
    if (/(A면|B면|알판|디스크|재생면|라벨|스핀들|데드왁스|러너웃|워프|휨|허브|매트릭스|IFPI|청음)/i.test(t)) return "media";
    return "sleeve"; // 자켓·케이스·부클릿·구성품·모서리 등
  };
  const has = (s: Section) => {
    const imgs = s.images && s.images.length ? s.images : s.image ? [s.image] : [];
    return imgs.length > 0 || (s.body && s.body.trim());
  };
  const groups = {
    highlight: [] as Section[],
    sleeve: [] as Section[],
    media: [] as Section[],
    closeup: [] as Section[],
  };
  visibleSections.filter(has).forEach((s) => groups[catOf(s.title)].push(s));

  const meta = [
    record.releaseYear,
    record.label,
    record.catalogNo,
    record.country,
  ].filter((v) => v && v.trim());

  // 그룹 내 하위 항목(소제목 + 사진 + 본문)
  const SubItem = ({ s }: { s: Section }) => {
    const imgs = s.images && s.images.length ? s.images : s.image ? [s.image] : [];
    return (
      <div className="py-3 first:pt-0 last:pb-0">
        <h4 className="font-semibold text-[13px] tracking-wide text-white/85">{s.title}</h4>
        {imgs.length > 0 && (
          <div className={`mt-2 grid gap-1.5 ${imgs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {imgs.map((url, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={k}
                src={url}
                alt={s.title}
                onClick={() => setZoom(url)}
                className="rounded-lg w-full object-contain max-h-64 sm:max-h-80 bg-black/20 cursor-zoom-in"
              />
            ))}
          </div>
        )}
        {s.body && s.body.trim() && (
          <p className="mt-2 text-[13px] sm:text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{s.body}</p>
        )}
      </div>
    );
  };

  // 그룹 박스 (제목 + 등급칩 + 하위 항목들)
  const GroupCard = ({
    icon,
    title,
    grade,
    color,
    items,
  }: {
    icon: string;
    title: string;
    grade?: string;
    color?: string;
    items: Section[];
  }) => {
    if (items.length === 0) return null;
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-white/10 bg-white/[0.03]">
          <span className="text-base">{icon}</span>
          <h3 className="font-bold text-sm tracking-wide text-white/90">{title}</h3>
          {grade && grade.trim() && (
            <span
              className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full border"
              style={{ color, borderColor: `${color}66` }}
            >
              {grade}
            </span>
          )}
        </div>
        <div className="px-4 sm:px-5 py-1.5 divide-y divide-white/[0.06]">
          {items.map((s) => (
            <SubItem key={s.id} s={s} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen text-white px-3 sm:px-6 py-6 sm:py-12" style={{ background: PAGE_BACKGROUND }}>
      <div className="mx-auto max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-white/[0.04] backdrop-blur-sm shadow-2xl">
        {/* 헤더 */}
        <div className="px-5 sm:px-8 pt-7 sm:pt-8 pb-6 text-center border-b border-white/10">
          <p className="text-[11px] sm:text-xs tracking-[0.3em] text-white/50">MINT · 감정 리포트</p>
          <p className="mt-2 font-mono text-sm text-emerald-400 tracking-wider">{record.code}</p>
          <h1 className="mt-3 text-xl sm:text-3xl font-bold flex items-center justify-center flex-wrap gap-2">
            <span>{record.albumTitle}</span>
            {record.format && (
              <span className="text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md border border-white/25 text-white/80">
                {record.format}
              </span>
            )}
          </h1>
          {meta.length > 0 && (
            <p className="mt-2 text-[13px] sm:text-sm text-white/50">{meta.join(" · ")}</p>
          )}
          <p className="mt-3 text-[11px] sm:text-xs text-white/40 leading-relaxed">
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
              className="w-full object-contain max-h-[380px] sm:max-h-[480px] cursor-zoom-in"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center text-white/30">
              [ {record.albumTitle} 전체 사진 ]
            </div>
          )}
        </div>

        {/* 등급 (알판/자켓) + 등급표 버튼 */}
        <div className="px-5 sm:px-8 py-6 border-b border-white/10 text-center">
          <div className="flex items-center justify-center mb-3">
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/25 text-white/70 hover:bg-white/10 active:bg-white/15 transition"
            >
              골드마인 등급표 보기
            </button>
          </div>
          {isSealed ? (
            <div className="text-2xl sm:text-3xl font-black" style={{ color: SEALED_COLOR }}>
              {SEALED_LABEL}
              <p className="mt-2 text-sm font-normal text-white/50">밀봉 상태로 내부 알판은 미검수입니다.</p>
            </div>
          ) : (
            <>
            <div className="flex justify-center gap-8 sm:gap-10">
              <div>
                <span className="text-white/50 text-[13px] sm:text-sm">{labels.media}</span>
                <div className="mt-1 text-2xl sm:text-3xl font-black" style={{ color: mediaColor }}>
                  {record.mediaGrade || "—"}
                </div>
              </div>
              <div>
                <span className="text-white/50 text-[13px] sm:text-sm">{labels.sleeve}</span>
                <div className="mt-1 text-2xl sm:text-3xl font-black" style={{ color: sleeveColor }}>
                  {record.sleeveGrade || "—"}
                </div>
              </div>
            </div>
            {/cd/i.test(record.format) && (
              <p className="mt-3 text-[11px] sm:text-xs text-white/40">골드마인 기준상 CD 케이스는 등급 대상이 아니며, 자켓 등급은 부클릿·속지 기준입니다.</p>
            )}
            </>
          )}
        </div>

        {/* O/X 확인 항목 */}
        {record.checks && record.checks.length > 0 && (
          <div className="px-5 sm:px-8 py-5 border-b border-white/10 flex flex-wrap gap-2.5 justify-center">
            {record.checks.map((c) => {
              const isO = c.value.trim().toUpperCase() === "O";
              const isX = c.value.trim().toUpperCase() === "X";
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] sm:text-sm"
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
        <div className="px-4 sm:px-8 py-6 sm:py-8">
          <h2 className="px-1 text-lg font-bold tracking-wide">상세 감정 리포트</h2>
          {isSealed && (
            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
              🔒 밀봉(Sealed) 상태로, 알판(디스크) 내부는 개봉하지 않아 검수하지 않았습니다. 외관(자켓·밀봉) 기준으로만 감정되었습니다.
            </div>
          )}
          <div className="mt-4 space-y-3.5">
            {/* 가장 큰 흠집 — 단독 강조 */}
            {groups.highlight.map((s) => {
              const imgs = s.images && s.images.length ? s.images : s.image ? [s.image] : [];
              return (
                <div key={s.id} className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔎</span>
                    <h3 className="font-bold text-sm tracking-wide text-amber-200/90">가장 큰 하자 먼저</h3>
                  </div>
                  {s.body && s.body.trim() && (
                    <p className="mt-2 text-[13px] sm:text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{s.body}</p>
                  )}
                  {imgs.length > 0 && (
                    <div className={`mt-2.5 grid gap-1.5 ${imgs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {imgs.map((url, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={k} src={url} alt={s.title} onClick={() => setZoom(url)}
                          className="rounded-lg w-full object-contain max-h-64 sm:max-h-80 bg-black/20 cursor-zoom-in" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 자켓 · 외관 그룹 */}
            <GroupCard
              icon={/cd/i.test(record.format) ? "📀" : "📦"}
              title={/cd/i.test(record.format) ? "케이스 · 부클릿 · 속지" : "자켓 · 외관 (Sleeve)"}
              grade={!isSealed ? record.sleeveGrade : undefined}
              color={sleeveColor}
              items={groups.sleeve}
            />

            {/* 알판 · 디스크 그룹 (밀봉이면 숨김) */}
            <GroupCard
              icon="💿"
              title={/cd/i.test(record.format) ? "디스크 (Media)" : "알판 · 디스크 (Media)"}
              grade={!isSealed ? record.mediaGrade : undefined}
              color={mediaColor}
              items={groups.media}
            />

            {/* 하자 클로즈업 그룹 */}
            <GroupCard icon="🔬" title="하자 클로즈업" items={groups.closeup} />
          </div>
        </div>

        {/* 총평 */}
        <div className="px-5 sm:px-8 py-6 border-t border-white/10 bg-black/10">
          <h2 className="font-bold">📋 총평 (Grader&apos;s Summary)</h2>
          {record.summary && record.summary.trim() ? (
            <p className="mt-3 text-[14px] sm:text-base text-white/80 leading-relaxed whitespace-pre-wrap">{record.summary}</p>
          ) : (
            <p className="mt-3 text-sm text-white/40">아직 총평이 등록되지 않았습니다.</p>
          )}
          {(record.gradedDate || record.graderName) && (
            <p className="mt-4 text-[13px] sm:text-sm text-white/50">
              {record.gradedDate && <>감정일자 {record.gradedDate}</>}
              {record.gradedDate && record.graderName && " · "}
              {record.graderName && <>감정사 {record.graderName}</>}
            </p>
          )}
        </div>

        {/* 면책 및 재검수 조항 */}
        <div className="px-5 sm:px-8 py-6 border-t border-white/10">
          <h2 className="font-bold text-sm text-white/50">[ 면책 및 재검수 조항 ]</h2>
          <p className="mt-3 text-white/50 text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap">{record.disclaimer}</p>
          <p className="mt-2 text-white/40 text-[13px] sm:text-sm leading-relaxed">
            ※ 육안(외관) 기준 감정으로, 조명·각도에 따라 미세한 흠집은 보이지 않을 수 있습니다. 루페(확대경)를 이용한 정밀 검수는 별도(유료)로 제공됩니다.
          </p>
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
          ← 홈으로
        </Link>
      </div>

      {/* 등급표 모달 */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 sm:p-6 z-50" onClick={() => setShowGuide(false)}>
          <div
            className="bg-neutral-950 border border-neutral-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6"
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
