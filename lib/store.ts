import { promises as fs } from "fs";
import path from "path";

export type ReportSection = {
  id: string;
  title: string; // 예: "자켓 앞면"
  image?: string; // 줌인 사진 URL
  body: string; // 설명글
  required?: boolean; // 사진 필수 부위 여부 (관리자 참고용)
};

export type CheckItem = {
  id: string;
  label: string; // 예: "속지 여부"
  value: string; // "O" | "X" (또는 자유 텍스트)
};

export type Record = {
  code: string; // 인증번호, 예: "MINT/8AEF9" (조회 키)
  albumTitle: string; // 예: "신해철 2집 [Myself]"
  format: string; // 예: "LP" / "CD"
  coverImage?: string; // 대표(전체) 사진 URL
  mediaGrade: string; // 알판(Media) 등급, 예: "Near Mint (NM / M-)"
  sleeveGrade: string; // 자켓(Sleeve) 등급, 예: "Very Good Plus (VG+)"
  sealed: boolean; // 미개봉 여부 (true면 내부 미검수)
  // 음반 메타정보 (선택 — 비우면 화면에 표시되지 않음)
  releaseYear?: string; // 발매연도
  label?: string; // 레이블
  catalogNo?: string; // 카탈로그 번호
  country?: string; // 발매국
  // 감정 정보 (선택)
  gradedDate?: string; // 감정일자
  graderName?: string; // 감정사 이름/서명
  checks: CheckItem[]; // O/X 확인 항목 (속지, 가사지 등)
  sections: ReportSection[]; // 상세 감정 리포트 섹션들
  summary: string; // 총평
  disclaimer: string; // 면책 및 재검수 조항
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "records.json");

// 조회 시 대소문자/공백 차이를 무시하기 위한 정규화
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify({ records: [] }, null, 2), "utf-8");
  }
}

export async function getAll(): Promise<Record[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch {
    return [];
  }
}

async function saveAll(records: Record[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify({ records }, null, 2), "utf-8");
}

export async function getByCode(code: string): Promise<Record | null> {
  const target = normalizeCode(code);
  const all = await getAll();
  return all.find((r) => normalizeCode(r.code) === target) ?? null;
}

export async function upsert(record: Record, originalCode?: string): Promise<Record> {
  const all = await getAll();
  record.updatedAt = new Date().toISOString();
  const keyToReplace = normalizeCode(originalCode ?? record.code);
  const idx = all.findIndex((r) => normalizeCode(r.code) === keyToReplace);
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }
  await saveAll(all);
  return record;
}

export async function remove(code: string): Promise<void> {
  const target = normalizeCode(code);
  const all = await getAll();
  await saveAll(all.filter((r) => normalizeCode(r.code) !== target));
}
