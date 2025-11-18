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

/**
 * Calculate metrics for all call centers
 */
export function calculateMetrics(
  rawLeads: IrevLead[],
  rawCalls: RingbaCall[]
): AggregatedMetrics {
  console.log("🔄 Starting metrics calculation...");
  console.log(`📊 Raw data: ${rawLeads.length} leads, ${rawCalls.length} calls`);

  // Step 1: Normalize and classify all data
  const normalizedLeads: NormalizedLead[] = [];
  const normalizedCalls: NormalizedCall[] = [];

  rawLeads.forEach((lead) => {
    const isAfterHours = classifyLeadByTimestamp(
      new Date(lead.timestampz || lead.created_at || ""),
      lead.utm_source
    );
    const normalized = normalizeLead(lead, isAfterHours);
    if (normalized) {
      normalizedLeads.push(normalized);
    }
  });

  rawCalls.forEach((call) => {
    const normalized = normalizeCall(call);
    if (normalized) {
      normalizedCalls.push(normalized);
    }
  });

  console.log(`✅ Normalized: ${normalizedLeads.length} leads, ${normalizedCalls.length} calls`);

  // Step 2: Match leads with calls
  const matchMap = matchLeadsWithCalls(normalizedLeads, normalizedCalls);
  console.log(`✅ Created ${matchMap.size} lead-call matches`);

  // Step 3: Group by call center
  const callCenterGroups = new Map<string, LeadCallMatch[]>();

  matchMap.forEach((match) => {
    const cc = match.lead.callCenter;
    if (!callCenterGroups.has(cc)) {
      callCenterGroups.set(cc, []);
    }
    callCenterGroups.get(cc)!.push(match);
  });

  console.log(`✅ Grouped into ${callCenterGroups.size} call centers`);

  // Step 4: Calculate metrics per call center
  const byCallCenter: CallCenterMetrics[] = [];
  let totalInHoursLeads = 0;
  let totalAfterHoursLeads = 0;
  let totalCallbacks = 0;

  callCenterGroups.forEach((matches, callCenter) => {
    const metrics = calculateCallCenterMetrics(callCenter, matches);
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

  console.log("✅ Metrics calculation complete");
  console.log(`📈 Totals: ${totalInHoursLeads} in-hours, ${totalAfterHoursLeads} after-hours, ${totalCallbacks} callbacks`);

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
  matches: LeadCallMatch[]
): CallCenterMetrics {
  let inHoursLeads = 0;
  let inHoursUniqueCalls = 0;
  let afterHoursLeads = 0;
  let afterHoursCallbacks = 0;

  matches.forEach((match) => {
    const { lead, calls } = match;

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
      if (hasInHoursCall(match)) {
        inHoursUniqueCalls++;
      }
    }
  });

  // Calculate rates
  const callRate = inHoursLeads > 0 ? (inHoursUniqueCalls / inHoursLeads) * 100 : 0;
  const callbackRate = afterHoursLeads > 0 ? (afterHoursCallbacks / afterHoursLeads) * 100 : 0;

  return {
    callCenter,
    inHours: {
      totalLeads: inHoursLeads,
      uniqueCalls: inHoursUniqueCalls,
      callRate: Math.min(callRate, 100), // Cap at 100% as per requirement
    },
    afterHours: {
      totalLeads: afterHoursLeads,
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
