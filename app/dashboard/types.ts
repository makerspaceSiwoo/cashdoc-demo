/**
 * Dashboard 공통 타입 정의
 * - DashBoard 컴포넌트, mock 데이터에서 사용
 */

export type ServiceType = "all" | "paid" | "free";

export interface Hospital {
  id: string;
  name: string;
  subject: string;
  location: string;
  serviceType: "paid" | "free";
  favorite?: boolean;
}

export interface EventRecord {
  year: number;
  month: number;
  eventName: string;
  delivery: number;
  booking: number;
  visit: number;
  bookingRate: number;
  visitRate: number;
}

export type TableRowKind = "event" | "monthlyTotal" | "yearlyTotal";

export interface TableRow {
  kind: TableRowKind;
  year?: number;
  month?: number;
  eventName: string;
  delivery: number;
  booking: number;
  visit: number;
  bookingRate: number;
  visitRate: number;
}
