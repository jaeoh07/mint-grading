// 골드마인(Goldmine) 표준 — Discogs가 사용하는 정식 8등급.
// 숫자는 쓰지 않고 문자 등급만 사용. 알판(Media)/자켓(Sleeve)에 각각 적용.

export type Grade = {
  code: string; // 매칭용 코드 (예: "NM")
  name: string; // 표시명 (예: "Near Mint (NM)")
  color: string; // 등급 글자색
  mediaDesc: string; // 알판(Media) 기준 — 육안(외관)
  sleeveDesc: string; // 자켓(Sleeve) 기준 — 육안(외관)
  tokens: string[]; // 추가 매칭 키워드
};

// 좋은 등급 → 낮은 등급 (청음은 하지 않으므로 모두 외관 기준)
export const GRADES: Grade[] = [
  {
    code: "M", name: "Mint (M)", color: "#22d3ee", tokens: ["MINT"],
    mediaDesc: "표면에 흠·스커프가 전혀 없는 완벽한 상태. 신품 수준으로 극히 드물게만 부여.",
    sleeveDesc: "접힘·마모·변색·링웨어가 전혀 없는 완벽한 상태. 밀봉인 경우도 있음.",
  },
  {
    code: "NM", name: "Near Mint (NM / M-)", color: "#34d399", tokens: ["NEARMINT", "M-"],
    mediaDesc: "육안상 사용 흔적이 없고 눈에 띄는 흠이 없는 거의 완벽한 표면.",
    sleeveDesc: "접힘·씸 터짐·구멍·링웨어 등 눈에 띄는 결함이 없음. 아주 경미한 취급 흔적만 허용.",
  },
  {
    code: "VG+", name: "Very Good Plus (VG+)", color: "#eab308", tokens: ["VERYGOODPLUS"],
    mediaDesc: "경미한 스커프·잔기스가 있으나 표면 상태는 전반적으로 양호. (NM 가치의 약 50%)",
    sleeveDesc: "약간의 사용감·모서리 눌림, 경미한 링웨어. 컷아웃 홀·자국이 있을 수 있음.",
  },
  {
    code: "VG", name: "Very Good (VG)", color: "#f59e0b", tokens: ["VERYGOOD"],
    mediaDesc: "육안으로 보이는 스크래치·표면 마모가 있으며, 손톱에 걸리는 스크래치도 존재할 수 있음. (NM의 약 25%)",
    sleeveDesc: "마모·링웨어·자국이 뚜렷. 라벨·자켓에 필기·스티커(또는 그 자국)가 있을 수 있음.",
  },
  {
    code: "G+", name: "Good Plus (G+)", color: "#f97316", tokens: ["GOODPLUS"],
    mediaDesc: "스크래치·홈 마모가 다수로 표면 상태가 눈에 띄게 좋지 않음. (NM의 약 10~15%)",
    sleeveDesc: "씸 터짐(특히 하단·등면), 필기·테이프·링웨어 등 손상이 뚜렷.",
  },
  {
    code: "G", name: "Good (G)", color: "#ef4444", tokens: ["GOOD"],
    mediaDesc: "G+와 유사하나 스크래치·마모가 더 뚜렷하게 다수 존재. (NM의 약 10%)",
    sleeveDesc: "마모·씸 터짐·필기 등 손상이 뚜렷하며 전반적으로 낡음.",
  },
  {
    code: "F", name: "Fair (F)", color: "#b91c1c", tokens: ["FAIR"],
    mediaDesc: "표면 손상이 심함(균열·심한 스크래치 등). (NM의 0~5%)",
    sleeveDesc: "심한 마모·씸 터짐·얼룩·필기 등으로 손상이 큼.",
  },
  {
    code: "P", name: "Poor (P)", color: "#a8a29e", tokens: ["POOR"],
    mediaDesc: "균열·심한 휨 등 심각한 손상 상태. 소장·자료용 수준. (NM의 0~5%)",
    sleeveDesc: "세 변이 모두 터지거나 물 얼룩·심한 손상. 자켓이 음반을 겨우 담고 있는 수준.",
  },
];

