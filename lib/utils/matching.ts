/**
 * Matching Utilities
 * Match iRev leads with Ringba calls
 */

import type { NormalizedLead, NormalizedCall } from "@/lib/types";

export interface LeadCallMatch {
  lead: NormalizedLead;
  calls: NormalizedCall[];
}

/**
 * Match leads with calls using two-step matching:
 * 1. Primary: Match by phone number (most reliable since click_id often missing)
 * 2. Fallback: Match by cid (lead) ↔ clickId (call)
 *
 * Returns a map of leads with their matched calls
 */
export function matchLeadsWithCalls(
  leads: NormalizedLead[],
  calls: NormalizedCall[]
): Map<string, LeadCallMatch> {
  const matchMap = new Map<string, LeadCallMatch>();

  // Create lookup maps for efficient matching
  const callsByClickId = new Map<string, NormalizedCall[]>();
  const callsByPhone = new Map<string, NormalizedCall[]>();

  // Index calls by clickId and phone for O(1) lookup
  calls.forEach((call) => {
    // Index by clickId
    if (call.clickId) {
      if (!callsByClickId.has(call.clickId)) {
        callsByClickId.set(call.clickId, []);
      }
      callsByClickId.get(call.clickId)!.push(call);
    }

    // Index by phone
    if (call.phone) {
      if (!callsByPhone.has(call.phone)) {
        callsByPhone.set(call.phone, []);
      }
      callsByPhone.get(call.phone)!.push(call);
    }
  });

  // Match each lead
  leads.forEach((lead) => {
    const leadKey = `${lead.callCenter}-${lead.cid || lead.phone || lead.timestamp.getTime()}`;
    let matchedCalls: NormalizedCall[] = [];

    // Step 1: Try matching by phone number (primary, most reliable)
    if (lead.phone) {
      const phoneMatches = callsByPhone.get(lead.phone) || [];
      // Filter to same call center
      matchedCalls = phoneMatches.filter(
        (call) => call.callCenter === lead.callCenter
      );
    }

    // Step 2: Fallback to cid ↔ clickId matching if no phone match
    if (matchedCalls.length === 0 && lead.cid) {
      const cidMatches = callsByClickId.get(lead.cid) || [];
      // Filter to same call center
      matchedCalls = cidMatches.filter(
        (call) => call.callCenter === lead.callCenter
      );
    }

    matchMap.set(leadKey, {
      lead,
      calls: matchedCalls,
    });
  });

  return matchMap;
}

/**
 * Check if a lead has at least one matched call
 */
export function hasMatchedCall(match: LeadCallMatch): boolean {
  return match.calls.length > 0;
}

/**
 * Check if a lead has at least one in-hours call
 */
export function hasInHoursCall(match: LeadCallMatch): boolean {
  return match.calls.some((call) => !call.isAfterHours);
}

/**
 * Check if a lead has at least one after-hours call (callback)
 */
export function hasAfterHoursCallback(match: LeadCallMatch): boolean {
  return match.calls.some((call) => call.isAfterHours);
}
