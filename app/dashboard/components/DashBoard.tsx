"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  Filter,
  Building2,
  Calendar,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

const EVENT_NAMES = [
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
// Mock Data
// ---------------------------------------------------------------------------

function buildEventRecords(
  hospitalId: string,
  year: number,
  month: number,
  baseMultiplier: number,
): EventRecord[] {
  const seed = (hospitalId.charCodeAt(0) + year * 12 + month) % 100;

  // 각 월마다 2~3개의 이벤트만 선택 (데모용으로 데이터 양 축소)
  const count = 2 + (seed % 2); // 2 또는 3
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (seed + i * 3) % EVENT_NAMES.length;
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
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

const MOCK_HOSPITALS: Hospital[] = [
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

function getMockEventData(hospitalId: string): EventRecord[] {
  const mult =
    hospitalId === "A"
      ? 1.2
      : hospitalId === "B"
        ? 1
        : hospitalId === "C"
          ? 0.8
          : 1.1;
  const records: EventRecord[] = [];
  for (const year of [2024, 2025]) {
    for (let month = 1; month <= 12; month++) {
      records.push(...buildEventRecords(hospitalId, year, month, mult));
    }
  }
  return records;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

// ---------------------------------------------------------------------------
// Table building with sub-totals
// ---------------------------------------------------------------------------

function buildTableRows(records: EventRecord[]): TableRow[] {
  if (records.length === 0) return [];
  const rows: TableRow[] = [];
  const byYearMonth = new Map<string, EventRecord[]>();
  for (const r of records) {
    const key = `${r.year}-${r.month}`;
    if (!byYearMonth.has(key)) byYearMonth.set(key, []);
    byYearMonth.get(key)!.push(r);
  }
  const sortedKeys = Array.from(byYearMonth.keys()).sort();
  let currentYear = 0;
  let yearDelivery = 0,
    yearBooking = 0,
    yearVisit = 0;

  for (const key of sortedKeys) {
    const [y, m] = key.split("-").map(Number);
    if (y !== currentYear && currentYear !== 0) {
      rows.push({
        kind: "yearlyTotal",
        year: currentYear,
        eventName: `${currentYear}년 소계`,
        delivery: yearDelivery,
        booking: yearBooking,
        visit: yearVisit,
        bookingRate: yearDelivery > 0 ? (yearBooking / yearDelivery) * 100 : 0,
        visitRate: yearDelivery > 0 ? (yearVisit / yearDelivery) * 100 : 0,
      });
      yearDelivery = yearBooking = yearVisit = 0;
    }
    currentYear = y;
    const monthRecords = byYearMonth.get(key)!;
    let monthDelivery = 0,
      monthBooking = 0,
      monthVisit = 0;
    for (const r of monthRecords) {
      rows.push({ ...r, kind: "event" });
      monthDelivery += r.delivery;
      monthBooking += r.booking;
      monthVisit += r.visit;
      yearDelivery += r.delivery;
      yearBooking += r.booking;
      yearVisit += r.visit;
    }
    rows.push({
      kind: "monthlyTotal",
      year: y,
      month: m,
      eventName: `${y}년 ${m}월 소계`,
      delivery: monthDelivery,
      booking: monthBooking,
      visit: monthVisit,
      bookingRate: monthDelivery > 0 ? (monthBooking / monthDelivery) * 100 : 0,
      visitRate: monthDelivery > 0 ? (monthVisit / monthDelivery) * 100 : 0,
    });
  }
  if (currentYear !== 0) {
    rows.push({
      kind: "yearlyTotal",
      year: currentYear,
      eventName: `${currentYear}년 소계`,
      delivery: yearDelivery,
      booking: yearBooking,
      visit: yearVisit,
      bookingRate: yearDelivery > 0 ? (yearBooking / yearDelivery) * 100 : 0,
      visitRate: yearDelivery > 0 ? (yearVisit / yearDelivery) * 100 : 0,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const STORAGE_FAVORITES = "hospital-dashboard-favorites";
const STORAGE_RECENT = "hospital-dashboard-recent";

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const s = localStorage.getItem(STORAGE_FAVORITES);
    return s ? new Set(JSON.parse(s)) : new Set();
  } catch {
    return new Set();
  }
}

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_RECENT);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export default function DashBoard() {
  const [hospitals, setHospitals] = useState<Hospital[]>(() =>
    MOCK_HOSPITALS.map((h) => ({ ...h, favorite: loadFavorites().has(h.id) })),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const [startYear, setStartYear] = useState(2024);
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(2025);
  const [endMonth, setEndMonth] = useState(12);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] =
    useState<ServiceType>("all");
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [baseRecords, setBaseRecords] = useState<EventRecord[]>([]);
  const [viewRecords, setViewRecords] = useState<EventRecord[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 500);

  const filteredHospitals = useMemo(() => {
    if (!debouncedQuery.trim())
      return hospitals.map((h) => ({
        ...h,
        display: `${h.name} | ${h.subject} | ${h.location}`,
      }));
    const q = debouncedQuery.toLowerCase();
    return hospitals
      .filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.subject.toLowerCase().includes(q) ||
          h.location.toLowerCase().includes(q),
      )
      .map((h) => ({
        ...h,
        display: `${h.name} | ${h.subject} | ${h.location}`,
      }));
  }, [hospitals, debouncedQuery]);

  const tableRows = useMemo(() => buildTableRows(viewRecords), [viewRecords]);

  const summary = useMemo(() => {
    const totalDelivery = viewRecords.reduce(
      (s: number, r: EventRecord) => s + r.delivery,
      0,
    );
    const totalBooking = viewRecords.reduce(
      (s: number, r: EventRecord) => s + r.booking,
      0,
    );
    const totalVisit = viewRecords.reduce(
      (s: number, r: EventRecord) => s + r.visit,
      0,
    );
    const count = viewRecords.length;
    const avgBookingRate =
      count > 0
        ? viewRecords.reduce(
            (s: number, r: EventRecord) => s + r.bookingRate,
            0,
          ) / count
        : 0;
    const avgVisitRate =
      count > 0
        ? viewRecords.reduce(
            (s: number, r: EventRecord) => s + r.visitRate,
            0,
          ) / count
        : 0;
    return {
      totalDelivery,
      totalBooking,
      totalVisit,
      avgBookingRate,
      avgVisitRate,
    };
  }, [viewRecords]);

  const hospitalsForAutocomplete = useMemo(() => {
    let list = filteredHospitals;
    if (serviceTypeFilter === "paid")
      list = list.filter(
        (h: Hospital & { display: string }) => h.serviceType === "paid",
      );
    else if (serviceTypeFilter === "free")
      list = list.filter(
        (h: Hospital & { display: string }) => h.serviceType === "free",
      );
    return list;
  }, [filteredHospitals, serviceTypeFilter]);

  const hasDateFilter = !(
    startYear === 2024 &&
    startMonth === 1 &&
    endYear === 2025 &&
    endMonth === 12
  );
  const hasEventFilter = selectedEvent !== null;
  const hasServiceFilter = serviceTypeFilter !== "all";

  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (hasDateFilter) {
      const sm = String(startMonth).padStart(2, "0");
      const em = String(endMonth).padStart(2, "0");
      parts.push(`${startYear}.${sm}~${endYear}.${em}`);
    }
    if (hasEventFilter) {
      parts.push(`이벤트: ${selectedEvent}`);
    }
    if (hasServiceFilter) {
      parts.push(serviceTypeFilter === "paid" ? "유료만" : "무료만");
    }
    return parts.join(" / ");
  }, [
    hasDateFilter,
    hasEventFilter,
    hasServiceFilter,
    startYear,
    startMonth,
    endYear,
    endMonth,
    selectedEvent,
    serviceTypeFilter,
  ]);

  const hasActiveFilters = activeFilterLabel.length > 0;

  const handleResetFilters = useCallback(() => {
    setStartYear(2024);
    setStartMonth(1);
    setEndYear(2025);
    setEndMonth(12);
    setSelectedEvent(null);
    setServiceTypeFilter("all");
    setViewRecords(baseRecords);
  }, [baseRecords]);

  const handleApplyFilters = useCallback(() => {
    const filtered = baseRecords.filter((r) => {
      const inRange =
        (r.year > startYear ||
          (r.year === startYear && r.month >= startMonth)) &&
        (r.year < endYear || (r.year === endYear && r.month <= endMonth));
      if (!inRange) return false;
      if (selectedEvent && r.eventName !== selectedEvent) return false;
      return true;
    });
    setViewRecords(filtered);
  }, [baseRecords, startYear, startMonth, endYear, endMonth, selectedEvent]);

  // 1) 검색창 + 검색 버튼: 병원 이름과 완전히 일치하는 경우만 로드
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    setSearchQuery("");
    if (!q) {
      setSelectedHospital(null);
      setBaseRecords([]);
      setViewRecords([]);
      setHasSearched(false);
      return;
    }

    const exact = hospitals.find((h) => h.name === q);
    if (!exact) {
      setSelectedHospital(null);
      setBaseRecords([]);
      setViewRecords([]);
      setHasSearched(true);
      return;
    }

    const all = getMockEventData(exact.id);
    setSelectedHospital(exact);
    setBaseRecords(all);
    setViewRecords(all);
    setStartYear(2024);
    setStartMonth(1);
    setEndYear(2025);
    setEndMonth(12);
    setSelectedEvent(null);
    setServiceTypeFilter("all");
    setHasSearched(true);

    // 최근 검색 목록 업데이트
    try {
      const recent = loadRecent();
      const next = [exact.id, ...recent.filter((id) => id !== exact.id)].slice(
        0,
        5,
      );
      localStorage.setItem(STORAGE_RECENT, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [hospitals, searchQuery]);

  const toggleFavorite = useCallback((id: string) => {
    setHospitals((prev: Hospital[]) => {
      const next = prev.map((h: Hospital) =>
        h.id === id ? { ...h, favorite: !h.favorite } : h,
      );
      const fav = new Set(
        next.filter((h: Hospital) => h.favorite).map((h: Hospital) => h.id),
      );
      try {
        localStorage.setItem(STORAGE_FAVORITES, JSON.stringify([...fav]));
      } catch {}
      return next;
    });
  }, []);

  // 2,3) 즐겨찾기/최근/자동완성 클릭: 검색 버튼 없이 바로 데이터 로드
  const selectHospital = useCallback((h: Hospital): void => {
    setSelectedHospital(h);
    const all = getMockEventData(h.id);
    setBaseRecords(all);
    setViewRecords(all);
    setStartYear(2024);
    setStartMonth(1);
    setEndYear(2025);
    setEndMonth(12);
    setSelectedEvent(null);
    setServiceTypeFilter("all");
    setHasSearched(true);

    setAutocompleteOpen(false);
    setSearchQuery("");
    try {
      const recent = loadRecent();
      const next = [h.id, ...recent.filter((id) => id !== h.id)].slice(0, 5);
      localStorage.setItem(STORAGE_RECENT, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setAutocompleteOpen(false);
      }
      if (
        eventDropdownOpen &&
        !(e.target as HTMLElement).closest("[data-event-dropdown]")
      ) {
        setEventDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [eventDropdownOpen]);

  const recentIds = loadRecent();
  const recentHospitals = recentIds
    .map((id: string) => hospitals.find((h: Hospital) => h.id === id))
    .filter(Boolean) as Hospital[];
  const favoriteHospitals = hospitals.filter((h: Hospital) => h.favorite);

  const noResults = !!selectedHospital && hasSearched && tableRows.length === 0;

  return (
    <div className="space-y-6">
      {/* Search Row: 병원명 검색 + 검색 버튼 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]" ref={autocompleteRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="병원 검색 (이름 | 진료과 | 지역)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setAutocompleteOpen(true);
              }}
              onFocus={() => setAutocompleteOpen(true)}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            />
          </div>
          <AnimatePresence>
            {autocompleteOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-popover shadow-lg"
              >
                {!debouncedQuery.trim() ? (
                  <div className="space-y-2 p-3">
                    {favoriteHospitals.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          즐겨찾기
                        </p>
                        {favoriteHospitals.map((h: Hospital) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => selectHospital(h)}
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-accent"
                          >
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {h.name} | {h.subject} | {h.location}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {recentHospitals.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          최근 검색
                        </p>
                        {recentHospitals.map((h: Hospital) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => selectHospital(h)}
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-accent"
                          >
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {h.name} | {h.subject} | {h.location}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {favoriteHospitals.length === 0 &&
                      recentHospitals.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          병원명, 진료과, 지역으로 검색하세요.
                        </p>
                      )}
                  </div>
                ) : hospitalsForAutocomplete.length === 0 ? null : (
                  <ul className="py-1">
                    {hospitalsForAutocomplete.map(
                      (h: Hospital & { display: string }) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => selectHospital(h)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                toggleFavorite(h.id);
                              }}
                              className="shrink-0"
                              aria-label={
                                h.favorite ? "즐겨찾기 해제" : "즐겨찾기"
                              }
                            >
                              <Star
                                className={cn(
                                  "h-4 w-4",
                                  h.favorite
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground",
                                )}
                              />
                            </button>
                            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{h.display}</span>
                          </button>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          검색
        </button>
      </div>

      {/* Filters Row: 기간/이벤트/유형 + 적용/초기화 */}
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">기간</span>
          <select
            value={startYear}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStartYear(Number(e.target.value))
            }
            className="rounded border bg-background px-2 py-1 text-sm"
          >
            {[2024, 2025].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={startMonth}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStartMonth(Number(e.target.value))
            }
            className="rounded border bg-background px-2 py-1 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">~</span>
          <select
            value={endYear}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setEndYear(Number(e.target.value))
            }
            className="rounded border bg-background px-2 py-1 text-sm"
          >
            {[2024, 2025].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={endMonth}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setEndMonth(Number(e.target.value))
            }
            className="rounded border bg-background px-2 py-1 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>

        <div className="relative" data-event-dropdown>
          <button
            type="button"
            onClick={() => setEventDropdownOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded border bg-background px-3 py-1.5 text-sm"
          >
            이벤트 {selectedEvent && `(${selectedEvent})`}
            <ChevronDown className="h-4 w-4" />
          </button>
          {eventDropdownOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border bg-popover p-2 shadow-lg">
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent">
                <input
                  type="radio"
                  name="event-filter"
                  checked={selectedEvent === null}
                  onChange={() => {
                    setSelectedEvent(null);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">전체</span>
              </label>
              {EVENT_NAMES.map((name) => (
                <label
                  key={name}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent"
                >
                  <input
                    type="radio"
                    name="event-filter"
                    checked={selectedEvent === name}
                    onChange={() => {
                      setSelectedEvent(name);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">충전 유형</span>
          <select
            value={serviceTypeFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setServiceTypeFilter(e.target.value as ServiceType)
            }
            className="rounded border bg-background px-2 py-1 text-sm"
          >
            <option value="all">전체</option>
            <option value="paid">유료</option>
            <option value="free">무료</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyFilters}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            적용
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium",
              !hasActiveFilters && "cursor-not-allowed opacity-50",
            )}
          >
            초기화
          </button>
        </div>
      </div>

      {/* Selected hospital + active filter summary */}
      {selectedHospital && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span className="font-medium">
            {selectedHospital.name} | {selectedHospital.subject} |{" "}
            {selectedHospital.location}
          </span>
          {activeFilterLabel && (
            <span className="text-xs text-muted-foreground">
              · {activeFilterLabel}
            </span>
          )}
        </motion.div>
      )}

      {/* Summary Cards */}
      {selectedHospital && hasSearched && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              label: "Total Delivery",
              value: summary.totalDelivery.toLocaleString(),
            },
            {
              label: "Total Bookings",
              value: summary.totalBooking.toLocaleString(),
            },
            {
              label: "Avg. Booking Rate",
              value: `${summary.avgBookingRate.toFixed(2)}%`,
            },
            {
              label: "Avg. Visit Rate",
              value: `${summary.avgVisitRate.toFixed(2)}%`,
            },
          ].map(({ label, value }: { label: string; value: string }) => (
            <div
              key={label}
              className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* No results / Welcome */}
      {!selectedHospital && !hasSearched && (
        <div className="rounded-lg border border-dashed bg-muted/20 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">병원을 검색해 선택하세요</p>
          <p className="mt-1 text-xs text-muted-foreground">
            검색 후 병원을 선택하면 상세 분석 테이블이 표시됩니다.
          </p>
        </div>
      )}

      {!selectedHospital && hasSearched && (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">검색 결과가 없습니다.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            병원명을 다시 확인하거나 다른 검색어를 입력해 보세요.
          </p>
        </div>
      )}

      {noResults && selectedHospital && (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">조건에 맞는 데이터가 없습니다.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            기간 또는 이벤트 필터를 변경해 보세요.
          </p>
        </div>
      )}

      {/* Excel-style Table */}
      {selectedHospital && tableRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="overflow-hidden rounded-lg border"
        >
          <div className="overflow-x-auto overflow-y-auto h-full">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted font-medium">
                <tr>
                  <th className="border-b border-r px-3 py-2 text-left">년</th>
                  <th className="border-b border-r px-3 py-2 text-left">월</th>
                  <th className="border-b border-r px-3 py-2 text-left">
                    이벤트
                  </th>
                  <th className="border-b border-r px-3 py-2 text-right">
                    전체 전달 수
                  </th>
                  <th className="border-b border-r px-3 py-2 text-right">
                    내원 예약
                  </th>
                  <th className="border-b border-r px-3 py-2 text-right">
                    내원 완료
                  </th>
                  <th className="border-b border-r px-3 py-2 text-right">
                    예약률
                  </th>
                  <th className="border-b px-3 py-2 text-right">내원율</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row: TableRow, idx: number) => (
                  <tr
                    key={idx}
                    className={cn(
                      row.kind === "event" && idx % 2 === 1 && "bg-muted/30",
                      row.kind === "monthlyTotal" &&
                        "bg-gray-200 font-semibold",
                      row.kind === "yearlyTotal" && "bg-blue-100 font-bold",
                    )}
                  >
                    {row.kind === "event" ? (
                      <>
                        <td className="border-b border-r px-3 py-1.5">
                          {row.year ?? ""}
                        </td>
                        <td className="border-b border-r px-3 py-1.5">
                          {row.month ?? ""}
                        </td>
                        <td className="border-b border-r px-3 py-1.5">
                          {row.eventName}
                        </td>
                      </>
                    ) : (
                      <td
                        colSpan={3}
                        className="border-b border-r px-3 py-1.5 text-left font-medium"
                      >
                        {row.kind === "monthlyTotal"
                          ? `${row.year ?? ""}년 ${row.month ?? ""}월 소계`
                          : `${row.year ?? ""}년 소계`}
                      </td>
                    )}
                    <td className="border-b border-r px-3 py-1.5 text-right tabular-nums">
                      {row.delivery.toLocaleString()}
                    </td>
                    <td className="border-b border-r px-3 py-1.5 text-right tabular-nums">
                      {row.booking.toLocaleString()}
                    </td>
                    <td className="border-b border-r px-3 py-1.5 text-right tabular-nums">
                      {row.visit.toLocaleString()}
                    </td>
                    <td className="border-b border-r px-3 py-1.5 text-right tabular-nums">
                      {row.delivery > 0
                        ? `${row.bookingRate.toFixed(2)}%`
                        : "-"}
                    </td>
                    <td className="border-b px-3 py-1.5 text-right tabular-nums">
                      {row.delivery > 0 ? `${row.visitRate.toFixed(2)}%` : "-"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-300 font-semibold text-blue-950">
                  <td className="border-b border-r px-3 py-1.5" colSpan={3}>
                    전체 소계
                  </td>
                  <td className="border-b border-r px-3 py-1.5 text-right tabular-nums">
                    {summary.totalDelivery.toLocaleString()}
                  </td>
                  <td className="border-b border-r px-3 py-1.5 text-right tabular-nums">
                    {summary.totalBooking.toLocaleString()}
                  </td>
                  <td className="border-b border-r px-3 py-1.5 text-right tabular-nums">
                    {summary.totalVisit.toLocaleString()}
                  </td>
                  <td className="border-b border-r px-3 py-1.5 text-right tabular-nums">
                    {summary.totalDelivery > 0
                      ? `${summary.avgBookingRate.toFixed(2)}%`
                      : "-"}
                  </td>
                  <td className="border-b px-3 py-1.5 text-right tabular-nums">
                    {summary.totalDelivery > 0
                      ? `${summary.avgVisitRate.toFixed(2)}%`
                      : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
