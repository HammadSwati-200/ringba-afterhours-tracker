/**
 * Calculations Utilities
 * Calculate metrics for call center performance
 */

import type {
  IrevLead,
  RingbaCall,
  NormalizedLead,
  NormalizedCall,
  CallCenterMetrics,
  AggregatedMetrics,
} from "@/lib/types";
import {
  normalizeLead,
  normalizeCall,
  normalizeCallCenterId,
} from "./normalization";
import { classifyLeadByTimestamp } from "./classification";
import { matchLeadsWithCalls, hasInHoursCall, type LeadCallMatch } from "./matching";
import { formatOperatingHours } from "@/lib/call-center-hours";
import { generateAndLogDailyBreakdown } from "./daily-logger";

/**
 * Calculate metrics for all call centers
 */
export function calculateMetrics(
  rawLeads: IrevLead[],
  rawCalls: RingbaCall[]
): AggregatedMetrics {
  // Step 1: Normalize and classify all data
  const normalizedLeads: NormalizedLead[] = [];
  const normalizedCalls: NormalizedCall[] = [];

  let filteredLeadsCount = 0;
  let filteredCallsCount = 0;

  rawLeads.forEach((lead) => {
    const isAfterHours = classifyLeadByTimestamp(
      new Date(lead.timestampz || lead.created_at || ""),
      lead.utm_source
    );
    const normalized = normalizeLead(lead, isAfterHours);
    if (normalized) {
      normalizedLeads.push(normalized);
    } else {
      filteredLeadsCount++;
    }
  });

  rawCalls.forEach((call) => {
    const normalized = normalizeCall(call);
    if (normalized) {
      normalizedCalls.push(normalized);
    } else {
      filteredCallsCount++;
    }
  });

  // Generate and log daily breakdown (past 4 days)
  generateAndLogDailyBreakdown(normalizedLeads, normalizedCalls, 4);

  // Step 2: Match leads with calls
  const matchMap = matchLeadsWithCalls(normalizedLeads, normalizedCalls);

  // Step 3: Group by call center (leads)
  const callCenterGroups = new Map<string, LeadCallMatch[]>();

  matchMap.forEach((match) => {
    const cc = match.lead.callCenter;
    if (!callCenterGroups.has(cc)) {
      callCenterGroups.set(cc, []);
    }
    callCenterGroups.get(cc)!.push(match);
  });

  // Step 3b: Group calls by call center
  const callsByCallCenter = new Map<string, NormalizedCall[]>();
  normalizedCalls.forEach((call) => {
    const cc = call.callCenter;
    if (!callsByCallCenter.has(cc)) {
      callsByCallCenter.set(cc, []);
    }
    callsByCallCenter.get(cc)!.push(call);
  });

  // Step 4: Calculate metrics per call center
  const byCallCenter: CallCenterMetrics[] = [];
  let totalInHoursLeads = 0;
  let totalAfterHoursLeads = 0;
  let totalCallbacks = 0;

  callCenterGroups.forEach((matches, callCenter) => {
    const callsForCC = callsByCallCenter.get(callCenter) || [];
    const metrics = calculateCallCenterMetrics(callCenter, matches, callsForCC);
    byCallCenter.push(metrics);

    totalInHoursLeads += metrics.inHours.totalLeads;
    totalAfterHoursLeads += metrics.afterHours.totalLeads;
    totalCallbacks += metrics.afterHours.callbacks;
  });

  // Sort by call center name
  byCallCenter.sort((a, b) => a.callCenter.localeCompare(b.callCenter));

  // Step 5: Calculate overall callback rate
  const overallCallbackRate =
    totalAfterHoursLeads > 0
      ? (totalCallbacks / totalAfterHoursLeads) * 100
      : 0;

  return {
    totalInHoursLeads,
    totalAfterHoursLeads,
    totalCallbacks,
    overallCallbackRate,
    byCallCenter,
  };
}

/**
 * Calculate metrics for a single call center
 */
function calculateCallCenterMetrics(
  callCenter: string,
  matches: LeadCallMatch[],
  allCalls: NormalizedCall[]
): CallCenterMetrics {
  let inHoursLeads = 0;
  let inHoursUniqueCalls = 0;
  let afterHoursLeads = 0;
  let afterHoursCallbacks = 0;
  let totalUniqueCalls = 0;

  // Count actual calls from Ringba (not just matched ones)
  let totalInHoursCalls = 0;
  let totalAfterHoursCalls = 0;

  // Count all calls by type
  allCalls.forEach((call) => {
    if (call.isAfterHours) {
      totalAfterHoursCalls++;
    } else {
      totalInHoursCalls++;
    }
  });

  // Track unique leads that received ANY call (for total unique calls)
  const leadsWithCalls = new Set<string>();

  matches.forEach((match) => {
    const { lead, calls } = match;

    // Track total unique calls (any lead that received any call)
    if (calls.length > 0) {
      leadsWithCalls.add(`${lead.callCenter}-${lead.cid || lead.phone}`);
    }

    if (lead.isAfterHours) {
      // After-hours lead
      afterHoursLeads++;

      // Check if this after-hours lead received any call (callback)
      if (calls.length > 0) {
        afterHoursCallbacks++;
      }
    } else {
      // In-hours lead
      inHoursLeads++;

      // Check if this in-hours lead has at least one in-hours call (not SMS)
      const hasInHours = hasInHoursCall(match);
      if (hasInHours) {
        inHoursUniqueCalls++;
      }
    }
  });

  // Total unique calls = number of unique leads that received any call
  totalUniqueCalls = leadsWithCalls.size;

  // Calculate rates
  const callRate = inHoursLeads > 0 ? (inHoursUniqueCalls / inHoursLeads) * 100 : 0;
  const callbackRate = afterHoursLeads > 0 ? (afterHoursCallbacks / afterHoursLeads) * 100 : 0;

  // Calculate total leads sent (all leads for this call center)
  const totalLeadsSent = matches.length;

  // Calculate total calls missed after hours
  const totalCallsMissedAfterHours = afterHoursLeads - afterHoursCallbacks;

  // Get operating hours string
  const operatingHours = formatOperatingHours(callCenter);

  return {
    callCenter,
    operatingHours,
    totalLeadsSent,
    totalCalls: allCalls.length,
    totalUniqueCalls,
    totalCallsMissedAfterHours,
    inHours: {
      totalLeads: inHoursLeads,
      totalCalls: totalInHoursCalls,
      uniqueCalls: inHoursUniqueCalls,
      callRate: Math.min(callRate, 100), // Cap at 100% as per requirement
    },
    afterHours: {
      totalLeads: afterHoursLeads,
      totalCalls: totalAfterHoursCalls,
      callbacks: afterHoursCallbacks,
      callbackRate,
    },
  };
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}