// 페이지 배경: 모든 등급색과 어울리는 단일 다크 톤
export const PAGE_BACKGROUND =
  "radial-gradient(1100px 550px at 50% -15%, #1c2230 0%, #0d1017 68%)";

const norm = (x: string) => (x ?? "").toUpperCase().replace(/\s+/g, "");

// 등급 문자열에서 등급을 찾음. 1) 이름 완전일치 → 2) 키워드 → 3) 코드 포함(긴 코드 우선)
export function matchGrade(grade: string): Grade | null {
  const s = norm(grade);
  if (!s) return null;
  const exact = GRADES.find((g) => norm(g.name) === s);
  if (exact) return exact;
  for (const g of GRADES) {
    if (g.tokens.some((t) => s.includes(norm(t)))) return g;
  }
  const byCodeLen = [...GRADES].sort((a, b) => b.code.length - a.code.length);
  for (const g of byCodeLen) {
    if (s.includes(norm(g.code))) return g;
  }
  return null;
}

export function gradeColor(grade: string): string {
  return matchGrade(grade)?.color ?? "#ffffff";
}

// 밀봉(Sealed) 안내
export const SEALED_LABEL = "Still Sealed (미개봉)";
export const SEALED_COLOR = "#e5e7eb";
export const SEALED_SUMMARY =
  "본 음반은 공장 밀봉(Still Sealed) 상태로, 개봉 이력 없이 외관·씰 기준으로 확인되었습니다. 밀봉 특성상 내부 알판은 미검수입니다.";

// 등급별 총평 초안 (관리자에서 알판 등급 선택 시 자동으로 채워짐 — 수정 가능)
const GRADE_SUMMARY: { [code: string]: string } = {
  M: "본 음반은 사용 흔적이 전혀 확인되지 않는 신품 수준으로, 골드마인 표준상 최상급 [Mint]으로 판정되었습니다.",
  NM: "본 음반은 골드마인 표준 등급 기준에 의거하여 치명적인 손상이 없는 우수한 상태로 판정되어, [Near Mint]가 부여되었습니다.",
  "VG+": "본 음반은 경미한 흠·사용감 외 전반적 보존 상태가 양호하여 [Very Good Plus]로 판정되었습니다.",
  VG: "본 음반은 눈에 보이는 스크래치·마모가 확인되나 전반적 보존은 유지되는 상태로 [Very Good]으로 판정되었습니다.",
  "G+": "본 음반은 사용감·표면 마모가 뚜렷한 상태로 [Good Plus]로 판정되었습니다.",
  G: "본 음반은 스크래치·마모가 다수 확인되는 상태로 [Good]으로 판정되었습니다.",
  F: "본 음반은 손상이 뚜렷하여 [Fair]로 판정되었습니다.",
  P: "본 음반은 심각한 손상이 있어 소장·자료용 수준인 [Poor]로 판정되었습니다.",
};

export function gradeSummary(grade: string): string {
  const g = matchGrade(grade);
  return g ? GRADE_SUMMARY[g.code] ?? "" : "";
}

// 알판(Media)·자켓(Sleeve) 등급을 모두 반영한 총평 초안
export function combinedSummary(mediaGrade: string, sleeveGrade: string, sealed: boolean): string {
  if (sealed) return SEALED_SUMMARY;
  const m = matchGrade(mediaGrade);
  const s = matchGrade(sleeveGrade);
  const base = "본 음반은 골드마인(Goldmine) 표준 등급 기준에 의거하여, ";
  if (m && s) {
    if (m.code === s.code) {
      return `${base}알판(Media)·자켓(Sleeve) 모두 [${m.name}]으로 판정되었습니다.`;
    }
    return `${base}알판(Media)은 [${m.name}], 자켓(Sleeve)은 [${s.name}]으로 판정되었습니다.`;
  }
  if (m) return `${base}알판(Media) [${m.name}]으로 판정되었습니다.`;
  if (s) return `${base}자켓(Sleeve) [${s.name}]으로 판정되었습니다.`;
  return "";
}

