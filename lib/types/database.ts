/**
 * Database Types
 * Raw types matching database schema for irev_leads and calls tables
 */

export interface IrevLead {
  id?: number;
  utm_source: string; // Call center ID
  timestampz?: string; // Lead timestamp
  created_at?: string; // Fallback timestamp
  cid?: string; // Click ID (primary matching field)
  click_id?: string; // Alternative click ID field
  phone_number_norm?: string; // Normalized phone number
  phone_number?: string; // Raw phone number
}

export interface RingbaCall {
  id?: number;
  call_center: string; // Call center ID
  call_date?: string; // Call timestamp
  created_at?: string; // Fallback timestamp
  caller_phone?: string; // Phone number
  click_id?: string; // Click ID (primary matching field)
  CC_Number?: string; // DID number called
  publisher_name?: string; // Publisher name (contains "SMS" for after-hours)
}

/**
 * Normalized data types after processing
 */
export interface NormalizedLead {
  callCenter: string; // Normalized call center ID (no underscores)
  timestamp: Date;
  cid: string | null;
  phone: string | null;
  isAfterHours: boolean;
}

export interface NormalizedCall {
  callCenter: string; // Normalized call center ID (no underscores)
  timestamp: Date;
  clickId: string | null;
  phone: string | null;
  isAfterHours: boolean; // Based on publisher_name containing "SMS"
  publisherName: string | null;
}
