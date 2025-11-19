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

/**
 * Calculate metrics for all call centers
 */
export function calculateMetrics(
  rawLeads: IrevLead[],
  rawCalls: RingbaCall[]
): AggregatedMetrics {
  console.log("🔄 Starting metrics calculation...");
  console.log(`📊 Raw data: ${rawLeads.length} leads, ${rawCalls.length} calls`);

  // Debug: Log sample of raw data
  if (rawLeads.length > 0) {
    console.log("📝 Sample lead:", JSON.stringify(rawLeads[0], null, 2));
  }
  if (rawCalls.length > 0) {
    console.log("📞 Sample call:", JSON.stringify(rawCalls[0], null, 2));
  }

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

  console.log(`✅ Normalized: ${normalizedLeads.length} leads, ${normalizedCalls.length} calls`);
  if (filteredLeadsCount > 0) {
    console.warn(`⚠️  Filtered out ${filteredLeadsCount} leads (missing timestamp)`);
  }
  if (filteredCallsCount > 0) {
    console.warn(`⚠️  Filtered out ${filteredCallsCount} calls (missing timestamp)`);
  }

  // Step 2: Match leads with calls
  const matchMap = matchLeadsWithCalls(normalizedLeads, normalizedCalls);
  console.log(`✅ Created ${matchMap.size} lead-call matches`);

  // Step 3: Group by call center (leads)
  const callCenterGroups = new Map<string, LeadCallMatch[]>();

  matchMap.forEach((match) => {
    const cc = match.lead.callCenter;
    if (!callCenterGroups.has(cc)) {
      callCenterGroups.set(cc, []);
    }
    callCenterGroups.get(cc)!.push(match);
  });

  // Debug: Log lead counts by call center
  console.log("📊 Leads by call center:");
  callCenterGroups.forEach((matches, cc) => {
    console.log(`  ${cc}: ${matches.length} leads`);
  });

  // Step 3b: Group calls by call center for total count
  const callsByCallCenter = new Map<string, number>();
  normalizedCalls.forEach((call) => {
    const cc = call.callCenter;
    callsByCallCenter.set(cc, (callsByCallCenter.get(cc) || 0) + 1);
  });

  console.log(`✅ Grouped into ${callCenterGroups.size} call centers`);

  // Debug: Log call counts by call center
  console.log("📊 Calls by call center:");
  callsByCallCenter.forEach((count, cc) => {
    console.log(`  ${cc}: ${count} calls`);
  });

  // Step 4: Calculate metrics per call center
  const byCallCenter: CallCenterMetrics[] = [];
  let totalInHoursLeads = 0;
  let totalAfterHoursLeads = 0;
  let totalCallbacks = 0;

  callCenterGroups.forEach((matches, callCenter) => {
    const totalCallsForCC = callsByCallCenter.get(callCenter) || 0;
    const metrics = calculateCallCenterMetrics(callCenter, matches, totalCallsForCC);
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
  matches: LeadCallMatch[],
  totalCalls: number
): CallCenterMetrics {
  let inHoursLeads = 0;
  let inHoursUniqueCalls = 0;
  let afterHoursLeads = 0;
  let afterHoursCallbacks = 0;
  let totalUniqueCalls = 0;

  // Track unique leads that received ANY call (for total unique calls)
  const leadsWithCalls = new Set<string>();

  // Debug logging for CC1
  const isCC1 = callCenter === "CC1";
  if (isCC1) {
    console.log(`\n🔍 Detailed CC1 Analysis:`);
    console.log(`  Total matches (leads): ${matches.length} (should equal Total Lead Sent)`);
    console.log(`  Total calls from Ringba: ${totalCalls}`);
  }

  matches.forEach((match, index) => {
    const { lead, calls } = match;

    // Track total unique calls (any lead that received any call)
    if (calls.length > 0) {
      leadsWithCalls.add(`${lead.callCenter}-${lead.cid || lead.phone}`);
    }

    // Debug first few leads for CC1
    if (isCC1 && index < 3) {
      console.log(`  Lead ${index + 1}:`, {
        timestamp: lead.timestamp.toISOString(),
        isAfterHours: lead.isAfterHours,
        phone: lead.phone,
        cid: lead.cid,
        callsCount: calls.length,
      });
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
      if (hasInHoursCall(match)) {
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

  // Debug final metrics for CC1
  if (isCC1) {
    console.log(`  Final CC1 Metrics:`);
    console.log(`    Total Lead Sent: ${totalLeadsSent}`);
    console.log(`    Total Calls: ${totalCalls}`);
    console.log(`    In-Hours Leads: ${inHoursLeads}`);
    console.log(`    After-Hours Leads: ${afterHoursLeads}`);
    console.log(`    Total: ${inHoursLeads + afterHoursLeads} (should equal ${totalLeadsSent})`);
  }

  return {
    callCenter,
    operatingHours,
    totalLeadsSent,
    totalCalls,
    totalUniqueCalls,
    totalCallsMissedAfterHours,
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
