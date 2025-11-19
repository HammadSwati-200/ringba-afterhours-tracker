/**
 * Normalization Utilities
 * Clean and normalize data from database
 */

import type { IrevLead, RingbaCall, NormalizedLead, NormalizedCall } from "@/lib/types";

/**
 * Normalize call center ID by removing underscores
 * CC_14 → CC14
 */
export function normalizeCallCenterId(id: string): string {
  return id.replace(/_/g, "");
}

/**
 * Normalize phone number by removing special characters
 * +1-234-567-8900 → 12345678900
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/\D/g, "");
}

/**
 * Get timestamp from lead (try timestampz first, fallback to created_at)
 */
export function getLeadTimestamp(lead: IrevLead): Date | null {
  const timestamp = lead.timestampz || lead.created_at;
  if (!timestamp) return null;
  return new Date(timestamp);
}

/**
 * Get timestamp from call (try call_date first, fallback to created_at)
 */
export function getCallTimestamp(call: RingbaCall): Date | null {
  const timestamp = call.call_date || call.created_at;
  if (!timestamp) return null;
  return new Date(timestamp);
}

/**
 * Check if call is after-hours based on publisher_name
 * After-hours = publisher_name contains "SMS" (case-insensitive)
 * Examples: SMS-PP, SMS, Text, etc.
 *
 * Any call WITH "SMS" in publisher_name = after-hours call (callback)
 * Any call WITHOUT "SMS" = in-hours call (regular call)
 */
export function isCallAfterHours(call: RingbaCall): boolean {
  if (!call.publisher_name) return false;
  const publisherLower = call.publisher_name.toLowerCase();

  // Check for SMS-related keywords that indicate after-hours callbacks
  return publisherLower.includes("sms") ||
         publisherLower.includes("text") ||
         publisherLower.includes("txt") ||
         publisherLower.includes("message") ||
         publisherLower.includes("messaging");
}

/**
 * Normalize iRev lead to standard format
 */
export function normalizeLead(lead: IrevLead, isAfterHours: boolean): NormalizedLead | null {
  const timestamp = getLeadTimestamp(lead);
  if (!timestamp) return null;

  return {
    callCenter: normalizeCallCenterId(lead.utm_source),
    timestamp,
    cid: lead.cid || lead.click_id || null,
    phone: normalizePhoneNumber(lead.phone_number_norm || lead.phone_number),
    isAfterHours,
  };
}

/**
 * Normalize Ringba call to standard format
 */
export function normalizeCall(call: RingbaCall): NormalizedCall | null {
  const timestamp = getCallTimestamp(call);
  if (!timestamp) return null;

  return {
    callCenter: normalizeCallCenterId(call.call_center),
    timestamp,
    clickId: call.click_id || null,
    phone: normalizePhoneNumber(call.caller_phone),
    isAfterHours: isCallAfterHours(call),
    publisherName: call.publisher_name || null,
  };
}
