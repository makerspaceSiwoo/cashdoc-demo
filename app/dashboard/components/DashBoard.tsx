"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, Building2, Calendar, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventRecord, Hospital, ServiceType, TableRow } from "../types";
import {
  MOCK_HOSPITALS,
  getMockEventData,
  getEventsForHospital,
} from "../data/mock";

export type { ServiceType, Hospital, EventRecord, TableRow } from "../types";

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
  const sortedKeys = Array.from(byYearMonth.keys()).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    if (ya !== yb) return ya - yb;
    return ma - mb;
  });
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
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [baseRecords, setBaseRecords] = useState<EventRecord[]>([]);
  const [viewRecords, setViewRecords] = useState<EventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const hasFetched = baseRecords.length > 0;
  const eventOptions = useMemo(
    () => getEventsForHospital(selectedHospital?.id ?? ""),
    [selectedHospital?.id],
  );

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

  const applyFiltersToRecords = useCallback(
    (records: EventRecord[]) => {
      return records.filter((r) => {
        const inRange =
          (r.year > startYear ||
            (r.year === startYear && r.month >= startMonth)) &&
          (r.year < endYear || (r.year === endYear && r.month <= endMonth));
        if (!inRange) return false;
        if (selectedEvent && r.eventName !== selectedEvent) return false;
        return true;
      });
    },
    [startYear, startMonth, endYear, endMonth, selectedEvent],
  );

  const handleFetch = useCallback(() => {
    if (!selectedHospital) return;
    setIsLoading(true);
    setTimeout(() => {
      const all = getMockEventData(selectedHospital.id);
      const filtered = applyFiltersToRecords(all);
      setBaseRecords(all);
      setViewRecords(filtered);
      setIsLoading(false);
    }, 600);
  }, [selectedHospital, applyFiltersToRecords]);

  const handleReset = useCallback(() => {
    setSelectedHospital(null);
    setSearchQuery("");
    setStartYear(2024);
    setStartMonth(1);
    setEndYear(2025);
    setEndMonth(12);
    setSelectedEvent(null);
    setBaseRecords([]);
    setViewRecords([]);
  }, []);

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

  // Step 1: 선택만 저장. 검색창에는 병원명 유지. 데이터 로드는 조회 버튼(Step 3)에서만.
  const selectHospital = useCallback((h: Hospital): void => {
    setSelectedHospital(h);
    setSearchQuery(`${h.name} | ${h.subject} | ${h.location}`);
    setBaseRecords([]);
    setViewRecords([]);
    setAutocompleteOpen(false);
    try {
      const recent = loadRecent();
      const next = [h.id, ...recent.filter((id) => id !== h.id)].slice(0, 5);
      localStorage.setItem(STORAGE_RECENT, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const clearHospitalSelection = useCallback(() => {
    setSelectedHospital(null);
    setSearchQuery("");
    setBaseRecords([]);
    setViewRecords([]);
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const recentIds = loadRecent();
  const recentHospitals = recentIds
    .map((id: string) => hospitals.find((h: Hospital) => h.id === id))
    .filter(Boolean) as Hospital[];
  const favoriteHospitals = hospitals.filter((h: Hospital) => h.favorite);

  const noResults = hasFetched && tableRows.length === 0;

  // 선택된 병원이 바뀌면 해당 병원에 없는 이벤트 선택 해제
  useEffect(() => {
    if (!selectedHospital || selectedEvent === null) return;
    const opts = getEventsForHospital(selectedHospital.id);
    if (!opts.includes(selectedEvent)) setSelectedEvent(null);
  }, [selectedHospital?.id, selectedEvent]);

  return (
    <div className="space-y-6">
      {/* Step 1: 병원 검색 + Step 2: 필터 바 (검색창 오른쪽에 위치) */}
      <div className="flex flex-wrap items-stretch gap-3">
        {/* 검색창: 폭을 줄이고 고정 폭으로 배치 */}
        <div
          className="relative w-full max-w-sm md:max-w-md"
          ref={autocompleteRef}
        >
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
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (hospitalsForAutocomplete.length === 0) {
                  setAutocompleteOpen(true);
                  return;
                }
                const first = hospitalsForAutocomplete[0];
                selectHospital(first);
                setAutocompleteOpen(false);
              }}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-9 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            />
            {(searchQuery.length > 0 || selectedHospital) && (
              <button
                type="button"
                onClick={() => {
                  clearHospitalSelection();
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="선택 초기화"
              >
                <X className="h-4 w-4" />
              </button>
            )}
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
                ) : hospitalsForAutocomplete.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    검색 결과 없음
                  </p>
                ) : (
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

        {/* 필터: 검색창 오른쪽에 배치 */}
        <div className="flex flex-1 flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-3">
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">이벤트</span>
            <select
              value={selectedEvent ?? ""}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const v = e.target.value;
                setSelectedEvent(v || null);
              }}
              disabled={!selectedHospital}
              className={cn(
                "rounded border bg-background px-2 py-1 text-sm",
                !selectedHospital && "cursor-not-allowed opacity-50",
              )}
            >
              <option value="">전체</option>
              {eventOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 3: [조회] [초기화] 액션 바 (필터 div 밖) */}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleFetch}
          disabled={!selectedHospital || isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          조회
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          초기화
        </button>
      </div>

      {/* 선택된 병원 라벨 + 적용된 필터 요약 (조회 후에만 필터 요약 표시) */}
      {selectedHospital && hasFetched && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          {selectedHospital.serviceType === "paid" && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              유료
            </span>
          )}
          <span className="font-medium">
            {selectedHospital.name} | {selectedHospital.subject} |{" "}
            {selectedHospital.location}
          </span>
          {hasFetched && activeFilterLabel && (
            <span className="text-xs text-muted-foreground">
              · {activeFilterLabel}
            </span>
          )}
        </motion.div>
      )}

      {/* Summary Cards — 조회 성공 후에만 */}
      {hasFetched && !isLoading && selectedHospital && (
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

      {/* Welcome: 병원 미선택 */}
      {!hasFetched && (
        <div className="rounded-lg border border-dashed bg-muted/20 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">
            병원과 필터를 선택한 후 조회 버튼을 눌러 주세요
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            검색에서 병원을 선택하고, 기간·이벤트를 설정한 뒤 조회를 누르면 상세
            분석이 표시됩니다.
          </p>
        </div>
      )}

      {noResults && (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">조건에 맞는 데이터가 없습니다.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            기간 또는 이벤트 필터를 변경한 뒤 다시 조회해 보세요.
          </p>
        </div>
      )}

      {/* 테이블 영역: 로딩 시 스켈레톤만, 조회 후 데이터 테이블 */}
      {isLoading && (
        <div className="overflow-hidden rounded-lg border">
          <div className="animate-pulse space-y-3 bg-muted/20 p-6">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-4/5 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        </div>
      )}

      {/* Excel-style Table — 조회 후에만 */}
      {hasFetched && !isLoading && tableRows.length > 0 && (
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
