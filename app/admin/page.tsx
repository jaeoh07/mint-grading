"use client";

import { useEffect, useState } from "react";
import type { CheckItem, Record, ReportSection } from "@/lib/store";
import { GRADES, matchGrade, combinedSummary, gradeLabels } from "@/lib/grade";

const uid = () => Math.random().toString(36).slice(2);

// 인증번호 자동 발급: 문자 4 + 숫자 2를 섞어 6자리 (헷갈리는 I,O,0,1 제외)
function generateCode(existing: Record[]): string {
  const used = new Set(existing.map((r) => r.code.toUpperCase()));
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  for (let i = 0; i < 50; i++) {
    const arr = [pick(letters), pick(letters), pick(letters), pick(letters), pick(digits), pick(digits)];
    // 위치 섞기 (숫자가 중간에 섞이도록)
    for (let k = arr.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [arr[k], arr[j]] = [arr[j], arr[k]];
    }
    const s = "MINT/" + arr.join("");
    if (!used.has(s.toUpperCase())) return s;
  }
  return "MINT/" + Date.now().toString(36).toUpperCase();
}

// 새 음반 추가 시 채워지는 초안(예시). 그대로 두거나 수정·삭제하면 됩니다.
// req: 스크래치가 없어도 반드시 사진을 넣어야 하는 부위
type SectionTmpl = { title: string; body: string; req: boolean };

const DEFAULT_SECTIONS_LP: SectionTmpl[] = [
  { title: "가장 큰 흠집 먼저", body: "제일 큰 하자부터. 없으면 특이사항 없음.", req: true },
  { title: "자켓 앞면", body: "인쇄·변색·오염", req: true },
  { title: "자켓 뒷면", body: "변색·습기·크레딧", req: true },
  { title: "자켓 옆면(Spine)", body: "글자 마모", req: false },
  { title: "네 모서리", body: "찍힘·터짐", req: false },
  { title: "자켓 링웨어(음반 눌린 자국)", body: "옆광 · 눌린 자국", req: false },
  { title: "구성품 (속비닐·속지·가사지·포스터·띠지)", body: "있는 것만", req: false },
  { title: "판 A면 표면", body: "옆광 · 스크래치 (등급 결정)", req: true },
  { title: "판 B면 표면", body: "옆광 · 스크래치", req: true },
  { title: "라벨(가운데)", body: "스티커·낙서·곰팡이", req: false },
  { title: "스핀들 자국(중앙 홀 주변)", body: "중앙 홀 주변 긁힘", req: false },
  { title: "데드왁스(러너웃) 각인", body: "각인 코드 · 정품 확인", req: false },
  { title: "휨(워프) 확인", body: "수평 · 휨 여부", req: false },
  { title: "하자 클로즈업", body: "흠집 근접 2장", req: false },
];

const DEFAULT_SECTIONS_CD: SectionTmpl[] = [
  { title: "가장 큰 흠집 먼저", body: "제일 큰 하자부터. 없으면 특이사항 없음.", req: true },
  { title: "케이스 앞·뒤·옆", body: "참고용 · 등급 미반영", req: false },
  { title: "케이스 깨짐·경첩", body: "참고용 · 등급 미반영", req: false },
  { title: "부클릿(책자) 앞·뒤", body: "인쇄·변색 (자켓 등급)", req: true },
  { title: "부클릿 들뜸", body: "옆각 · 들뜸 정도", req: false },
  { title: "부클릿 속지", body: "낙서·스티커·색바램", req: false },
  { title: "트레이 카드(뒤 종이)", body: "뒤 종이", req: false },
  { title: "디스크 재생면(아랫면)", body: "옆광 · 스크래치·지문 (등급 결정)", req: true },
  { title: "디스크 윗면(인쇄면)", body: "인쇄 벗겨짐·변색", req: false },
  { title: "가운데 구멍 주변(허브)", body: "금(크랙) · 가장 중요", req: true },
  { title: "매트릭스/IFPI 각인", body: "각인 코드 · 정품 확인", req: false },
  { title: "구성품 (띠지·스티커·포토카드·특전)", body: "있는 것만", req: false },
  { title: "하자 클로즈업", body: "흠집 근접", req: false },
];

