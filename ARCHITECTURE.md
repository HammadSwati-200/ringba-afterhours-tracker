# Production Architecture Documentation

**Last Updated:** 2025-11-19
**Status:** Production-Ready ✅

## Overview

This document describes the production-level architecture implemented for the Ringba After-Hours Tracker application. The architecture follows clean code principles with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard Component                      │
│                   (UI Layer - 434 lines)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ uses
┌─────────────────────────────────────────────────────────────┐
│                      React Hooks Layer                        │
│  • useCallCenterMetrics (data fetching & state)             │
│  • useDateRange (date state management)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ uses
┌──────────────────────┬──────────────────────┬───────────────┐
│   Services Layer     │   Utils Layer        │  Types Layer  │
│  • supabase.service  │  • normalization     │  • database   │
│  • export.service    │  • classification    │  • metrics    │
│                      │  • matching          │               │
│                      │  • calculations      │               │
└──────────────────────┴──────────────────────┴───────────────┘
                            ↓ accesses
┌─────────────────────────────────────────────────────────────┐
│                         Supabase DB                          │
│               • irev_leads table                             │
│               • calls table                                  │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
lib/
├── types/                          # TypeScript type definitions
│   ├── database.ts                 # Raw database types
│   ├── metrics.ts                  # Business metric types
│   └── index.ts                    # Central type exports
│
├── services/                       # Data layer (external interactions)
│   ├── supabase.service.ts         # Database queries
│   └── export.service.ts           # File exports (JSON/CSV)
│
├── utils/                          # Pure business logic
│   ├── normalization.ts            # Data cleaning
│   ├── classification.ts           # Hours classification
│   ├── matching.ts                 # Lead-call matching
│   └── calculations.ts             # Metrics calculations
│
├── hooks/                          # React state management
│   ├── useCallCenterMetrics.ts     # Main data hook
│   └── useDateRange.ts             # Date range hook
│
└── call-center-hours.ts            # Call center configuration

app/
└── Dashboard.tsx                   # Main UI component
```

## Layer Responsibilities

### 1. Types Layer (`lib/types/`)

**Purpose:** Define TypeScript interfaces for type safety

**Files:**
- `database.ts` - Raw database row types matching Supabase schema
- `metrics.ts` - Business domain types for calculated metrics
- `index.ts` - Exports all types for easy importing

**Usage:**
```typescript
import type { IrevLead, RingbaCall, AggregatedMetrics } from "@/lib/types";
```

### 2. Services Layer (`lib/services/`)

**Purpose:** Handle external interactions (database, file system)

**Files:**

**`supabase.service.ts`**
- Fetches data from Supabase
- Implements pagination (1000 records per batch)
- Parallel fetching for performance
- Error handling

**`export.service.ts`**
- Exports data to JSON format
- Exports data to CSV format
- Client-side file download

**Usage:**
```typescript
import { supabaseService } from "@/lib/services/supabase.service";
import { exportAsJSON, exportAsCSV } from "@/lib/services/export.service";

const { leads, calls } = await supabaseService.fetchAllData(start, end);
exportAsJSON(metrics, "metrics.json");
```

### 3. Utils Layer (`lib/utils/`)

**Purpose:** Pure functions for business logic (no side effects)

**Files:**

**`normalization.ts`**
- Normalize call center IDs (remove underscores)
- Normalize phone numbers (remove formatting)
- Extract timestamps from leads/calls
- Check if call is after-hours (SMS detection)

**`classification.ts`**
- Classify leads by timestamp against business hours
- Classify calls by publisher_name (SMS detection)

**`matching.ts`**
- Match leads with calls by cid ↔ click_id (primary)
- Fallback to phone number matching
- Efficient O(1) lookup using Maps

**`calculations.ts`**
- Main metrics calculation engine
- Per-call-center metrics
- Aggregated totals
- Rate calculations

**Usage:**
```typescript
import { normalizePhoneNumber } from "@/lib/utils/normalization";
import { matchLeadsWithCalls } from "@/lib/utils/matching";
import { calculateMetrics } from "@/lib/utils/calculations";

