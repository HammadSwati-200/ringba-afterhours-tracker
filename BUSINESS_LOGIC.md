# Business Logic Documentation

**Last Updated:** 2025-11-19
**Status:** Implemented ✅

## Overview

This document explains the exact business logic implemented for calculating call center performance metrics.

## Data Sources

### 1. iRev Leads (`irev_leads` table)

**Key Fields:**
- `utm_source` - Call center ID
- `timestampz` or `created_at` - Lead timestamp
- `cid` or `click_id` - Click ID for matching
- `phone_number_norm` or `phone_number` - Phone number

**Purpose:** Tracks all leads sent to call centers

### 2. Ringba Calls (`calls` table)

**Key Fields:**
- `call_center` - Call center ID
- `call_date` or `created_at` - Call timestamp
- `click_id` - Click ID for matching
- `caller_phone` - Phone number
- `publisher_name` - Publisher (contains "SMS" for after-hours)

**Purpose:** Tracks all calls received by call centers

## Grouping

**All data is grouped by Call Center:**
- Leads: Grouped by `utm_source`
- Calls: Grouped by `call_center`
- IDs normalized (underscores removed): `CC_14` → `CC14`

## Matching Logic

### Primary Match: Click ID

```
irev_lead.cid ↔ ringba_call.click_id
```

**Steps:**
1. Check if lead has `cid` (or fallback `click_id`)
2. Find calls with matching `click_id`
3. Filter to same call center

### Fallback Match: Phone Number

```
irev_lead.phone_number ↔ ringba_call.caller_phone
```

**Steps:**
1. If no CID match found
2. Normalize both phone numbers (remove all non-digits)
3. Match by normalized phone
4. Filter to same call center

### Uniqueness

**Each lead is counted only once per call center:**
- Unique by: `call_center` + (`cid` OR `phone`)
- Multiple calls to same lead = still 1 unique lead

## Hours Classification

### Lead Classification

Leads are classified based on **timestamp** against call center's configured hours.

**In-Hours Lead:**
- Lead `timestampz` falls within business hours
- Uses call center's configured hours from `call-center-hours.ts`
- Timezone-aware (PST/MST)
- Respects days of week

**After-Hours Lead:**
- Lead `timestampz` falls outside business hours
- From closing time → next opening time
- Includes weekends for Mon-Fri centers
- Example: Friday 8pm → Monday 9am

### Call Classification

Calls are classified based on **publisher_name** field.

**In-Hours Call:**
- `publisher_name` does NOT contain "SMS" (case-insensitive)
- These are regular calls during business hours

**After-Hours Call (SMS/Callback):**
- `publisher_name` contains "SMS" (case-insensitive)
- These indicate callbacks or after-hours contacts

## Metrics Calculation

### Per Call Center Metrics

#### 1. Total Leads Sent (In-Hours)

```
Count of leads where timestamp is during business hours
```

**Logic:**
```typescript
leads.filter(lead =>
  leadTimestamp >= businessHoursStart AND
  leadTimestamp < businessHoursEnd
).length
```

#### 2. Total Unique Calls (In-Hours)

```
Count of in-hours leads that have ≥1 matched NON-SMS call
```

**Logic:**
```typescript
inHoursLeads.filter(lead =>
  lead.matchedCalls.some(call =>
    !call.publisher_name.includes("SMS")
  )
).length
```

**Key Point:** Only NON-SMS calls count as in-hours calls

#### 3. Call Rate % (In-Hours)

```
(Total Unique Calls In-Hours / Total Leads In-Hours) × 100
```

**Capped at 100%:** Yes (per requirement)

**Example:**
- 100 leads during business hours
- 75 of those leads received non-SMS calls
- Call Rate = 75%

#### 4. Total Leads Sent (After-Hours)

```
Count of leads where timestamp is outside business hours
```

**Logic:**
```typescript
leads.filter(lead =>
  leadTimestamp < businessHoursStart OR
  leadTimestamp >= businessHoursEnd
).length
```

#### 5. Callbacks (After-Hours Recovery)

```
Count of after-hours leads that received ANY call
```

**Logic:**
```typescript
afterHoursLeads.filter(lead =>
  lead.matchedCalls.length > 0
).length
```

**Key Point:** ANY call counts (SMS or non-SMS)

#### 6. Callback Rate %

```
(Callbacks / Total After-Hours Leads) × 100
```

**NOT capped:** Can be any percentage

**Example:**
- 50 leads after hours
- 30 of those received callbacks
- Callback Rate = 60%

### Aggregated Metrics

#### Total In-Hours Leads (All Centers)

```
Sum of all in-hours leads across all call centers
```

#### Total After-Hours Leads (All Centers)

```
Sum of all after-hours leads across all call centers
```

#### Total Callbacks (All Centers)

```
Sum of all callbacks across all call centers
```

#### Overall Callback Rate %

```
(Total Callbacks / Total After-Hours Leads) × 100
```

## Business Rules

### Rule 1: Call Rate Cannot Exceed 100%

**Reasoning:** You cannot have more calls than leads (iRev sends leads → Ringba makes calls)

**Implementation:**
```typescript
callRate = Math.min((uniqueCalls / totalLeads) * 100, 100)
```