// 현재 총평이 자동 생성 초안인지(수동 편집본은 덮어쓰지 않기 위함)
export function isAutoGradeSummary(s: string): boolean {
  const t = (s ?? "").trim();
  if (!t) return false;
  return t === SEALED_SUMMARY.trim() || Object.values(GRADE_SUMMARY).some((v) => v.trim() === t);
}

// ── 등급별 섹션 초안 ─────────────────────────────────────────────
// 관리자에서 알판/자켓 등급을 고르면, 그 등급에 맞는 섹션 상세설명 초안이 자동으로 채워짐.
// (손으로 쓴 내용은 덮어쓰지 않음 — isKnownSectionDraft로 판별)

// 디스크(알판) 섹션 초안 — 알판(Media) 등급 기준
export const DISC_DRAFT: { [code: string]: string } = {
  M: "표면에 흠·스커프가 전혀 없는 완벽한 상태. 신품 수준의 광택.",
  NM: "육안상 사용 흔적이 없고 눈에 띄는 흠이 없는 거의 완벽한 표면.",
  "VG+": "경미한 잔기스·스커프가 있으나 표면 상태는 전반적으로 양호.",
  VG: "육안으로 보이는 스크래치·표면 마모가 확인됨. (위치·정도는 사진 참고)",
  "G+": "스크래치·표면 마모가 다수 확인되어 표면 상태가 눈에 띄게 좋지 않음.",
  G: "스크래치·마모가 다수로 표면 상태가 좋지 않음.",
  F: "표면 손상이 심함(심한 스크래치·균열 등).",
  P: "균열·심한 손상 등으로 상태가 매우 나쁨. 소장·자료용 수준.",
};

// 자켓 앞/뒤 '초반 설명' 초안 — 자켓(Sleeve) 등급 기준
// VG+ 이하(사용감·마모 있음)는 빈 문자열 → "깨끗함" 같은 과장 문구를 넣지 않고 사진으로 대체,
// 하자는 아래 개별 섹션에 따로 기재한다.
export const SLEEVE_INTRO_DRAFT: { [code: string]: string } = {
  M: "접힘·마모·변색·링웨어가 전혀 없는 완벽한 상태. 인쇄 선명.",
  NM: "눈에 띄는 결함 없이 깨끗함. 인쇄 선명하며 변색·오염 없음.",
  "VG+": "",
  VG: "",
  "G+": "",
  G: "",
  F: "",
  P: "",
};

// 섹션 제목으로 종류 판별 (디스크 섹션 우선)
const DISC_TITLE = /디스크|재생면|하판|상판|레이블면|알판|음반면|A면|B면/i;
const SLEEVE_INTRO_TITLE = /(자켓|커버|부클릿|인레이|슬리브).*(앞|뒤)|앞면|뒷면/;

// 이 섹션에 등급 기준 초안이 있으면 반환, 없으면 null(등급 자동초안 대상 아님)
export function sectionDraftFor(
  title: string,
  mediaGrade: string,
  sleeveGrade: string
): string | null {
  const t = title ?? "";
  if (DISC_TITLE.test(t)) {
    const g = matchGrade(mediaGrade);
    return g ? DISC_DRAFT[g.code] ?? "" : null;
  }
  if (SLEEVE_INTRO_TITLE.test(t)) {
    const g = matchGrade(sleeveGrade);
    return g ? SLEEVE_INTRO_DRAFT[g.code] ?? "" : null;
  }
  return null;
}

// 어떤 본문이 '자동 생성된 초안'인지(수동 편집본 보호용) — 등급 초안 문구 전체 집합
const GRADE_DRAFT_STRINGS = new Set<string>(
  [...Object.values(DISC_DRAFT), ...Object.values(SLEEVE_INTRO_DRAFT)]
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
);
export function isGradeDraftBody(body: string): boolean {
  return GRADE_DRAFT_STRINGS.has((body ?? "").trim());
}
