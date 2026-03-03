/**
 * 대시보드 Mock 데이터
 *
 * 사용처:
 * - /dashboard (DashBoard): 검색 자동완성, 선택 병원별 이벤트 필터 옵션, 테이블/요약 카드
 * - 병원별 고유 이벤트: HOSPITAL_EVENTS[hospitalId] → 이벤트 필터 옵션 및 데이터 생성에 사용
 */

import type { EventRecord, Hospital } from "../types";

// ---------------------------------------------------------------------------
// 병원별 고유 이벤트 (이벤트 필터 옵션 및 해당 병원 데이터 생성에만 사용)
// ---------------------------------------------------------------------------
/**
 * 사용처: DashBoard
 * - 선택된 병원의 "이벤트" 필터 select 옵션 (병원 선택 시에만 활성화, 해당 병원 전용 이벤트만 표시)
 * - getMockEventData(): 해당 병원의 월별 EventRecord 생성 시 이 이름들만 사용
 */
export const HOSPITAL_EVENTS: Record<string, readonly string[]> = {
  A: ["스킨보톡스", "지방흡입", "쌍꺼풀 수술"],
  B: ["슈링크", "인모드", "울세라"],
  C: ["물광주사", "필러", "여드름 압출"],
  D: ["사각턱 보톡스", "입술 필러", "스킨보톡스"],
  E: ["슈링크", "인모드", "울세라"],
} as const;

/**
 * 선택된 병원의 이벤트 목록 반환 (이벤트 필터 옵션용).
 * 사용처: DashBoard — 이벤트 select 옵션 목록
 */
export function getEventsForHospital(hospitalId: string): string[] {
  return [...(HOSPITAL_EVENTS[hospitalId] ?? [])];
}

// ---------------------------------------------------------------------------
// 병원 목록
// ---------------------------------------------------------------------------
/**
 * 사용처: DashBoard
 * - 검색창 자동완성, 즐겨찾기·최근 검색
 * - 병원 선택 시 상단 칩(이름 | 진료과 | 지역), serviceType "paid"면 "유료" 뱃지
 * - getMockEventData(hospitalId)로 해당 병원 테이블 데이터 조회
 */
export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: "A",
    name: "xx 병원",
    subject: "성형외과",
    location: "서울",
    serviceType: "paid",
  },
  {
    id: "B",
    name: "yy 병원",
    subject: "피부과",
    location: "부산",
    serviceType: "paid",
  },
  {
    id: "C",
    name: "zz 병원",
    subject: "일반의원",
    location: "인천",
    serviceType: "free",
  },
  {
    id: "D",
    name: "하얀나라 피부과",
    subject: "피부과",
    location: "강남",
    serviceType: "paid",
  },
  {
    id: "E",
    name: "하얀나라 피부과",
    subject: "피부과",
    location: "분당",
    serviceType: "paid",
  },
];

const HOSPITAL_MULTIPLIERS: Record<string, number> = {
  A: 1.2,
  B: 1,
  C: 0.8,
  D: 1.1,
  E: 1.1,
};

// ---------------------------------------------------------------------------
// 병원별 이벤트 데이터 생성 (해당 병원의 HOSPITAL_EVENTS만 사용)
// ---------------------------------------------------------------------------

function buildEventRecords(
  hospitalId: string,
  year: number,
  month: number,
  baseMultiplier: number,
): EventRecord[] {
  const eventNames = HOSPITAL_EVENTS[hospitalId];
  if (!eventNames || eventNames.length === 0) return [];

  const seed = (hospitalId.charCodeAt(0) + year * 12 + month) % 100;
  const count = Math.min(2 + (seed % 2), eventNames.length);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 3) % eventNames.length;
    if (!indices.includes(idx)) indices.push(idx);
  }

  return indices.map((idx) => {
    const eventName = eventNames[idx];
    const d = 50 + ((seed + idx * 7) % 150);
    const b = Math.floor(d * (0.03 + (seed % 15) / 100));
    const v = Math.floor(b * (0.6 + (seed % 10) / 100));
    const delivery = Math.round(d * baseMultiplier);
    const booking = Math.round(b * baseMultiplier);
    const visit = Math.round(v * baseMultiplier);
    const bookingRate = delivery > 0 ? (booking / delivery) * 100 : 0;
    const visitRate = delivery > 0 ? (visit / delivery) * 100 : 0;
    return {
      year,
      month,
      eventName,
      delivery,
      booking,
      visit,
      bookingRate: Math.round(bookingRate * 100) / 100,
      visitRate: Math.round(visitRate * 100) / 100,
    };
  });
}

/**
 * 사용처: DashBoard — "조회" 버튼 클릭 시에만 호출
 * 반환값: baseRecords/viewRecords → 요약 카드, 기간·이벤트 필터 후 테이블
 */
export function getMockEventData(hospitalId: string): EventRecord[] {
  const mult = HOSPITAL_MULTIPLIERS[hospitalId] ?? 1;
  const records: EventRecord[] = [];
  for (const year of [2024, 2025]) {
    for (let month = 1; month <= 12; month++) {
      records.push(...buildEventRecords(hospitalId, year, month, mult));
    }
  }
  return records;
}
