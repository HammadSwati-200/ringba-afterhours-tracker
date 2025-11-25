/**
 * Normalization Utilities
 * Clean and normalize data from database
 */

import type { IrevLead, RingbaCall, NormalizedLead, NormalizedCall } from "@/lib/types";
import { isAfterHours as isAfterHoursForCenter } from "@/lib/call-center-hours";

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
 * Check if call is SMS/Text based on publisher_name
 */
export function isCallSMS(call: RingbaCall): boolean {
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
 * Check if call is after-hours based on timestamp AND call type
 *
 * After-hours call = SMS/Text call that occurs during business hours (recovery callback)
 * In-hours call = Non-SMS call that occurs during business hours
 *
 * Calls outside business hours are NOT counted as in-hours, regardless of type
 */
export function isCallAfterHours(call: RingbaCall, timestamp: Date, callCenter: string): boolean {
  const isSMS = isCallSMS(call);
  const occurredAfterHours = isAfterHoursForCenter(timestamp, callCenter);

  // SMS/Text calls during business hours = after-hours recovery callbacks
  if (isSMS && !occurredAfterHours) {
    return true;
  }

  // Non-SMS calls outside business hours are NOT counted (filtered out)
  // Non-SMS calls during business hours = in-hours calls
  return false;
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
 * Only includes calls that occur during business hours
 * Filters out non-SMS calls that occur outside business hours
 */
export function normalizeCall(call: RingbaCall): NormalizedCall | null {
  const timestamp = getCallTimestamp(call);
  if (!timestamp) return null;

  const callCenter = normalizeCallCenterId(call.call_center);
  const isSMS = isCallSMS(call);
  const occurredAfterHours = isAfterHoursForCenter(timestamp, callCenter);

  // Filter out non-SMS calls that occur outside business hours
  // These are not counted in any metrics
  if (!isSMS && occurredAfterHours) {
    return null;
  }

  return {
    callCenter,
    timestamp,
    clickId: call.click_id || null,
    phone: normalizePhoneNumber(call.caller_phone),
    isAfterHours: isCallAfterHours(call, timestamp, callCenter),
    publisherName: call.publisher_name || null,
  };
}
