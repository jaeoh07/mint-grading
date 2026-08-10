// 골드마인(Goldmine) 표준 기반 10등급 사전.
// - 각 등급마다 고유 색(등급 "글자"에만 사용)
// - 페이지 배경은 10색 모두와 어울리는 단일 톤으로 통일

export type Grade = {
  code: string; // 매칭용 코드 (예: "NM")
  name: string; // 표시명 (예: "Near Mint")
  color: string; // 등급 글자색
  desc: string; // 간단 설명
  rank: number | null; // 등급 숫자 (미개봉은 숫자 없이 null)
  tokens: string[]; // 추가 매칭 키워드 (대문자·공백제거 기준)
};

// 좋은 등급 → 낮은 등급 순서
// 미개봉(Sealed)은 밀봉이라 내부 감정이 불가능하므로 숫자를 부여하지 않음.
export const GRADES: Grade[] = [
  { code: "SS", name: "Still Sealed (미개봉)", color: "#e5e7eb", rank: null, tokens: ["STILLSEALED", "SEALED", "미개봉", "밀봉"], desc: "공장 밀봉 그대로의 미개봉 상태. 밀봉으로 내부 감정이 불가하여 별도 취급합니다." },
  { code: "M", name: "Mint (M)", color: "#22d3ee", rank: 10, tokens: ["MINT"], desc: "완벽한 상태. 사용·재생 흔적이 전혀 없는 신품 수준입니다." },
  { code: "NM", name: "Near Mint (NM)", color: "#34d399", rank: 9, tokens: ["NEARMINT"], desc: "거의 완벽. 아주 미세한 흠 외에 눈에 띄는 손상이 없습니다." },
  { code: "EX", name: "Excellent (VG++)", color: "#84cc16", rank: 8, tokens: ["EXCELLENT", "VG++"], desc: "가벼운 사용감은 있으나 전체적으로 매우 우수한 상태입니다." },
  { code: "VG+", name: "Very Good Plus (VG+)", color: "#eab308", rank: 7, tokens: ["VERYGOODPLUS"], desc: "약간의 표면 흠·자켓 마모가 있으나 청음에 큰 지장이 없습니다." },
  { code: "VG", name: "Very Good (VG)", color: "#f59e0b", rank: 6, tokens: ["VERYGOOD"], desc: "눈에 보이는 스크래치·마모가 있고 재생 시 약간의 노이즈가 있을 수 있습니다." },
  { code: "G+", name: "Good Plus (G+)", color: "#f97316", rank: 5, tokens: ["GOODPLUS"], desc: "사용감이 뚜렷하지만 처음부터 끝까지 재생은 가능합니다." },
  { code: "G", name: "Good (G)", color: "#ef4444", rank: 4, tokens: ["GOOD"], desc: "스크래치·마모가 많아 재생은 되나 노이즈가 잦습니다." },
  { code: "F", name: "Fair (F)", color: "#b91c1c", rank: 3, tokens: ["FAIR"], desc: "손상이 심합니다. 재생은 가능하나 상태가 좋지 않습니다." },
  { code: "P", name: "Poor (P)", color: "#a8a29e", rank: 2, tokens: ["POOR"], desc: "심각한 손상으로 정상 재생이 어렵습니다. 소장·자료용 등급입니다." },
];

// 등급 숫자 라벨 (미개봉은 "Sealed")
export function rankLabel(g: Grade): string {
  return g.rank == null ? "Sealed" : `${g.rank}등급`;
}

// 페이지 배경: 10색 모두와 어울리는 단일 다크 톤(너무 어둡지 않게 위쪽에 은은한 광)
export const PAGE_BACKGROUND =
  "radial-gradient(1100px 550px at 50% -15%, #1c2230 0%, #0d1017 68%)";

const norm = (x: string) => (x ?? "").toUpperCase().replace(/\s+/g, "");

// finalGrade 문자열에서 등급을 찾음.
// 1) 이름 완전일치 → 2) 키워드(토큰) 포함 → 3) 코드 포함(긴 코드 우선)
export function matchGrade(finalGrade: string): Grade | null {
  const s = norm(finalGrade);
  if (!s) return null;

  // 1) 이름 완전 일치 (관리자 드롭다운은 이름을 그대로 저장하므로 대부분 여기서 매칭)
  const exact = GRADES.find((g) => norm(g.name) === s);
  if (exact) return exact;

  // 2) 키워드 토큰 포함 (GRADES 순서 = 좋은 등급 우선 → NM이 M보다, VG+가 VG보다 먼저)
  for (const g of GRADES) {
    if (g.tokens.some((t) => s.includes(norm(t)))) return g;
  }

  // 3) 코드 포함 (긴 코드 우선: VG+ > VG, NM > M)
  const byCodeLen = [...GRADES].sort((a, b) => b.code.length - a.code.length);
  for (const g of byCodeLen) {
    if (s.includes(norm(g.code))) return g;
  }
  return null;
}

// 등급 글자색 (매칭 실패 시 기본 흰색)
export function gradeColor(finalGrade: string): string {
  return matchGrade(finalGrade)?.color ?? "#ffffff";
}