// 포맷에 맞는 기본 섹션 템플릿 (CD면 CD용, 그 외는 LP/바이닐용)
function sectionTemplate(format: string): SectionTmpl[] {
  return /cd/i.test(format) ? DEFAULT_SECTIONS_CD : DEFAULT_SECTIONS_LP;
}

function tmplToSections(format: string): ReportSection[] {
  return sectionTemplate(format).map((s) => ({ id: uid(), title: s.title, image: "", body: s.body, required: s.req }));
}

// 현재 섹션이 아직 손대지 않은 기본 템플릿인지(포맷 바꿀 때 자동 교체 판단용)
function isUntouchedTemplate(sections: ReportSection[]): boolean {
  const match = (t: SectionTmpl[]) =>
    sections.length === t.length &&
    sections.every((s, i) => s.title === t[i].title && s.body === t[i].body && !s.image);
  return match(DEFAULT_SECTIONS_LP) || match(DEFAULT_SECTIONS_CD);
}

const DEFAULT_SUMMARY =
  "골드마인(Goldmine) 표준 등급 기준에 의거하여, 치명적인 손상이 없는 우수한 상태로 판정되어 최종 [ 등급 ] 부여되었습니다.";

const DEFAULT_DISCLAIMER =
  "본 등급은 당사의 객관적 감정 기준표(v1.0)에 따라 육안(외관) 기준으로 부여되었으며, 청음 테스트는 포함하지 않습니다. 수집가의 보관 환경 훼손 또는 재검수 요청 시 당사 기준표에 따라 등급이 재평가될 수 있습니다.";

// "+ 추가" 시 기본 항목이 채워진 템플릿을 제공 (그대로 두거나 지워도 됨)
function blankRecord(): Record {
  return {
    code: "",
    albumTitle: "",
    format: "LP",
    coverImage: "",
    mediaGrade: "",
    sleeveGrade: "",
    sealed: false,
    checks: [
      { id: uid(), label: "속지 여부", value: "O" },
      { id: uid(), label: "가사지 여부", value: "O" },
      { id: uid(), label: "사인 여부", value: "X" },
    ],
    sections: tmplToSections("LP"),
    summary: DEFAULT_SUMMARY,
    disclaimer: DEFAULT_DISCLAIMER,
    updatedAt: "",
  };
}

function newSection(): ReportSection {
  return { id: uid(), title: "", image: "", body: "", required: false };
}

