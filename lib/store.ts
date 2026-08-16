import { promises as fs } from "fs";
import path from "path";

export type ReportSection = {
  id: string;
  title: string; // 예: "자켓 앞면"
  image?: string; // (구버전) 단일 사진 URL — 하위호환용
  images?: string[]; // 사진 여러 장 URL
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

// 레코드는 즉시 반영이 필요하므로 Upstash Redis(KV) 사용. 없으면 로컬 파일.
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_KV = !!(KV_URL && KV_TOKEN);
const KV_KEY = "mint:records";

async function kv() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({ url: KV_URL, token: KV_TOKEN });
}

// 조회 시 대소문자/공백 차이를 무시하기 위한 정규화
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

// 리포지토리에 커밋된 기본 기록 파일 읽기 (KV 시드용 / 로컬 저장용)
async function readFileRecords(): Promise<Record[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(DATA_FILE, "utf-8"));
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch {
    return [];
  }
}

export async function getAll(): Promise<Record[]> {
  if (USE_KV) {
    try {
      const r = await kv();
      const data = await r.get<{ records: Record[] }>(KV_KEY);
      if (data && Array.isArray(data.records)) return data.records;
      // KV가 비어있으면 커밋된 기존 기록으로 초기화(데이터 보존)
      const seed = await readFileRecords();
      await r.set(KV_KEY, { records: seed });
      return seed;
    } catch {
      return await readFileRecords();
    }
  }
  return await readFileRecords();
}

async function saveAll(records: Record[]): Promise<void> {
  if (USE_KV) {
    const r = await kv();
    await r.set(KV_KEY, { records });
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
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
