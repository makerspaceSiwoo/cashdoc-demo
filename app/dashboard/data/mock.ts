/**
 * 대시보드 Mock 데이터
 *
 * 사용처:
 * - /dashboard (DashBoard): 검색 자동완성, 선택 병원별 테이블/요약 카드
 * - 새 병원 추가 시: MOCK_HOSPITALS에 항목 추가, 필요 시 HOSPITAL_MULTIPLIERS에 배수 추가
 */

import type { EventRecord, Hospital } from "../types";

// ---------------------------------------------------------------------------
// 이벤트 목록
// ---------------------------------------------------------------------------
/**
 * 사용처: DashBoard
 * - 필터 영역 "이벤트" select 옵션 목록 (기간/이벤트 필터)
 * - 병원별 월별 데이터 생성 시, 해당 월에 노출할 이벤트 이름 풀
 */
export const EVENT_NAMES = [
  "사각턱 보톡스",
  "입술 필러",
  "슈링크",
  "인모드",
  "울세라",
  "스킨보톡스",
  "쌍꺼풀 수술",
  "지방흡입",
] as const;

// ---------------------------------------------------------------------------
// 병원 목록
// ---------------------------------------------------------------------------
/**
 * 사용처: DashBoard
 * - 검색창: 자동완성 후보(이름/진료과/지역), 즐겨찾기·최근 검색 목록
 * - 병원 선택 시: 상단 칩(이름 | 진료과 | 지역), serviceType "paid"면 파란 "유료" 뱃지
 * - getMockEventData(hospitalId)로 해당 병원의 테이블용 이벤트 데이터 조회
 *
 * 새 병원 추가: 아래 배열에 객체 추가, id는 고유값. 같은 이름(예: 하얀나라 피부과)은 location으로 구분.
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

/**
 * 병원별 수치 배수 (테이블 mock 규모 조정용).
 * 사용처: getMockEventData 내부 — 선택된 병원의 월별 EventRecord 생성 시 적용.
 * 새 병원 추가 시 여기에 id를 키로 한 배수를 넣으면 됨. 없으면 1 사용.
 */
const HOSPITAL_MULTIPLIERS: Record<string, number> = {
  A: 1.2,
  B: 1,
  C: 0.8,
  D: 1.1,
  E: 1.1,
};

// ---------------------------------------------------------------------------
// 병원별 이벤트 데이터 생성
// ---------------------------------------------------------------------------

function buildEventRecords(
  hospitalId: string,
  year: number,
  month: number,
  baseMultiplier: number,
): EventRecord[] {
  const seed = (hospitalId.charCodeAt(0) + year * 12 + month) % 100;
  const count = 2 + (seed % 2);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 3) % EVENT_NAMES.length;
    if (!indices.includes(idx)) indices.push(idx);
  }

  return indices.map((idx) => {
    const eventName = EVENT_NAMES[idx];
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
 * 사용처: DashBoard
 * - 병원 선택(검색 Enter / 즐겨찾기·최근·자동완성 클릭) 시 호출
 * - 반환값: baseRecords / viewRecords로 저장 → 요약 카드 4종, 기간·이벤트 필터 후 테이블(년/월/이벤트, 전달·예약·방문·예약률·내원율), 테이블 하단 "전체 소계" 행에 사용
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
