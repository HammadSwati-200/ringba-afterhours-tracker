/**
 * Classification Utilities
 * Classify leads and calls as in-hours or after-hours
 */

import { isAfterHours as isAfterHoursForCenter } from "@/lib/call-center-hours";

/**
 * Classify if a lead timestamp is after-hours for a call center
 * Uses configured business hours from call-center-hours.ts
 */
export function classifyLeadByTimestamp(
  timestamp: Date,
  callCenterId: string
): boolean {
  return isAfterHoursForCenter(timestamp, callCenterId);
}

/**
 * Classify if a call is after-hours
 * Based on publisher_name containing "SMS"
 */
export function classifyCallByPublisher(publisherName: string | null): boolean {
  if (!publisherName) return false;
  return publisherName.toLowerCase().includes("sms");
}