function newCheck(): CheckItem {
  return { id: uid(), label: "", value: "O" };
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [records, setRecords] = useState<Record[]>([]);
  const [draft, setDraft] = useState<Record | null>(null);
  const [originalCode, setOriginalCode] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);

  // 로그인 상태 확인
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authed))
      .catch(() => setAuthed(false));
  }, []);

  // 로그인 후 목록 로드
  useEffect(() => {
    if (authed) loadRecords();
  }, [authed]);

  async function loadRecords() {
    const res = await fetch("/api/records");
    if (res.ok) {
      const d = await res.json();
      setRecords(d.records ?? []);
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      setPassword("");
    } else {
      const d = await res.json().catch(() => ({}));
      setLoginError(d.error ?? "로그인 실패");
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthed(false);
    setDraft(null);
  }

  function editRecord(r: Record) {
    const clone: Record = JSON.parse(JSON.stringify(r));
    if (!Array.isArray(clone.checks)) clone.checks = [];
    if (!Array.isArray(clone.sections)) clone.sections = [];
    if (typeof clone.format !== "string") clone.format = "";
    if (typeof clone.mediaGrade !== "string") clone.mediaGrade = "";
    if (typeof clone.sleeveGrade !== "string") clone.sleeveGrade = "";
    if (typeof clone.sealed !== "boolean") clone.sealed = false;
    setDraft(clone);
    setOriginalCode(r.code);
    setMessage("");
  }

  function addNew() {
    const r = blankRecord();
    r.code = generateCode(records); // 인증번호 자동 발급 (수정 가능)
    setDraft(r);
    setOriginalCode(undefined);
    setMessage("");
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      setMessage("이미지 업로드 실패");
      return null;
    }
    const d = await res.json();
    return d.url as string;
  }

  async function save(keepOpen = false): Promise<boolean> {
    if (!draft) return false;
    if (!draft.code.trim()) {
      setMessage("인증번호를 입력하세요.");
      return false;
    }
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: draft, originalCode }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("✅ 저장 완료!");
      await loadRecords();
      if (keepOpen) {
        setOriginalCode(draft.code); // 계속 편집 (QR 출력 등)
      } else {
        setDraft(null);
        setOriginalCode(undefined);
      }
      return true;
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage(d.error ?? "저장 실패");
      return false;
    }
  }

  async function del(code: string) {
    if (!confirm(`인증번호 "${code}" 음반을 삭제할까요?`)) return;
    await fetch(`/api/records?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    if (draft && originalCode === code) setDraft(null);
    loadRecords();
  }

  // 저장 후 QR 이미지 다운로드 (스캔 시 이 음반 감정 리포트로 연결)
  async function downloadQR() {
    if (!draft) return;
    const codeForQR = draft.code.trim();
    if (!codeForQR) {
      setMessage("인증번호를 입력하세요.");
      return;
    }
    const ok = await save(true); // 먼저 저장(편집 화면 유지)
    if (ok) {
      window.location.href = `/api/qr?code=${encodeURIComponent(codeForQR)}`;
    }
  }

  // Enter 키로 다음 입력칸으로 이동 (여러 줄 입력·체크박스·파일은 제외)
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT") return;
    const type = (target as HTMLInputElement).type;
    if (type === "file" || type === "checkbox") return;
    e.preventDefault();
    const focusables = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]):not([type=file]):not([disabled]):not([readonly]), textarea"
      )
    );
    const idx = focusables.indexOf(target);
    focusables[idx + 1]?.focus();
  }

  // ----- 렌더링 -----

  if (authed === null) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-400">불러오는 중…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <form onSubmit={login} className="w-full max-w-sm">
          <h1 className="text-3xl font-black tracking-widest text-center">MINT 관리자</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            className="mt-8 w-full bg-transparent border border-neutral-600 rounded-xl py-3 px-4 focus:outline-none focus:border-white"
          />
          {loginError && <p className="mt-3 text-red-400 text-sm">{loginError}</p>}
          <button className="mt-4 w-full bg-white text-black font-bold rounded-xl py-3">
            로그인
          </button>
          <a href="/" className="mt-6 block text-center text-xs text-neutral-600 hover:text-neutral-400">
            ← 조회 페이지로
          </a>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-widest">MINT 관리자</h1>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-neutral-400 hover:text-white">조회 페이지</a>
            <button onClick={logout} className="text-sm text-neutral-400 hover:text-white">로그아웃</button>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-2 text-sm">
            {message}
          </div>
        )}

        <div className="mt-8 grid md:grid-cols-[280px_1fr] gap-8">
          {/* 목록 */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-neutral-300">음반 목록 ({records.length})</h2>
              <button onClick={addNew} className="text-sm bg-white text-black font-bold rounded-lg px-3 py-1">
                + 추가
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {records.map((r) => (
                <li
                  key={r.code}
                  className={`rounded-lg border px-3 py-2 cursor-pointer transition ${
                    originalCode === r.code ? "border-white bg-neutral-900" : "border-neutral-800 hover:border-neutral-600"
                  }`}
                  onClick={() => editRecord(r)}
                >
                  <div className="font-mono text-sm text-emerald-400">{r.code}</div>
                  <div className="text-sm text-neutral-300 truncate">{r.albumTitle || "(제목 없음)"}</div>
                </li>
              ))}
              {records.length === 0 && (
                <li className="text-sm text-neutral-600">등록된 음반이 없습니다.</li>
              )}
            </ul>
          </div>

          {/* 편집 폼 */}
          <div>
            {!draft ? (
              <p className="text-neutral-600">왼쪽에서 음반을 선택하거나 &ldquo;+ 추가&rdquo;를 누르세요.</p>
            ) : (
              <div className="space-y-6" onKeyDown={handleFormKeyDown}>
                {/* 상단 빠른 저장 바 */}
                <div className="flex items-center gap-2 sticky top-0 z-10 bg-black/85 backdrop-blur py-2 -mx-1 px-1">
                  <button
                    onClick={() => save()}
                    disabled={saving}
                    className="bg-white text-black font-bold rounded-lg px-5 py-2 disabled:opacity-50"
                  >
                    {saving ? "저장 중…" : "저장"}
                  </button>
                  <button
                    onClick={downloadQR}
                    disabled={saving}
                    className="border border-white/40 font-bold rounded-lg px-5 py-2 hover:bg-white/10 disabled:opacity-50"
                    title="저장 후 QR 이미지가 다운로드됩니다"
                  >
                    QR 출력
                  </button>
                  <span className="ml-auto text-xs text-neutral-500 font-mono">{draft.code}</span>
                </div>

                <Field label="인증번호 (자동 발급 · 고정)">
                  <input
                    value={draft.code}
                    readOnly
                    className="input font-mono bg-neutral-900 text-emerald-400 cursor-not-allowed"
                  />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    식별 번호라 자동 발급되며 수정할 수 없습니다.
                  </p>
                </Field>

                <div className="grid grid-cols-[1fr_120px] gap-4">
                  <Field label="음반명">
                    <input
                      value={draft.albumTitle}
                      onChange={(e) => setDraft({ ...draft, albumTitle: e.target.value })}
                      className="input"
                      placeholder="신해철 2집 [Myself]"
                    />
                  </Field>
                  <Field label="포맷">
                    <input
                      value={draft.format}
                      onChange={(e) => {
                        const format = e.target.value;
                        // 아직 손대지 않은 기본 섹션이면 포맷에 맞는 템플릿으로 자동 교체
                        const sections = isUntouchedTemplate(draft.sections)
                          ? tmplToSections(format)
                          : draft.sections;
                        setDraft({ ...draft, format, sections });
                      }}
                      className="input"
                      placeholder="LP"
                      list="format-list"
                    />
                    <datalist id="format-list">
                      <option value="LP" />
                      <option value="CD" />
                    </datalist>
                  </Field>
                </div>

                <Field label="대표(전체) 사진">
                  <ImageInput
                    value={draft.coverImage ?? ""}
                    onUpload={uploadImage}
                    onChange={(url) => setDraft({ ...draft, coverImage: url })}
                  />
                </Field>

                {/* 등급 (알판/자켓) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-neutral-300">등급</h3>
                    <button
                      type="button"
                      onClick={() => setShowGuide(true)}
                      className="text-xs px-2 py-1 rounded border border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                    >
                      골드마인 등급표 보기
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label={`${gradeLabels(draft.format).media} 등급`}>
                      <input
                        value={draft.mediaGrade}
                        onChange={(e) => {
                          const v = e.target.value;
                          const next = { ...draft, mediaGrade: v };
                          // 등급을 바꾸면 총평도 실시간으로 그 등급에 맞게 다시 씀
                          const s = combinedSummary(v, draft.sleeveGrade, draft.sealed, draft.format);
                          if (s) next.summary = s;
                          setDraft(next);
                        }}
                        className="input"
                        placeholder="Near Mint (NM / M-)"
                        list="grade-list"
                      />
                    </Field>
                    <Field label={`${gradeLabels(draft.format).sleeve} 등급`}>
                      <input
                        value={draft.sleeveGrade}
                        onChange={(e) => {
                          const v = e.target.value;
                          const next = { ...draft, sleeveGrade: v };
                          // 등급을 바꾸면 총평도 실시간으로 그 등급에 맞게 다시 씀
                          const s = combinedSummary(draft.mediaGrade, v, draft.sealed, draft.format);
                          if (s) next.summary = s;
                          setDraft(next);
                        }}
                        className="input"
                        placeholder="Very Good Plus (VG+)"
                        list="grade-list"
                      />
                    </Field>
                    <datalist id="grade-list">
                      {GRADES.map((g) => (
                        <option key={g.code} value={g.name} />
                      ))}
                    </datalist>
                  </div>
                  {/cd/i.test(draft.format) && (
                    <p className="mt-2 text-xs text-neutral-500">
                      골드마인 기준상 CD는 <b>케이스를 등급에서 제외</b>합니다. 자켓 등급은 부클릿·속지 기준이며, 케이스 상태는 섹션 사진·코멘트로만 남깁니다.
                    </p>
                  )}
                </div>

                {/* 음반 메타정보 (선택) */}
                <div>
                  <h3 className="font-bold text-neutral-300 mb-3">음반 메타정보 (선택 · 비우면 표시 안 됨)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      value={draft.releaseYear ?? ""}
                      onChange={(e) => setDraft({ ...draft, releaseYear: e.target.value })}
                      className="input"
                      placeholder="발매연도 (예: 1991)"
                    />
                    <input
                      value={draft.label ?? ""}
                      onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                      className="input"
                      placeholder="레이블 (예: 서울음반)"
                    />
                    <input
                      value={draft.catalogNo ?? ""}
                      onChange={(e) => setDraft({ ...draft, catalogNo: e.target.value })}
                      className="input"
                      placeholder="카탈로그 번호"
                    />
                    <input
                      value={draft.country ?? ""}
                      onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                      className="input"
                      placeholder="발매국 (예: 한국)"
                    />
                  </div>
                </div>

                {/* 감정 정보 (선택) */}
                <div>
                  <h3 className="font-bold text-neutral-300 mb-3">감정 정보 (선택)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="감정일자">
                      <input
                        type="date"
                        value={draft.gradedDate ?? ""}
                        onChange={(e) => setDraft({ ...draft, gradedDate: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="감정사 이름/서명">
                      <input
                        value={draft.graderName ?? ""}
                        onChange={(e) => setDraft({ ...draft, graderName: e.target.value })}
                        className="input"
                        placeholder="예: MINT 감정팀 / 홍길동"
                      />
                    </Field>
                  </div>
                </div>

                {/* O/X 확인 항목 */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-300">확인 항목 (O/X)</h3>
                    <button
                      onClick={() => setDraft({ ...draft, checks: [...(draft.checks ?? []), newCheck()] })}
                      className="text-sm bg-neutral-800 rounded-lg px-3 py-1 hover:bg-neutral-700"
                    >
                      + 항목
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(draft.checks ?? []).map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <input
                          value={c.label}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              checks: draft.checks.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)),
                            })
                          }
                          className="input flex-1"
                          placeholder="속지 여부"
                        />
                        <div className="flex rounded-lg overflow-hidden border border-neutral-700">
                          {["O", "X"].map((v) => (
                            <button
                              key={v}
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  checks: draft.checks.map((x) => (x.id === c.id ? { ...x, value: v } : x)),
                                })
                              }
                              className={`w-10 py-2 font-bold ${
                                c.value === v
                                  ? v === "O"
                                    ? "bg-emerald-500 text-black"
                                    : "bg-red-500 text-black"
                                  : "bg-transparent text-neutral-400 hover:bg-neutral-800"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() =>
                            setDraft({ ...draft, checks: draft.checks.filter((x) => x.id !== c.id) })
                          }
                          className="text-xs text-red-400 hover:text-red-300 px-2"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                    {(draft.checks ?? []).length === 0 && (
                      <p className="text-sm text-neutral-600">확인 항목이 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* 상세 섹션 */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-neutral-300">상세 감정 리포트 섹션</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPhotoGuide(true)}
                        className="text-sm border border-emerald-600/60 text-emerald-300 rounded-lg px-3 py-1 hover:bg-emerald-900/30"
                        title="흠집이 드러나게 찍는 방법과 촬영 체크리스트"
                      >
                        📷 사진 촬영 가이드
                      </button>
                      <button
                        onClick={() => setDraft({ ...draft, sections: [...draft.sections, newSection()] })}
                        className="text-sm bg-neutral-800 rounded-lg px-3 py-1 hover:bg-neutral-700"
                      >
                        + 섹션
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    📷 사진 촬영 가이드를 참고해 부위별로 촬영하고, 각 섹션에 사진과 설명을 올리세요.
                  </p>
                  <div className="mt-4 space-y-4">
                    {draft.sections.map((s, i) => (
                      <div key={s.id} className="rounded-xl border border-neutral-800 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500">섹션 {i + 1}</span>
                            {s.required && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  s.image ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                                }`}
                              >
                                📷 사진 필수{s.image ? "" : " · 미첨부"}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setDraft({ ...draft, sections: draft.sections.filter((x) => x.id !== s.id) })
                            }
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            삭제
                          </button>
                        </div>
                        <input
                          value={s.title}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              sections: draft.sections.map((x) =>
                                x.id === s.id ? { ...x, title: e.target.value } : x
                              ),
                            })
                          }
                          className="input"
                          placeholder="1. 자켓(Cover) 상태"
                        />
                        <MultiImageInput
                          values={s.images ?? (s.image ? [s.image] : [])}
                          onUpload={uploadImage}
                          onChange={(imgs) =>
                            setDraft({
                              ...draft,
                              sections: draft.sections.map((x) =>
                                x.id === s.id ? { ...x, images: imgs, image: undefined } : x
                              ),
                            })
                          }
                        />
                        <textarea
                          value={s.body}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              sections: draft.sections.map((x) =>
                                x.id === s.id ? { ...x, body: e.target.value } : x
                              ),
                            })
                          }
                          rows={3}
                          className="input"
                          placeholder="상태 설명…"
                        />
                      </div>
                    ))}
                    {draft.sections.length === 0 && (
                      <p className="text-sm text-neutral-600">섹션이 없습니다.</p>
                    )}
                  </div>
                </div>

                <Field label="총평 (Grader's Summary)">
                  <textarea
                    value={draft.summary}
                    onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                    rows={3}
                    className="input"
                  />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    알판/자켓 등급을 바꾸면 총평이 자동으로 그 등급에 맞게 다시 써집니다. 직접 손본 내용은 다음에 등급을 바꿀 때 초기화되니, <b>등급을 먼저 정하고 총평은 마지막에 다듬으세요.</b>
                  </p>
                </Field>

                <Field label="면책 및 재검수 조항">
                  <textarea
                    value={draft.disclaimer}
                    onChange={(e) => setDraft({ ...draft, disclaimer: e.target.value })}
                    rows={3}
                    className="input"
                  />
                </Field>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => save()}
                    disabled={saving}
                    className="bg-white text-black font-bold rounded-xl px-6 py-3 disabled:opacity-50"
                  >
                    {saving ? "저장 중…" : "저장"}
                  </button>
                  <button
                    onClick={downloadQR}
                    disabled={saving}
                    className="border border-white/40 font-bold rounded-xl px-6 py-3 hover:bg-white/10 disabled:opacity-50"
                    title="저장 후 QR 이미지가 다운로드됩니다"
                  >
                    QR 출력
                  </button>
                  <button
                    onClick={() => {
                      setDraft(null);
                      setOriginalCode(undefined);
                    }}
                    className="text-neutral-400 hover:text-white"
                  >
                    취소
                  </button>
                  {originalCode && (
                    <button
                      onClick={() => del(originalCode)}
                      className="ml-auto text-red-400 hover:text-red-300"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 사진 촬영 가이드 모달 */}
      {showPhotoGuide && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setShowPhotoGuide(false)}>
          <div
            className="bg-neutral-950 border border-neutral-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between sticky top-0 bg-neutral-950 pb-3">
              <h2 className="text-lg font-bold">📷 사진 촬영 가이드</h2>
              <button onClick={() => setShowPhotoGuide(false)} className="text-neutral-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="space-y-5 text-sm leading-relaxed">
              <div className="rounded-xl border border-emerald-700/50 bg-emerald-900/15 p-4">
                <h3 className="font-bold text-emerald-300 mb-2">핵심 조명법 — 흠집을 드러내라</h3>
                <p className="text-neutral-300">
                  방을 살짝 어둡게 하고, <b className="text-white">스탠드나 휴대폰 손전등을 판 옆에서 낮게 비스듬히</b> 비춥니다.
                  판을 요리조리 기울이면 흠집이 <b className="text-white">반짝하고 선으로</b> 드러나요 — 그 순간을 찍습니다.
                </p>
                <p className="mt-2 text-red-300">
                  ✗ 형광등을 정면으로 놓고 찍으면 스크래치가 다 숨어버립니다. (&ldquo;숨기려고 찍었네&rdquo; 소리 들어요) — 정반대로 가세요.
                </p>

                {/* 조명법 도식 */}
                <svg viewBox="0 0 360 210" className="mt-4 w-full h-auto" role="img" aria-label="옆에서 낮게 비스듬히 빛을 비춰 흠집을 선으로 드러내는 촬영 도식">
                  {/* 바닥 그림자 */}
                  <ellipse cx="205" cy="182" rx="120" ry="10" fill="#000000" opacity="0.35" />
                  {/* 판(레코드) */}
                  <ellipse cx="205" cy="165" rx="118" ry="20" fill="#1f2937" stroke="#9ca3af" strokeWidth="1.5" />
                  <ellipse cx="205" cy="165" rx="80" ry="13" fill="none" stroke="#374151" strokeWidth="1" />
                  <ellipse cx="205" cy="165" rx="9" ry="2.6" fill="#0a0a0a" stroke="#9ca3af" strokeWidth="1" />
                  {/* 빛 번짐 웨지 */}
                  <path d="M92 158 L250 156 L250 168 L92 172 Z" fill="#fbbf24" opacity="0.10" />
                  {/* 긁힘 글로우 + 밝은 선 */}
                  <line x1="150" y1="162" x2="243" y2="158" stroke="#34d399" strokeWidth="8" opacity="0.25" strokeLinecap="round" />
                  <line x1="150" y1="162" x2="243" y2="158" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
                  {/* 손전등 (왼쪽·낮게·비스듬히) */}
                  <g transform="rotate(-10 70 150)">
                    <rect x="26" y="142" width="46" height="16" rx="4" fill="#d4d4d4" />
                    <rect x="70" y="139" width="12" height="22" rx="2" fill="#a3a3a3" />
                  </g>
                  {/* 빛줄기 (비스듬한 점선) */}
                  <line x1="88" y1="150" x2="235" y2="159" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.85" />
                  <line x1="88" y1="156" x2="165" y2="164" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.6" />
                  {/* 카메라(휴대폰) 위에서 */}
                  <g transform="rotate(12 205 70)">
                    <rect x="186" y="40" width="34" height="58" rx="6" fill="#262626" stroke="#9ca3af" strokeWidth="1.3" />
                    <circle cx="203" cy="54" r="4.5" fill="#111827" stroke="#e5e7eb" strokeWidth="1.2" />
                    <rect x="196" y="86" width="14" height="4" rx="2" fill="#4b5563" />
                  </g>
                  {/* 시선(카메라 → 긁힘) */}
                  <line x1="205" y1="100" x2="200" y2="158" stroke="#9ca3af" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.7" />
                  {/* 라벨 */}
                  <text x="20" y="185" fill="#fbbf24" fontSize="12" fontWeight="700">손전등 — 옆·낮게</text>
                  <text x="255" y="150" fill="#6ee7b7" fontSize="12" fontWeight="700">긁힘이 선으로 반짝!</text>
                  <text x="243" y="35" fill="#e5e7eb" fontSize="12" fontWeight="700">📷 카메라</text>
                  <text x="120" y="205" fill="#9ca3af" fontSize="11">판을 요리조리 기울이며 그 순간을 촬영</text>
                </svg>
              </div>

              <div>
                <h3 className="font-bold text-neutral-200 mb-2">기본 규칙</h3>
                <ul className="list-disc pl-5 space-y-1 text-neutral-300">
                  <li>흐리게 찍지 말 것 — 또렷하게</li>
                  <li>흠집 하나 찾으면 두 장: <b className="text-white">어디 있는지 보이는 전체 사진 + 바짝 당긴 사진</b></li>
                  <li>매번 비슷한 각도·거리로 (제각각이면 비교가 안 됩니다)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-neutral-200 mb-2">등급을 가르는 결정타</h3>
                <ul className="space-y-2 text-neutral-300">
                  <li><span className="text-emerald-300 font-semibold">옆에서 빛 준 판/디스크 표면</span> → 최고 등급이냐 아니냐를 가름</li>
                  <li><span className="text-emerald-300 font-semibold">가운데 각인·구멍 주변 금·디스크 변색</span> → 진짜 원판인지, 재생 되는지</li>
                  <li><span className="text-emerald-300 font-semibold">자켓 동그란 자국·모서리·책자 들뜸</span> → 겉(자켓) 등급</li>
                </ul>
              </div>

              <p className="text-xs text-neutral-500">
                아래 섹션 목록(LP 14항목 / CD 13항목)의 각 부위를 위 방법으로 촬영해 사진과 설명을 올리세요. 흠집은 전체 사진 + 바짝 당긴 사진 두 장으로.
              </p>
            </div>
          </div>
        </div>
      )}

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
                if (draft && matchGrade(draft.mediaGrade)?.code === g.code) tags.push("알판");
                if (draft && matchGrade(draft.sleeveGrade)?.code === g.code) tags.push("자켓");
                const isCurrent = tags.length > 0;
                return (
                  <li key={g.code} className={`rounded-xl border p-3 ${isCurrent ? "border-white bg-white/10" : "border-neutral-800"}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: g.color }} />
                      <span className="font-bold" style={{ color: g.color }}>{g.name}</span>
                      {isCurrent && <span className="ml-auto text-xs text-white/60">현재 · {tags.join("/")}</span>}
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

      <style jsx global>{`
        .input {
          width: 100%;
          background: transparent;
          border: 1px solid #404040;
          border-radius: 0.5rem;
          padding: 0.6rem 0.75rem;
          color: white;
          font-size: 0.95rem;
        }
        .input:focus {
          outline: none;
          border-color: white;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-neutral-400 mb-2">{label}</span>
      {children}
    </label>
  );
}

function ImageInput({
  value,
  onUpload,
  onChange,
}: {
  value: string;
  onUpload: (file: File) => Promise<string | null>;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="max-h-40 rounded-lg border border-neutral-800 object-contain bg-neutral-950" />
      ) : (
        <div className="h-24 rounded-lg border border-dashed border-neutral-700 flex items-center justify-center text-neutral-600 text-sm">
          이미지 없음
        </div>
      )}
      <div className="flex items-center gap-3">
        <label className="text-sm bg-neutral-800 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-neutral-700">
          {busy ? "업로드 중…" : "사진 업로드"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              const url = await onUpload(file);
              setBusy(false);
              if (url) onChange(url);
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <button onClick={() => onChange("")} className="text-sm text-neutral-400 hover:text-white">
            제거
          </button>
        )}
      </div>
    </div>
  );
}

// 섹션용: 사진 여러 장 (여러 개 선택·추가·개별 삭제)
function MultiImageInput({
  values,
  onUpload,
  onChange,
}: {
  values: string[];
  onUpload: (file: File) => Promise<string | null>;
  onChange: (urls: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-24 rounded-lg border border-neutral-800 object-cover bg-neutral-950" />
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center"
                aria-label="사진 삭제"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="inline-block text-sm bg-neutral-800 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-neutral-700">
        {busy ? "업로드 중…" : "＋ 사진 추가"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            if (!files.length) return;
            setBusy(true);
            const urls: string[] = [];
            for (const f of files) {
              const url = await onUpload(f);
              if (url) urls.push(url);
            }
            setBusy(false);
            if (urls.length) onChange([...values, ...urls]);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
