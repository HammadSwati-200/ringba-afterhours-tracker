# Data Calculation Logic Analysis

## Overview

This document explains all data points, their sources, and calculation logic in the Ringba After-Hours Tracker dashboard.

---

## Data Sources

### 1. **Calls Table** (Supabase `calls` table)

- **Field Used**: `publisher_name`
- **Logic**:
  - If `publisher_name` does NOT contain "SMS" → **In Hours Call**
  - If `publisher_name` contains "SMS" → **After Hours Call**
- **Note**: This is independent of actual time - it's based on the SMS flag in the publisher name

### 2. **Leads Table** (Supabase `irev_leads` table)

- **Field Used**: `timestampz` (timestamp with timezone)
- **Logic**: Uses time-based checking with `isAfterHours()` function
- **Matching**: Links to call centers via `utm_source` field

---

## ⚠️ POTENTIAL DISCREPANCY IDENTIFIED

### The Problem:

Looking at your screenshot, I can see a **logical inconsistency**:

**Example: CC14A (first occurrence)**

- Total Leads Sent: **0**
- Leads Sent (In Hours): **0**
- Unique Calls (In Hours): **127**

**This doesn't make sense!** How can there be 127 unique calls if 0 leads were sent?

### Root Cause Analysis:

The issue is that **Calls and Leads are from DIFFERENT sources**:

1. **Calls** come from `calls` table filtered by `call_center` field
2. **Leads** come from `irev_leads` table filtered by `utm_source` field

**The call center identifiers might not match between the two tables!**

For example:

- Calls table might have `call_center = "CC14A"`
- But irev_leads table might have `utm_source = "CC_14A"` or something different

This causes:

- Calls to be counted for "CC14A"
- But leads are counted as 0 because there's no matching `utm_source = "CC14A"`

---

## Current Calculation Logic

### Dashboard Summary Cards:

1. **Total Calls**

   - Source: `calls` table
   - Logic: Count all calls in date range
   - Query: `calls.length`

2. **In-Hours Calls**

   - Source: `calls` table
   - Logic: Calls where `publisher_name` does NOT include "SMS"
   - Query: `calls.filter(call => !call.publisher_name?.includes("SMS")).length`

3. **After-Hours Calls**

   - Source: `calls` table
   - Logic: Calls where `publisher_name` includes "SMS"
   - Query: `calls.filter(call => call.publisher_name?.includes("SMS")).length`

4. **Callbacks**
   - Source: `calls` table
   - Logic: After-hours calls that had a subsequent in-hours call from same phone within 48 hours
   - Complex matching logic checking phone numbers and timestamps

### Per Call Center Stats:

1. **Total Leads Sent**

   - Source: `irev_leads` table
   - Logic: Count leads where `utm_source` matches call center ID
   - Query: `irevLeads.filter(lead => lead.utm_source === centerId).length`

2. **Leads Sent (In Hours)**

   - Source: `irev_leads` table
   - Logic: Leads where `utm_source` matches AND `isAfterHours(timestampz)` returns false
   - Query: Uses time-based checking against operating hours config

3. **Unique Calls (In Hours)**

   - Source: `calls` table
   - Logic: Unique phone numbers where `call_center` matches AND `publisher_name` does NOT include "SMS"
   - Query: `new Set(callsInHours.map(call => call.caller_phone)).size`

4. **Call Rate % (In Hours)**

   - Calculation: `(Unique Calls In Hours / Leads Sent In Hours) * 100`
   - **⚠️ Can be > 100% if leads data doesn't match calls data!**

5. **Leads Sent (After Hours)**

   - Source: `irev_leads` table
   - Logic: Leads where `utm_source` matches AND `isAfterHours(timestampz)` returns true

6. **Unique Calls (After Hours)**

   - Source: `calls` table
   - Logic: Unique phone numbers where `call_center` matches AND `publisher_name` includes "SMS"

7. **Call Rate % (After Hours)**

   - Calculation: `(Unique Calls After Hours / Leads Sent After Hours) * 100`

8. **Calls Missed After Hours**
   - Calculation: `Math.max(0, Leads Sent After Hours - Unique Calls After Hours)`

---