const metrics = calculateMetrics(rawLeads, rawCalls);
```

### 4. Hooks Layer (`lib/hooks/`)

**Purpose:** Manage React state and side effects

**Files:**

**`useCallCenterMetrics.ts`**
- Fetches and calculates metrics
- Manages loading/error states
- Provides filtering capabilities
- Returns: `{ metrics, loading, error, fetchMetrics }`

**`useDateRange.ts`**
- Manages date range state
- Default: Last 7 days
- Returns: `{ dateRange, updateDateRange }`

**Usage:**
```typescript
import { useCallCenterMetrics } from "@/lib/hooks/useCallCenterMetrics";
import { useDateRange } from "@/lib/hooks/useDateRange";

const { metrics, loading, error, fetchMetrics } = useCallCenterMetrics();
const { dateRange, updateDateRange } = useDateRange();
```

### 5. Component Layer (`app/Dashboard.tsx`)

**Purpose:** UI rendering and user interactions

**Responsibilities:**
- Render UI components
- Handle user events
- Use hooks for state
- Display data from services

**NOT responsible for:**
- ❌ Data fetching logic
- ❌ Business calculations
- ❌ Data normalization
- ❌ Matching algorithms

**Size:** 434 lines (was 1,692 lines - 74% reduction!)

## Data Flow

### 1. Initial Load

```
User Opens Dashboard
        ↓
useEffect triggers
        ↓
useCallCenterMetrics.fetchMetrics()
        ↓
supabaseService.fetchAllData()
        ↓
[Parallel fetch leads + calls]
        ↓
calculateMetrics(leads, calls)
        ↓
normalizeLead() × N
normalizeCall() × M
        ↓
matchLeadsWithCalls()
        ↓
calculateCallCenterMetrics() × call centers
        ↓
Return AggregatedMetrics
        ↓
Update state → Re-render UI
```

### 2. Export Flow

```
User clicks Export → CSV
        ↓
handleExport("csv")
        ↓
exportAsCSV(filteredMetrics)
        ↓
Format data as CSV string
        ↓
Create Blob → Download file
```

### 3. Filter Flow

```
User selects Call Center
        ↓
setSelectedCallCenter(id)
        ↓
useMemo recalculates filteredMetrics
        ↓
Filter byCallCenter array
        ↓
Recalculate totals
        ↓
