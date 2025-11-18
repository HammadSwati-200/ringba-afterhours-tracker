/**
 * useDateRange Hook
 * Manage date range state with presets
 */

import { useState, useCallback, useMemo } from "react";
import type { DateRange } from "@/lib/types";

export function useDateRange() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Default: Last 7 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end };
  });

  const updateDateRange = useCallback((start: Date, end: Date) => {
    setDateRange({ start, end });
  }, []);

  return {
    dateRange,
    updateDateRange,
  };
}
