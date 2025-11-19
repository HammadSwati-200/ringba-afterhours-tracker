/**
 * useDateRange Hook
 * Manage date range state with presets
 */

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { DateRange } from "@/lib/types";

/**
 * Normalize a date to start of day (00:00:00.000)
 */
function normalizeToStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Normalize a date to end of day (23:59:59.999)
 */
function normalizeToEndOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

export function useDateRange() {
  const searchParams = useSearchParams();

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Try to read from URL params first
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");

    if (startParam && endParam) {
      const start = normalizeToStartOfDay(new Date(startParam));
      const end = normalizeToEndOfDay(new Date(endParam));
      return { start, end };
    }

    // Default: Last 7 days (normalized to full days)
    const end = normalizeToEndOfDay(new Date());
    const start = normalizeToStartOfDay(new Date());
    start.setDate(start.getDate() - 7);
    return { start, end };
  });

  const updateDateRange = useCallback((start: Date, end: Date) => {
    // Normalize dates to full days
    const normalizedStart = normalizeToStartOfDay(start);
    const normalizedEnd = normalizeToEndOfDay(end);
    setDateRange({ start: normalizedStart, end: normalizedEnd });
  }, []);

  return {
    dateRange,
    updateDateRange,
  };
}