Re-render table with filtered data
```

## Performance Optimizations

### 1. React Optimizations

✅ **useMemo** - Memoize expensive calculations
```typescript
const filteredMetrics = useMemo(() => {
  // ... filtering logic
}, [metrics, selectedCallCenter]);
```

✅ **useCallback** - Prevent unnecessary re-renders
```typescript
const handleRefresh = useCallback(() => {
  fetchMetrics(dateRange);
}, [dateRange, fetchMetrics]);
```

### 2. Data Fetching Optimizations

✅ **Parallel Fetching** - Fetch leads and calls simultaneously
```typescript
const [leads, calls] = await Promise.all([
  this.fetchLeads(startDate, endDate),
  this.fetchCalls(startDate, endDate),
]);
```

✅ **Pagination** - Handle large datasets efficiently
- Batch size: 1000 records
- Continues until all data fetched

### 3. Matching Optimizations

✅ **O(1) Lookup** - Use Maps for efficient matching
```typescript
const callsByClickId = new Map<string, NormalizedCall[]>();
// O(1) lookup instead of O(n) array.find()
```

## Business Logic Implementation

### Lead Classification

**In-Hours Leads:**
- Lead timestamp falls within configured business hours
- Uses `getDailyWindows()` from `call-center-hours.ts`
- Accounts for timezone (PST/MST)

**After-Hours Leads:**
- Lead timestamp falls outside business hours
- Includes weekends for Mon-Fri centers
- Window: closing time → next opening time

### Call Classification

**In-Hours Calls:**
- Call during business hours
- `publisher_name` does NOT contain "SMS"

**After-Hours Calls (Callbacks):**
- Call during business hours
- `publisher_name` contains "SMS" (case-insensitive)
- Indicates recovery of after-hours lead

### Matching Algorithm

**Step 1: Primary Match** (cid ↔ click_id)
```typescript
if (lead.cid && call.clickId && lead.cid === call.clickId) {
  // Match found
}
```

**Step 2: Fallback Match** (phone number)
```typescript
if (normalizePhone(lead.phone) === normalizePhone(call.phone)) {
  // Match found
}
```

**Filtering:** Only matches within same call center

### Metrics Calculation

**Per Call Center:**

1. **Total Leads (In-Hours)**
   - Count leads with timestamp during business hours

2. **Unique Calls (In-Hours)**
   - Count leads with ≥1 matched non-SMS call

3. **Call Rate % (In-Hours)**
   - `(Unique Calls / Total Leads) × 100`
   - Capped at 100%

4. **Total Leads (After-Hours)**
   - Count leads with timestamp outside business hours

5. **Callbacks**
   - Count after-hours leads with ≥1 matched call

6. **Callback Rate %**
   - `(Callbacks / After-Hours Leads) × 100`

**Aggregated:**
- Sum all metrics across call centers
- Calculate overall callback rate

## Error Handling

### Service Layer

```typescript
try {
  const { data, error } = await supabase.from("calls").select("*");
  if (error) throw new Error(`Database error: ${error.message}`);
} catch (err) {
  console.error("Error:", err);
  throw err;
}
```

### Hook Layer

```typescript
try {
  // ... fetch logic
} catch (err) {
  const error = err instanceof Error ? err : new Error("Unknown error");
  setError(error);
}
```

### Component Layer

```typescript
{error && (
  <Card className="border-red-200 bg-red-50">
    <CardContent>
      <p>{error.message}</p>
      <Button onClick={handleRetry}>Try Again</Button>
    </CardContent>
  </Card>
)}
```

## Testing Strategy

### Unit Tests (Recommended)

**Utils Layer** - Pure functions, easy to test
```typescript
describe("normalizePhoneNumber", () => {
  it("should remove formatting", () => {
    expect(normalizePhoneNumber("+1-234-567-8900")).toBe("12345678900");
  });
});
```

**Calculations** - Test metrics logic
```typescript
describe("calculateMetrics", () => {
  it("should calculate correct call rate", () => {
    const metrics = calculateMetrics(mockLeads, mockCalls);
    expect(metrics.byCallCenter[0].inHours.callRate).toBe(75.0);
  });
});
```

### Integration Tests

**Hooks** - Test with mock Supabase
```typescript
it("should fetch and calculate metrics", async () => {
  const { result } = renderHook(() => useCallCenterMetrics());
  await waitFor(() => expect(result.current.metrics).toBeDefined());
});
```

### E2E Tests

**Full flow** - Test complete user journey
```typescript
it("should load dashboard and display data", async () => {
  render(<Dashboard />);
  await waitFor(() => screen.getByText(/Total Leads/));
  expect(screen.getByText("1,234")).toBeInTheDocument();
});
```

## Deployment Checklist

- [x] All TypeScript types defined
- [x] Error handling implemented
- [x] Loading states added
- [x] Performance optimizations (memoization)
- [x] Clean code structure
- [x] Documentation complete
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] E2E tests written
- [ ] Performance testing
- [ ] Security audit

## Future Enhancements

### Potential Improvements

1. **Caching** - Add React Query for better caching
2. **Real-time** - Subscribe to Supabase real-time updates
3. **Pagination** - Add UI pagination for large datasets
4. **Charts** - Add visual charts for metrics
5. **Filters** - Advanced filtering (date presets, multi-select)
6. **Sorting** - Sort table by any column
7. **Search** - Search for specific call centers
8. **Exports** - Add Excel export, PDF reports

### Code Quality

- **Linting:** Run `npm run lint`
- **Type Check:** `tsc --noEmit`
- **Format:** Consider Prettier
- **Tests:** Add Jest + React Testing Library

## Maintenance Notes

### Adding a New Metric

1. Add type to `lib/types/metrics.ts`
2. Add calculation logic to `lib/utils/calculations.ts`
3. Update UI in `app/Dashboard.tsx`
4. Update export in `lib/services/export.service.ts`

### Adding a New Data Source

1. Add type to `lib/types/database.ts`
2. Add fetch method to `lib/services/supabase.service.ts`
3. Update calculation logic in `lib/utils/calculations.ts`

### Debugging

**Enable console logs:**
- Services: Check fetch logs in `supabase.service.ts`
- Calculations: Check calculation logs in `calculations.ts`

**Common Issues:**
- **No data:** Check date range, Supabase connection
- **Wrong calculations:** Verify business logic in utils
- **Performance:** Check React DevTools Profiler

---

**Questions?** Check `CLAUDE.md` for project-specific logic details.
