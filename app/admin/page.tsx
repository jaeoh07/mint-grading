"use client";

import { useEffect, useState } from "react";
import type { CheckItem, Record, ReportSection } from "@/lib/store";
import { GRADES, matchGrade } from "@/lib/grade";

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
const DEFAULT_SECTIONS: { title: string; body: string }[] = [
  { title: "자켓 앞면", body: "전반적인 보존 상태 양호. 인쇄 선명하며 변색·오염 흔적 없음." },
  { title: "자켓 뒷면", body: "변색·습기 흔적 없이 깨끗함. 크레딧/트랙 정보 인쇄 양호." },
  { title: "모서리 마모", body: "네 모서리 상태 양호. (마모 있을 시 위치·크기 기재)" },
  { title: "자켓 눌림·번짐·헤어라인", body: "표면 눌림(Crease)·잉크 번짐 없음." },
  { title: "디스크 앞면(A면) 스크래치", body: "육안상 특이 스크래치 없음. (있을 시 위치·정도 기재)" },
  { title: "디스크 뒷면(B면) 스크래치", body: "육안상 특이 스크래치 없음. 표면 광택 양호." },
];

const DEFAULT_SUMMARY =
  "골드마인(Goldmine) 표준 등급 기준에 의거하여, 치명적인 손상이 없는 우수한 상태로 판정되어 최종 [ 등급 ] 부여되었습니다.";

const DEFAULT_DISCLAIMER =
  "본 등급은 당사의 객관적 가이드라인(Rubric v1.0)에 따라 육안(외관) 기준으로 부여되었으며, 청음 테스트는 포함하지 않습니다. 수집가의 보관 환경 훼손 또는 재검수 요청 시 당사 기준표에 따라 등급이 재평가될 수 있습니다.";

// "+ 추가" 시 기본 항목이 채워진 템플릿을 제공 (그대로 두거나 지워도 됨)
function blankRecord(): Record {
  return {
    code: "",
    albumTitle: "",
    format: "LP",
    coverImage: "",
    finalGrade: "",
    gradeNumber: "",
    checks: [
      { id: uid(), label: "속지 여부", value: "O" },
      { id: uid(), label: "가사지 여부", value: "O" },
    ],
    sections: DEFAULT_SECTIONS.map((s) => ({ id: uid(), title: s.title, image: "", body: s.body })),
    summary: DEFAULT_SUMMARY,
    disclaimer: DEFAULT_DISCLAIMER,
    updatedAt: "",
  };
}

function newSection(): ReportSection {
  return { id: uid(), title: "", image: "", body: "" };
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
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

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
      setMessage("저장되었습니다.");
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

  // 링크(yes24·나무위키 등)에서 제목·표지·포맷 자동 불러오기
  async function importFromUrl() {
    if (!draft) return;
    const url = importUrl.trim();
    if (!url) return;
    setImporting(true);
    setMessage("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage(d.error ?? "불러오기 실패");
        return;
      }
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              albumTitle: d.albumTitle || prev.albumTitle,
              coverImage: d.coverImage || prev.coverImage,
              format: d.format || prev.format,
            }
          : prev
      );
      setMessage("불러왔습니다. 제목·표지를 확인하고 필요시 수정하세요.");
      setImportUrl("");
    } finally {
      setImporting(false);
    }
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
              <div className="space-y-6">
                {/* 링크로 자동 불러오기 */}
                <div className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-4">
                  <label className="block text-sm text-neutral-300 mb-2 font-bold">
                    🔗 링크로 불러오기 (yes24 · 나무위키 등)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          importFromUrl();
                        }
                      }}
                      className="input"
                      placeholder="상품/문서 페이지 주소 붙여넣기"
                    />
                    <button
                      type="button"
                      onClick={importFromUrl}
                      disabled={importing || !importUrl.trim()}
                      className="shrink-0 bg-white text-black font-bold rounded-lg px-4 disabled:opacity-40"
                    >
                      {importing ? "불러오는 중…" : "불러오기"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    제목·표지 사진·포맷을 자동으로 채웁니다. (등급·상세는 직접 감정하세요)
                  </p>
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
                      onChange={(e) => setDraft({ ...draft, format: e.target.value })}
                      className="input"
                      placeholder="LP"
                      list="format-list"
                    />
                    <datalist id="format-list">
                      <option value="LP" />
                      <option value="CD" />
                      <option value="EP" />
                      <option value="7인치" />
                      <option value="카세트" />
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

                <div className="grid grid-cols-2 gap-4">
                  <Field label="최종 등급 (목록에서 선택)">
                    <input
                      value={draft.finalGrade}
                      onChange={(e) => {
                        const v = e.target.value;
                        const g = matchGrade(v);
                        // 등급이 매칭되면 등급 숫자 자동 입력(미개봉은 숫자 없음), 매칭 안 되면 기존값 유지
                        const gradeNumber = g
                          ? g.rank != null
                            ? `${g.rank}등급`
                            : ""
                          : draft.gradeNumber;
                        setDraft({ ...draft, finalGrade: v, gradeNumber });
                      }}
                      className="input"
                      placeholder="Near Mint (NM)"
                      list="grade-list"
                    />
                    <datalist id="grade-list">
                      {GRADES.map((g) => (
                        <option key={g.code} value={g.name} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="등급 숫자 (자동)">
                    <input
                      value={draft.gradeNumber}
                      onChange={(e) => setDraft({ ...draft, gradeNumber: e.target.value })}
                      className="input"
                      placeholder="등급 선택 시 자동 입력"
                    />
                  </Field>
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
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-300">상세 감정 리포트 섹션</h3>
                    <button
                      onClick={() => setDraft({ ...draft, sections: [...draft.sections, newSection()] })}
                      className="text-sm bg-neutral-800 rounded-lg px-3 py-1 hover:bg-neutral-700"
                    >
                      + 섹션
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {draft.sections.map((s, i) => (
                      <div key={s.id} className="rounded-xl border border-neutral-800 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-500">섹션 {i + 1}</span>
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
                        <ImageInput
                          value={s.image ?? ""}
                          onUpload={uploadImage}
                          onChange={(url) =>
                            setDraft({
                              ...draft,
                              sections: draft.sections.map((x) => (x.id === s.id ? { ...x, image: url } : x)),
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