## Known Issues & Recommendations

### ❌ Issue 1: Identifier Mismatch

**Problem**: Call centers might have different identifiers in `calls.call_center` vs `irev_leads.utm_source`

**Evidence**: CC14A shows 0 leads but 127 calls

**Fix Needed**:

```sql
-- Check what values exist in each table
SELECT DISTINCT call_center FROM calls;
SELECT DISTINCT utm_source FROM irev_leads;
```

### ❌ Issue 2: Duplicate Call Centers

**Problem**: CC14A appears twice in the list

**Possible Causes**:

- Different variations of the name ("CC14A" vs "CC_14A" vs "CC-14A")
- Data quality issue in source tables

**Fix Needed**: Normalize call center IDs before grouping

### ❌ Issue 3: Call Rates > 100%

**Problem**: CC1 shows 471.3% call rate - this means 377 calls from only 80 leads

**Possible Causes**:

- Same person calling multiple times (we count unique phones, but one lead could call multiple times)
- People calling without being sent as leads (direct calls)
- Timing issue: lead sent yesterday, call came today (different date ranges)

**This might be EXPECTED behavior** if people can call multiple times per lead.

### ❌ Issue 4: Two Different Logic Systems

**Problem**: Calls use `publisher_name` with "SMS" flag, Leads use time-based `isAfterHours()`

**Risk**: These might not align perfectly!

- A lead sent at 9:01pm (after hours by time) might generate a call tagged as "In Hours" by publisher_name
- Or vice versa

**Recommendation**: Use consistent logic for both, OR clearly document that they measure different things.

---

## Immediate Action Items

### 1. Verify Data Consistency

Run these queries to check the data:

```sql
-- Check call center name variations in calls table
SELECT DISTINCT call_center, COUNT(*)
FROM calls
GROUP BY call_center
ORDER BY call_center;

-- Check call center name variations in leads table
SELECT DISTINCT utm_source, COUNT(*)
FROM irev_leads
GROUP BY utm_source
ORDER BY utm_source;

-- Check for publisher_name patterns
SELECT DISTINCT publisher_name, COUNT(*)
FROM calls
GROUP BY publisher_name;
```

### 2. Check Duplicate Issue

The duplicate CC14A entries suggest there might be:

- Two different actual IDs getting normalized to same name
- Or data corruption

Need to add logging to see raw IDs:

```typescript
console.log("Processing center:", centerId, "Raw ID:", centerIdRaw);
```

### 3. Validate Call Rate Logic

Decide if call rates > 100% are acceptable:

- **YES**: If multiple calls per lead is expected behavior
- **NO**: If it indicates a data matching problem

---

## Recommended Fixes

### Priority 1: Fix Identifier Matching

Add a mapping table or normalization function to ensure call centers match across tables.

### Priority 2: Remove Duplicates

Update the code to consolidate duplicate call center entries.

### Priority 3: Add Data Validation

Add checks to warn when:

- Call rate > 200% (likely data issue)
- Leads = 0 but Calls > 0 (identifier mismatch)
- Duplicate call center IDs detected

### Priority 4: Consider Unifying Logic

Either:

- Use publisher_name SMS flag for both calls AND leads, OR
- Use time-based isAfterHours() for both calls AND leads

---

## Questions to Answer

1. **Should call centers with 0 leads but >0 calls be shown?**

   - Currently: Yes, they appear in the table
   - Indicates: Data matching issue

2. **Is a call rate > 100% acceptable?**

   - If YES: Expected when people call multiple times per lead
   - If NO: Indicates data problem

3. **Should we match on call_center = utm_source exactly?**

   - Or should we normalize/map between different naming conventions?

4. **Why are there duplicate CC14A entries?**
   - Need to check raw data to understand

---

## Summary

The dashboard logic is **working as designed**, but there appears to be a **data quality/matching issue** where:

1. Call center IDs don't match between calls and leads tables
2. This causes misleading statistics (0 leads, 127 calls)
3. Duplicate entries suggest ID normalization problems

**Next Steps**:

1. Query the database to see actual call_center and utm_source values
2. Create a mapping/normalization strategy
3. Fix duplicate detection logic
4. Add data validation warnings
