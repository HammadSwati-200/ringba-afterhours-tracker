/**
 * Metrics Types
 * Business metric types for call center performance
 */

export interface CallCenterMetrics {
  callCenter: string; // Display name (no underscores)

  // In-Hours Metrics
  inHours: {
    totalLeads: number; // Total leads during business hours
    uniqueCalls: number; // Unique leads that had ≥1 matched call during in-hours
    callRate: number; // (uniqueCalls / totalLeads) × 100
  };

  // After-Hours Metrics
  afterHours: {
    totalLeads: number; // Total leads outside business hours
    callbacks: number; // After-hours leads that received callbacks
    callbackRate: number; // (callbacks / totalLeads) × 100
  };
}

export interface AggregatedMetrics {
  // Overall totals across all call centers
  totalInHoursLeads: number;
  totalAfterHoursLeads: number;
  totalCallbacks: number;
  overallCallbackRate: number; // (totalCallbacks / totalAfterHoursLeads) × 100

  // Per call center breakdown
  byCallCenter: CallCenterMetrics[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FilterOptions {
  callCenter?: string; // "all" or specific call center ID
  leadType?: "all" | "in-hours" | "after-hours";
  dateRange: DateRange;
}
