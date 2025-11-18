/**
 * useCallCenterMetrics Hook
 * Main hook for fetching and calculating call center metrics
 */

import { useState, useCallback, useMemo } from "react";
import type { AggregatedMetrics, DateRange, FilterOptions } from "@/lib/types";
import { supabaseService } from "@/lib/services/supabase.service";
import { calculateMetrics } from "@/lib/utils/calculations";

interface UseCallCenterMetricsResult {
  metrics: AggregatedMetrics | null;
  loading: boolean;
  error: Error | null;
  fetchMetrics: (dateRange: DateRange) => Promise<void>;
  applyFilters: (filters: FilterOptions) => AggregatedMetrics | null;
}

export function useCallCenterMetrics(): UseCallCenterMetricsResult {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch metrics for a date range
   */
  const fetchMetrics = useCallback(async (dateRange: DateRange) => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔄 Fetching data for date range:", dateRange);

      // Fetch data from Supabase
      const { leads, calls } = await supabaseService.fetchAllData(
        dateRange.start,
        dateRange.end
      );

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(leads, calls);

      setMetrics(calculatedMetrics);
      console.log("✅ Metrics updated successfully");
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch metrics");
      setError(error);
      console.error("❌ Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Apply filters to current metrics
   */
  const applyFilters = useCallback(
    (filters: FilterOptions): AggregatedMetrics | null => {
      if (!metrics) return null;

      let filtered = { ...metrics };

      // Filter by call center
      if (filters.callCenter && filters.callCenter !== "all") {
        const filteredCenters = metrics.byCallCenter.filter(
          (cc) => cc.callCenter === filters.callCenter
        );

        // Recalculate totals
        filtered = {
          ...filtered,
          byCallCenter: filteredCenters,
          totalInHoursLeads: filteredCenters.reduce(
            (sum, cc) => sum + cc.inHours.totalLeads,
            0
          ),
          totalAfterHoursLeads: filteredCenters.reduce(
            (sum, cc) => sum + cc.afterHours.totalLeads,
            0
          ),
          totalCallbacks: filteredCenters.reduce(
            (sum, cc) => sum + cc.afterHours.callbacks,
            0
          ),
        };

        filtered.overallCallbackRate =
          filtered.totalAfterHoursLeads > 0
            ? (filtered.totalCallbacks / filtered.totalAfterHoursLeads) * 100
            : 0;
      }

      // Filter by lead type
      if (filters.leadType && filters.leadType !== "all") {
        // This would require filtering the raw data, so we'll skip for now
        // In a real implementation, we'd need to store raw data and recalculate
      }

      return filtered;
    },
    [metrics]
  );

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
    applyFilters,
  };
}