### Rule 2: SMS Calls Are After-Hours

**Reasoning:** SMS indicates the lead came in after hours, so callback was via SMS

**Implementation:**
```typescript
isAfterHours = publisherName?.toLowerCase().includes("sms")
```

### Rule 3: Zero Division Handling

**When denominator is 0, show 0%**

**Implementation:**
```typescript
callRate = totalLeads > 0 ? (uniqueCalls / totalLeads) * 100 : 0
```

### Rule 4: Same Call Center Matching Only

**Leads only match with calls from same call center**

**Implementation:**
```typescript
matchedCalls = calls.filter(call =>
  call.callCenter === lead.callCenter
)
```

### Rule 5: Timezone-Aware Hours

**All time checks use call center's configured timezone**

**Implementation:**
- Uses `date-fns-tz` for proper timezone handling
- PST = "America/Los_Angeles"
- MST = "America/Denver"

## Edge Cases

### Case 1: Lead with Multiple Calls

**Scenario:** 1 lead receives 3 calls

**Result:** Counted as 1 unique call (not 3)

**Reason:** We count unique LEADS that received calls, not total call count

### Case 2: Lead with No CID

**Scenario:** Lead has no `cid` or `click_id`

**Fallback:** Match by phone number

**If no phone:** Lead cannot be matched, counts as 0 calls

### Case 3: Call Center with No Hours

**Scenario:** Call center has no configured business hours

**Result:** All leads treated as in-hours (always open)

**Implementation:**
```typescript
if (!config.startHour || !config.endHour) {
  return false; // Not after-hours = in-hours
}
```

### Case 4: Weekend Leads (Mon-Fri Center)

**Scenario:** Lead comes in on Sunday at 2pm for Mon-Fri center

**Result:** After-hours lead

**Reason:** Sunday is not in `daysOfWeek` array

### Case 5: Multiple Leads Same Phone

**Scenario:** 2 different leads (`cid1`, `cid2`) with same phone number

**Result:** Counted as 2 separate leads

**Reason:** Each lead is unique by call center + (`cid` OR `phone`)

## Data Flow Example

### Example Scenario

**Call Center:** CC1
**Business Hours:** 9am-8pm PST, Mon-Fri

**Leads (irev_leads):**
1. Lead A: Monday 10am, cid=123, phone=5551234
2. Lead B: Monday 9pm, cid=456, phone=5555678
3. Lead C: Saturday 2pm, cid=789, phone=5551111

**Calls (calls):**
1. Call X: Monday 10:30am, click_id=123, publisher="Google"
2. Call Y: Tuesday 10am, click_id=456, publisher="SMS Text"

### Processing

**Step 1: Classification**
- Lead A: In-hours (Monday 10am is within 9am-8pm)
- Lead B: After-hours (Monday 9pm is after 8pm close)
- Lead C: After-hours (Saturday not in Mon-Fri)

**Step 2: Matching**
- Lead A ↔ Call X (cid 123 = click_id 123)
- Lead B ↔ Call Y (cid 456 = click_id 456)
- Lead C ↔ No match

**Step 3: Call Classification**
- Call X: In-hours (publisher="Google", no SMS)
- Call Y: After-hours (publisher="SMS Text", contains SMS)

**Step 4: Metrics**

| Metric | Value | Calculation |
|--------|-------|-------------|
| Total Leads (In-Hours) | 1 | Lead A only |
| Unique Calls (In-Hours) | 1 | Lead A matched Call X (non-SMS) |
| Call Rate (In-Hours) | 100% | 1/1 × 100 |
| Total Leads (After-Hours) | 2 | Lead B, Lead C |
| Callbacks | 1 | Lead B matched Call Y |
| Callback Rate | 50% | 1/2 × 100 |

## Implementation Files

| Aspect | File | Function |
|--------|------|----------|
| Hours Classification | `lib/utils/classification.ts` | `classifyLeadByTimestamp()` |
| SMS Detection | `lib/utils/normalization.ts` | `isCallAfterHours()` |
| Matching | `lib/utils/matching.ts` | `matchLeadsWithCalls()` |
| Metrics Calculation | `lib/utils/calculations.ts` | `calculateMetrics()` |
| Data Fetching | `lib/services/supabase.service.ts` | `fetchAllData()` |

## Verification

To verify calculations:

1. Check console logs during data load
2. Export data as JSON for manual verification
3. Compare with database queries
4. Use debug mode (add `?debug=1` to URL)

## Common Questions

**Q: Why is call rate sometimes over 100%?**
A: This shouldn't happen anymore - call rate is capped at 100%

**Q: What if lead has both cid and phone?**
A: CID match takes priority, phone is only used as fallback

**Q: How are timezones handled?**
A: Using `date-fns-tz` with IANA timezones (America/Los_Angeles, America/Denver)

**Q: What counts as an after-hours call?**
A: Any call where `publisher_name` contains "SMS" (case-insensitive)

**Q: Can callback rate exceed 100%?**
A: No, because each after-hours lead can only be counted once maximum

---

**For architecture details, see:** `ARCHITECTURE.md`
**For call center hours config, see:** `lib/call-center-hours.ts`
