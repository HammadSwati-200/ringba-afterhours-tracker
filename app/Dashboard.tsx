"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import {
  isAfterHours,
  formatOperatingHours,
  getCallCenterName,
  callCenterHours,
} from "@/lib/call-center-hours";

// Types for strict matching
interface CallRow {
  call_center: string;
  created_at?: string;
  call_date?: string;
  caller_phone?: string;
  click_id?: string; // Primary click ID field (snake_case matches DB convention)
  CC_Number?: string;
  publisher_name?: string;
}

interface LeadRow {
  utm_source?: string;
  timestampz?: string;
  created_at?: string;
  cid?: string;
  click_id?: string; // Primary click ID field (snake_case matches DB convention)
  phone_number_norm?: string;
  phone_number?: string;
}
// All DID numbers (normalized, no +1). Used to detect DID callbacks next day.
export const ALL_DIDS: string[] = [
  "18334411529",
  "18334362190",
  "18334310623",
  "18334410032",
  "18334310301",
  "18334320783",
  "18334370501",
  "18334411630",
  "18334412492",
  "18334412564",
  "18334411593",
  "18334411506",
  "18334412568",
  "18334362221",
  "18334950158",
  "18557020153",
  "18339913927",
  "18334410027",
  "18334412573",
  "18334300436",
  "18339951463",
  "18339923833",
  "18339923731",
  "18337018811",
  "18337731567",
  "18338360164",
  "18339403006",
  "18337564307",
  "18334412617",
];
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  PhoneCall,
  Phone,
  LogOut,
  Info,
  Download,
  Filter,
  X,
  FileJson,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DateRangePicker, DateRange } from "@/components/date-range-picker";

interface CallCenterStats {
  callCenter: string;
  operatingHours: string;
  totalLeadsSent: number;
  totalLeadsSentInHours: number;
  totalUniqueCallsInHours: number;
  callRateInHours: number;
  totalLeadsSentAfterHours: number;
  totalUniqueCallsAfterHours: number;
  callRateAfterHours: number;
  totalCallMissedAfterHours: number;
}

interface AfterHoursStats {
  totalCalls: number;
  totalInHours: number;
  totalAfterHours: number;
  totalCallbacks: number;
  callbackRate: number;
  byCallCenter: {
    [key: string]: {
      total: number;
      inHours: number;
      afterHours: number;
      callbacks: number;
      rate: number;
    };
  };
  callCenterStats: CallCenterStats[];
}

export function Dashboard() {
  const [stats, setStats] = useState<AfterHoursStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const isMountedRef = useRef(true);
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(
    null
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return {
      from: sevenDaysAgo,
      to: today,
    };
  });
  const [selectedCallCenter, setSelectedCallCenter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("last7Days");
  const router = useRouter();
  const supabase = createClient();

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helpers to handle dates in local time (avoid UTC off-by-one)
  const formatLocalDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const parseLocalDate = (s: string) => {
    const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  // Sync filters with URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const callCenter = params.get("callCenter");
    const filter = params.get("filter");
    const debug = params.get("debug");

    if (startDate && endDate) {
      const from = parseLocalDate(startDate);
      const to = parseLocalDate(endDate);
      setDateRange({
        from,
        to,
      });
    }
    if (callCenter) {
      setSelectedCallCenter(callCenter);
    }
    if (filter) {
      setActiveFilter(filter);
    }
    if (debug === "1" || debug === "true") {
      setDebugMode(true);
    }
  }, [router, supabase.auth]);

  // Auth guard: redirect to /login when not authenticated and prevent data loads
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session;
      setIsAuthenticated(hasSession);
      if (!hasSession) {
        setLoading(false); // stop spinner while redirecting
        router.push("/login");
      }
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          const ok = !!session;
          setIsAuthenticated(ok);
          if (!ok) {
            setLoading(false);
            router.push("/login");
          }
        }
      );
      unsub = () => listener.subscription.unsubscribe();
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [router, supabase.auth]);

  // Update URL when filters change (only if not default). Preserve debug param when enabled.
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const defaultStart = new Date(today);
      defaultStart.setDate(today.getDate() - 7);
      defaultStart.setHours(0, 0, 0, 0);
      const defaultEnd = new Date(today);

      const isDefaultDateRange =
        formatLocalDate(dateRange.from) === formatLocalDate(defaultStart) &&
        formatLocalDate(dateRange.to) === formatLocalDate(defaultEnd);

      const isDefaultCallCenter = selectedCallCenter === "all";
      const isDefaultFilter = activeFilter === "last7Days";

      if (!isDefaultDateRange || !isDefaultCallCenter || !isDefaultFilter) {
        const params = new URLSearchParams();
        params.set("startDate", formatLocalDate(dateRange.from));
        params.set("endDate", formatLocalDate(dateRange.to));
        if (!isDefaultCallCenter) {
          params.set("callCenter", selectedCallCenter);
        }
        if (activeFilter) {
          params.set("filter", activeFilter);
        }
        if (debugMode) {
          params.set("debug", "1");
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);
      } else {
        // Clear params if back to default but preserve debug flag if enabled
        const newUrl = debugMode
          ? `${window.location.pathname}?debug=1`
          : window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [dateRange, selectedCallCenter, activeFilter, debugMode]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    (async () => {
      if (!cancelled) {
        await loadStats();
      }
    })();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedCallCenter, isAuthenticated]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      if (!dateRange?.from || !dateRange?.to) {
        return;
      }

      const startDate = dateRange.from;
      const endDate = dateRange.to;

      // Create UTC dates to avoid timezone shift bugs
      // Start of day in UTC: YYYY-MM-DD 00:00:00 UTC
      const startDateUTC = new Date(
        Date.UTC(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          0,
          0,
          0,
          0
        )
      );

      // End of day in UTC: YYYY-MM-DD 23:59:59 UTC
      const adjustedEndDate = new Date(
        Date.UTC(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23,
          59,
          59,
          999
        )
      );

      // For after-hours recovery (next-day in-hours), include next day in calls fetch
      const callsEndDate = new Date(adjustedEndDate);
      callsEndDate.setUTCDate(callsEndDate.getUTCDate() + 1);

      console.log(
        "Date Range:",
        startDateUTC.toISOString(),
        "to",
        adjustedEndDate.toISOString()
      );
      console.log("Calls fetch until:", callsEndDate.toISOString());
      console.log("Current Date:", new Date().toISOString());
      console.log("Fetching data from:", startDateUTC.toISOString());

      // Fetch calls from Ringba - fetch all records
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allCalls: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: callsPage, error: fetchError } = await supabase
          .from("calls")
          .select("*")
          .gte("created_at", startDateUTC.toISOString())
          .lte("created_at", callsEndDate.toISOString())
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fetchError) {
          console.error("Supabase error:", fetchError);
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (callsPage && callsPage.length > 0) {
          allCalls = [...allCalls, ...callsPage];
          // Only continue if we got a full page (indicates there might be more)
          hasMore = callsPage.length === pageSize;
          if (hasMore) {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      const calls = allCalls;

      // Fetch irev leads data - fetch all records
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allIrevLeads: any[] = [];
      let irevPage = 0;
      let hasMoreIrev = true;

      while (hasMoreIrev) {
        const { data: irevLeadsPage, error: irevError } = await supabase
          .from("irev_leads")
          .select("*")
          .gte("timestampz", startDateUTC.toISOString())
          .lte("timestampz", adjustedEndDate.toISOString())
          .order("timestampz", { ascending: false })
          .range(irevPage * pageSize, (irevPage + 1) * pageSize - 1);

        if (irevError) {
          console.error("Supabase irev error:", irevError);
          throw new Error(`Database error: ${irevError.message}`);
        }

        if (irevLeadsPage && irevLeadsPage.length > 0) {
          allIrevLeads = [...allIrevLeads, ...irevLeadsPage];
          // Only continue if we got a full page (indicates there might be more)
          hasMoreIrev = irevLeadsPage.length === pageSize;
          if (hasMoreIrev) {
            irevPage++;
          }
        } else {
          hasMoreIrev = false;
        }
      }

      const irevLeads = allIrevLeads;

      console.log("Fetched calls:", calls?.length || 0);
      console.log("Fetched irev leads:", irevLeads?.length || 0);

      if (calls && calls.length > 0) {
        console.log(
          "Sample call centers:",
          calls.slice(0, 3).map((c) => c.call_center)
        );
        console.log(
          "Sample call publisher_name:",
          calls.slice(0, 5).map((c) => c.publisher_name)
        );
        console.log(
          "Sample call CC_Number:",
          calls.slice(0, 5).map((c) => c.CC_Number)
        );
      }

      if (calls && calls.length > 0) {
        console.log("First call created:", calls[0].created_at);
        console.log("Last call created:", calls[calls.length - 1].created_at);
      }

      if (!calls || calls.length === 0) {
        setStats({
          totalCalls: 0,
          totalInHours: 0,
          totalAfterHours: 0,
          totalCallbacks: 0,
          callbackRate: 0,
          byCallCenter: {},
          callCenterStats: [],
        });
        setLoading(false);
        return;
      }

      // Normalize phone number to 10-digit (last 10 of digits-only), for stable matching
      const normalizePhone = (raw?: string | null): string | null => {
        if (!raw) return null;
        const digits = String(raw).replace(/\D/g, "");
        if (!digits) return null;
        // Use last 10 digits (US numbers), else use all if shorter
        return digits.length > 10 ? digits.slice(-10) : digits;
      };

      const normalizeDid = (raw?: string | null): string | null => {
        if (!raw) return null;
        const digits = String(raw).replace(/\D/g, "");
        if (!digits) return null;
        // Drop leading country code 1 if present
        return digits.length === 11 && digits.startsWith("1")
          ? digits.slice(1)
          : digits;
      };

      // Helper: Use phone as primary key for consistency
      // Phone number is more stable than click_id across different data sources
      // This prevents same person being counted multiple times with different keys
      const getCallKey = (c: CallRow): string | null => {
        const phone = normalizePhone(c?.caller_phone);
        const clickId = c?.click_id;

        // Prefer phone if available (most stable identifier)
        // Fall back to click_id only if no phone
        return phone || clickId || null;
      };

      // NEW LOGIC per client feedback:
      // In-Hours Calls: All calls during business hours that are NOT SMS
      // After-Hours Calls: SMS calls during next-day business hours after an after-hours period

      const callKeysByCenterInHours: Record<string, Set<string>> = {};
      const callKeysByCenterAfterHours: Record<string, Set<string>> = {};
      const callsByCenterKeyDates: Record<string, Map<string, Date[]>> = {};

      // Store all calls with metadata for later processing
      interface CallMetadata {
        key: string;
        date: Date;
        centerId: string;
        isSMS: boolean;
        isOnDid: boolean;
        isInHours: boolean;
      }
      const allCallsMetadata: CallMetadata[] = [];

      (calls as CallRow[]).forEach((call) => {
        const centerIdRaw: string = call.call_center;
        const centerId: string = centerIdRaw?.replace(/_/g, "");
        const key = getCallKey(call);
        if (!centerId || !key) return;
        const callDate = new Date(
          (call.created_at ?? call.call_date) as string
        );

        // Determine if SMS by publisher (check multiple SMS-related keywords)
        // Check for: SMS, Text, Texting, Message, Messaging, TXT
        const publisherName = call.publisher_name || "";
        const isSMS = /sms|text|txt|messag/i.test(publisherName);

        // Also check if the call landed on a known DID
        const isOnDid = ((): boolean => {
          const did = normalizeDid(call.CC_Number);
          return !!(did && ALL_DIDS.includes(did));
        })();

        // Determine if call timestamp is during business hours
        const isInHours = !isAfterHours(callDate, centerId);

        // Initialize data structures
        if (!callKeysByCenterInHours[centerId]) {
          callKeysByCenterInHours[centerId] = new Set();
          callKeysByCenterAfterHours[centerId] = new Set();
          callsByCenterKeyDates[centerId] = new Map();
        }

        // IN-HOURS CALLS: Calls during business hours that are NOT SMS
        if (isInHours && !isSMS) {
          callKeysByCenterInHours[centerId]!.add(key);
        }

        // Store all call metadata for after-hours processing
        allCallsMetadata.push({
          key,
          date: callDate,
          centerId,
          isSMS,
          isOnDid,
          isInHours,
        });

        // Store all calls by center for date mapping
        const map = callsByCenterKeyDates[centerId]!;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(callDate);
      });

      console.log(
        "In-hours call keys by center:",
        Object.keys(callKeysByCenterInHours).map((centerId) => ({
          centerId,
          count: callKeysByCenterInHours[centerId].size,
        }))
      );

      // Helper: build day-based windows for a center between selected from→to (local time)
      const getDailyWindows = (
        centerId: string,
        from: Date,
        to: Date
      ): {
        inHours: Array<{ start: Date; end: Date }>;
        afterHours: Array<{ start: Date; end: Date }>;
      } => {
        const normalizedId = centerId.replace(/_/g, "");
        const cfg = callCenterHours.find(
          (cc) =>
            cc.id.replace(/_/g, "") === normalizedId ||
            cc.name.replace(/_/g, "") === normalizedId ||
            cc.id === centerId ||
            cc.name === centerId
        );
        const result = {
          inHours: [] as Array<{ start: Date; end: Date }>,
          afterHours: [] as Array<{ start: Date; end: Date }>,
        };
        if (
          !cfg ||
          cfg.startHour === undefined ||
          cfg.endHour === undefined ||
          !cfg.daysOfWeek
        )
          return result;

        const addHours = (dt: Date, hour: number) => {
          const h = Math.floor(hour);
          const m = Math.round((hour % 1) * 60);
          const d = new Date(dt);
          d.setHours(h, m, 0, 0);
          return d;
        };

        // iterate per day from 'from' to 'to' inclusive
        const cursor = new Date(from);
        cursor.setHours(0, 0, 0, 0);
        const endDay = new Date(to);
        endDay.setHours(0, 0, 0, 0);
        while (cursor <= endDay) {
          const day = cursor.getDay();
          // in-hours window for this day (only if day is operating)
          if (cfg.daysOfWeek.includes(day)) {
            const start = addHours(cursor, cfg.startHour);
            const end = addHours(cursor, cfg.endHour);
            result.inHours.push({ start, end });

            // after-hours window from close of this day to open of next operating day
            const closeD = addHours(cursor, cfg.endHour);
            const nextOpDay = new Date(cursor);
            nextOpDay.setDate(nextOpDay.getDate() + 1);
            let daysToAdd = 1;
            // Search up to 7 days ahead for next operating day
            while (
              !cfg.daysOfWeek.includes(nextOpDay.getDay()) &&
              daysToAdd < 7
            ) {
              nextOpDay.setDate(nextOpDay.getDate() + 1);
              daysToAdd++;
            }
            // If we found a valid next operating day, create the after-hours window
            if (cfg.daysOfWeek.includes(nextOpDay.getDay())) {
              const openNext = addHours(nextOpDay, cfg.startHour);
              result.afterHours.push({ start: closeD, end: openNext });
            }
          } else {
            // Non-operating day: create after-hours window from midnight to next open
            // This captures Sunday 12am → Monday 8am for Mon-Sat centers
            const startOfDay = addHours(cursor, 0); // midnight
            const nextOpDay = new Date(cursor);
            nextOpDay.setDate(nextOpDay.getDate() + 1);
            let daysToAdd = 1;
            // Find next operating day
            while (
              !cfg.daysOfWeek.includes(nextOpDay.getDay()) &&
              daysToAdd < 7
            ) {
              nextOpDay.setDate(nextOpDay.getDate() + 1);
              daysToAdd++;
            }
            // If we found a valid next operating day, create the after-hours window
            if (cfg.daysOfWeek.includes(nextOpDay.getDay())) {
              const openNext = addHours(nextOpDay, cfg.startHour);
              result.afterHours.push({ start: startOfDay, end: openNext });
            }
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        return result;
      };

      // Build per-center stats based on irev leads and matched Ringba calls via cid/click_id
      const byCallCenter: {
        [key: string]: {
          total: number;
          inHours: number;
          afterHours: number;
          callbacks: number;
          rate: number;
        };
      } = {};

      // Aggregate total leads by hours for cards
      let totalLeadsInHoursAll = 0;
      let totalLeadsAfterHoursAll = 0;

      // Compute callback (after-hours recovery) as: after-hours lead → next-day in-hours call
      let callbackCount = 0;
      const callbacksByCenter: { [key: string]: number } = {};

      // Group irev leads by center (utm_source)
      const leadsByCenter: Record<string, LeadRow[]> = {};
      ((irevLeads || []) as LeadRow[]).forEach((lead) => {
        const centerId = (lead.utm_source || "").replace(/_/g, "");
        if (!centerId) return;
        if (!leadsByCenter[centerId]) leadsByCenter[centerId] = [];
        leadsByCenter[centerId].push(lead);
      });

      // First, populate after-hours calls for ALL call centers (not just those with leads)
      // After-hours calls = SMS calls during next-day in-hours
      const allCentersFromCalls = new Set<string>();
      allCallsMetadata.forEach((call) => {
        allCentersFromCalls.add(call.centerId);
      });

      // Process each call center to find after-hours SMS/DID callbacks (recovery calls during in-hours)
      allCentersFromCalls.forEach((centerId) => {
        if (!callKeysByCenterAfterHours[centerId]) {
          callKeysByCenterAfterHours[centerId] = new Set();
        }

        // Get in-hours windows for this center
        const windowsForCenter = getDailyWindows(
          centerId,
          startDateUTC,
          adjustedEndDate
        );

        // Find ALL SMS/DID calls that occurred during in-hours windows
        // These are "after-hours recovery" calls (callbacks from after-hours leads)
        const afterHoursCallKeys = new Set<string>();

        allCallsMetadata.forEach((call) => {
          // Only process calls for this center
          if (call.centerId !== centerId) return;

          // Only SMS or DID calls count as after-hours recovery
          if (!call.isSMS && !call.isOnDid) return;

          // Check if call occurred during in-hours window
          const isInHoursWindow = windowsForCenter.inHours.some(
            (w) => call.date >= w.start && call.date < w.end
          );

          if (isInHoursWindow) {
            afterHoursCallKeys.add(call.key);
          }
        });

        callKeysByCenterAfterHours[centerId] = afterHoursCallKeys;

        // Callbacks = Same as after-hours calls per client feedback
        if (afterHoursCallKeys.size > 0) {
          callbacksByCenter[centerId] = afterHoursCallKeys.size;
          callbackCount += afterHoursCallKeys.size;
        }
      });

      // Now process leads by center for lead counts (using consistent window-based approach)
      Object.keys(leadsByCenter).forEach((centerId) => {
        const leads = leadsByCenter[centerId];
        const windowsForCenter = getDailyWindows(
          centerId,
          startDateUTC,
          adjustedEndDate
        );

        const leadsInHours = leads.filter((l) => {
          const d = new Date((l.timestampz ?? l.created_at) as string);
          return windowsForCenter.inHours.some(
            (w) => d >= w.start && d < w.end
          );
        });
        const leadsAfterHours = leads.filter((l) => {
          const d = new Date((l.timestampz ?? l.created_at) as string);
          return windowsForCenter.afterHours.some(
            (w) => d >= w.start && d < w.end
          );
        });

        totalLeadsInHoursAll += leadsInHours.length;
        totalLeadsAfterHoursAll += leadsAfterHours.length;

        if (!byCallCenter[centerId]) {
          byCallCenter[centerId] = {
            total: 0,
            inHours: 0,
            afterHours: 0,
            callbacks: 0,
            rate: 0,
          };
        }
        byCallCenter[centerId].total = leads.length;
        byCallCenter[centerId].inHours = leadsInHours.length;
        byCallCenter[centerId].afterHours = leadsAfterHours.length;
      });

      console.log(
        "After-hours call keys by center:",
        Object.keys(callKeysByCenterAfterHours).map((centerId) => ({
          centerId,
          count: callKeysByCenterAfterHours[centerId]?.size || 0,
        }))
      );

      // Build call center stats combining irev_leads and calls data (joined by cid/click_id)
      const callCenterStatsMap: { [key: string]: CallCenterStats } = {};

      // Get all unique call centers from both sources
      const allCallCenters = new Set<string>();

      // Add from calls (call_center field) normalized (underscores removed)
      calls.forEach((call) => {
        if (call.call_center)
          allCallCenters.add(String(call.call_center).replace(/_/g, ""));
      });

      // Add from irev_leads (utm_source field) normalized
      (irevLeads || []).forEach((lead) => {
        if (lead.utm_source)
          allCallCenters.add(String(lead.utm_source).replace(/_/g, ""));
      });

      // Process each call center
      allCallCenters.forEach((centerIdRaw) => {
        const centerId = centerIdRaw; // already normalized

        // Normalize only for config lookup (keep display/grouping by raw ID)
        const normalizedId = centerId.replace(/_/g, "");
        const config = callCenterHours.find(
          (cc) =>
            cc.id.replace(/_/g, "") === normalizedId ||
            cc.name.replace(/_/g, "") === normalizedId ||
            cc.id === centerId ||
            cc.name === centerId
        );

        const hasHours =
          config &&
          config.startHour !== undefined &&
          config.endHour !== undefined;

        const operatingHours = hasHours
          ? formatOperatingHours(centerId)
          : "No hours configured";

        // Total leads (all / in-hours / after-hours) using same-day windows
        // IMPORTANT: Normalize lead.utm_source for comparison (remove underscores)
        const centerLeads = (irevLeads || []).filter(
          (lead) => lead.utm_source?.replace(/_/g, "") === centerId
        );
        const totalLeadsSent = centerLeads.length;
        const windowsForCenter = getDailyWindows(
          centerId,
          startDateUTC,
          adjustedEndDate
        );
        const centerLeadsInHours = centerLeads.filter((lead) => {
          const d = new Date(lead.timestampz || lead.created_at);
          return windowsForCenter.inHours.some(
            (w) => d >= w.start && d < w.end
          );
        });
        const centerLeadsAfterHours = centerLeads.filter((lead) => {
          const d = new Date(lead.timestampz || lead.created_at);
          return windowsForCenter.afterHours.some(
            (w) => d >= w.start && d < w.end
          );
        });
        const totalLeadsSentInHours = centerLeadsInHours.length;
        const totalLeadsSentAfterHours = centerLeadsAfterHours.length;

        // NEW LOGIC per client feedback:
        // In-Hours Calls: Count ALL non-SMS calls during in-hours (not just matched to leads)
        // After-Hours Calls: Count SMS calls during next-day in-hours (already populated)
        const callKeysIn =
          callKeysByCenterInHours[centerId] || new Set<string>();
        const callKeysAfter =
          callKeysByCenterAfterHours[centerId] || new Set<string>();

        // Total Unique Calls In-Hours = size of all non-SMS call keys during in-hours
        const totalUniqueCallsInHours = callKeysIn.size;

        // Total Unique Calls After-Hours = size of SMS call keys during next-day in-hours
        const totalUniqueCallsAfterHours = callKeysAfter.size;

        // Call rate in hours (unique calls / leads sent in hours)
        // Note: Not capped at 100% - can exceed if more calls than leads (data quality issue indicator)
        const callRateInHours =
          totalLeadsSentInHours > 0
            ? (totalUniqueCallsInHours / totalLeadsSentInHours) * 100
            : 0;

        // Call rate after hours (unique calls / leads sent after hours)
        // Note: Not capped at 100% - consistent with in-hours rate calculation
        const callRateAfterHours =
          totalLeadsSentAfterHours > 0
            ? (totalUniqueCallsAfterHours / totalLeadsSentAfterHours) * 100
            : 0;

        // Total calls missed after hours
        // This is leads sent after hours minus unique calls made after hours
        const totalCallMissedAfterHours = Math.max(
          0,
          totalLeadsSentAfterHours - totalUniqueCallsAfterHours
        );

        callCenterStatsMap[centerId] = {
          callCenter: getCallCenterName(centerId),
          operatingHours,
          totalLeadsSent,
          totalLeadsSentInHours,
          totalUniqueCallsInHours,
          callRateInHours,
          totalLeadsSentAfterHours,
          totalUniqueCallsAfterHours,
          callRateAfterHours,
          totalCallMissedAfterHours,
        };
      });

      // Convert to array and sort with custom natural sorting
      const callCenterStats = Object.values(callCenterStatsMap).sort((a, b) => {
        // Extract the base name and number for proper sorting
        const extractParts = (name: string) => {
          // Remove underscores and extract letters and numbers
          const match = name.match(/^([A-Za-z_]+?)(\d+)([A-Za-z]*)$/);
          if (match) {
            return {
              prefix: match[1].replace(/_/g, ""),
              number: parseInt(match[2]),
              suffix: match[3],
            };
          }
          return { prefix: name, number: 0, suffix: "" };
        };

        const partsA = extractParts(a.callCenter);
        const partsB = extractParts(b.callCenter);

        // Compare prefix first
        if (partsA.prefix !== partsB.prefix) {
          return partsA.prefix.localeCompare(partsB.prefix);
        }

        // Then compare numbers
        if (partsA.number !== partsB.number) {
          return partsA.number - partsB.number;
        }

        // Finally compare suffix (A, B, C, etc.)
        return partsA.suffix.localeCompare(partsB.suffix);
      });

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setStats({
          totalCalls: calls.length,
          totalInHours: totalLeadsInHoursAll,
          totalAfterHours: totalLeadsAfterHoursAll,
          totalCallbacks: callbackCount,
          callbackRate:
            totalLeadsAfterHoursAll > 0
              ? (callbackCount / totalLeadsAfterHoursAll) * 100
              : 0,
          byCallCenter,
          callCenterStats,
        });
      }

      // Prepare debug summary for verification against DB
      const leadsInHoursCounts: Record<string, number> = {};
      const leadsAfterHoursCounts: Record<string, number> = {};
      Object.keys(leadsByCenter).forEach((centerId) => {
        const leads = leadsByCenter[centerId];
        leadsInHoursCounts[centerId] = leads.filter((l) => {
          const d = new Date((l.timestampz ?? l.created_at) as string);
          return !isAfterHours(d, centerId);
        }).length;
        leadsAfterHoursCounts[centerId] = leads.filter((l) => {
          const d = new Date((l.timestampz ?? l.created_at) as string);
          return isAfterHours(d, centerId);
        }).length;
      });

      const callKeysInCounts = Object.fromEntries(
        Object.entries(callKeysByCenterInHours).map(([cc, set]) => [
          cc,
          set.size,
        ])
      );
      const callKeysAfterCounts = Object.fromEntries(
        Object.entries(callKeysByCenterAfterHours).map(([cc, set]) => [
          cc,
          set.size,
        ])
      );

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setDebugData({
          dateRange: {
            start: startDate.toISOString(),
            end: adjustedEndDate.toISOString(),
          },
          leadsInHoursCounts,
          leadsAfterHoursCounts,
          callKeysInHoursCounts: callKeysInCounts,
          callKeysAfterHoursCounts: callKeysAfterCounts,
          callbacksByCenter,
        });
      }
    } catch (err: unknown) {
      console.error("Error loading stats:", err);
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Failed to load statistics"
        );
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }

  function exportData(format: "json" | "csv") {
    if (!stats) return;

    // Filter by selected call center
    const dataToExport =
      selectedCallCenter === "all"
        ? stats.callCenterStats
        : stats.callCenterStats.filter(
            (center) => center.callCenter === selectedCallCenter
          );

    if (format === "json") {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ringba-stats-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === "csv") {
      // CSV headers (match UI wording in single-line form)
      const headers = [
        "Call Center",
        "Operating Hours",
        "Total Leads Sent (All)",
        "Total Leads Sent (In-Hours)",
        "Total Unique Calls (In-Hours)",
        "Call Rate % (In-Hours)",
        "Total Leads Sent (After-Hours)",
        "Total Unique Calls (After-Hours)",
        "Call Rate % (After-Hours)",
        "Total Calls Missed (After-Hours)",
      ];

      // CSV rows
      const rows = dataToExport.map((center) => [
        center.callCenter,
        center.operatingHours,
        center.totalLeadsSent,
        center.totalLeadsSentInHours,
        center.totalUniqueCallsInHours,
        center.callRateInHours.toFixed(2),
        center.totalLeadsSentAfterHours,
        center.totalUniqueCallsAfterHours,
        center.callRateAfterHours.toFixed(2),
        center.totalCallMissedAfterHours,
      ]);

      // Helper to escape CSV cells (handles quotes and commas)
      const escapeCsvCell = (cell: string | number): string => {
        const str = String(cell);
        // If cell contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
        if (str.includes('"') || str.includes(",") || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Combine headers and rows
      const csvContent = [
        headers.map(escapeCsvCell).join(","),
        ...rows.map((row) => row.map(escapeCsvCell).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ringba-stats-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  // If not authenticated, avoid flashing the dashboard while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Redirecting to login...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Info className="w-5 h-5" />
              Error Loading Data
            </CardTitle>
            <CardDescription className="text-slate-700">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => loadStats()}
              className="w-full bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-md"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-slate-700 text-base">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full px-4 sm:px-[50px]">
        <div className="max-w-[2000px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-linear-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Ringba After-Hours Tracker
              </h1>
              <p className="text-slate-600 mt-2 text-lg">
                Track after-hours calls and callback rates across call centers
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              size="sm"
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
            >
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>

          {/* Date Range Filters & Controls */}
          <div className="flex gap-3 flex-wrap items-center">
            <DateRangePicker
              date={dateRange}
              setDate={setDateRange}
              activeFilter={activeFilter}
              setActiveFilter={(filter) => setActiveFilter(filter || "")}
            />

            <Select
              value={selectedCallCenter}
              onValueChange={setSelectedCallCenter}
            >
              <SelectTrigger className="w-[200px] bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-900 font-medium shadow-sm">
                <Filter className="mr-2 h-4 w-4 text-slate-600" />
                <SelectValue placeholder="Filter by Call Center" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-lg">
                <SelectItem value="all" className="font-medium">
                  All Call Centers
                </SelectItem>
                {stats?.callCenterStats.map((center, index) => (
                  <SelectItem
                    key={`${center.callCenter}-${index}`}
                    value={center.callCenter}
                    className="font-medium"
                  >
                    {center.callCenter.replace(/_/g, "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => exportData("json")}>
                  <FileJson className="mr-2 h-4 w-4" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData("csv")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                {debugMode && (
                  <DropdownMenuItem
                    onClick={() => {
                      if (!debugData) {
                        alert(
                          "No debug data available. Please load data first by selecting a date range."
                        );
                        return;
                      }
                      const blob = new Blob(
                        [JSON.stringify(debugData, null, 2)],
                        {
                          type: "application/json",
                        }
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `debug-${
                        new Date().toISOString().split("T")[0]
                      }.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    Export Debug JSON
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                setDateRange({
                  from: sevenDaysAgo,
                  to: today,
                });
                setSelectedCallCenter("all");
                setActiveFilter("last7Days");
              }}
              variant="outline"
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <X className="mr-2 w-4 h-4" />
              Clear Filters
            </Button>

            <Button
              onClick={() => loadStats()}
              className="ml-auto bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-linear-to-br from-white to-cyan-50 border-cyan-200 hover:border-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-200/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  Total Calls
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        All calls received in the selected date range, including
                        both in-hours and after-hours calls.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <PhoneCall className="h-5 w-5 text-cyan-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.totalCalls || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  All calls in selected period
                </p>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-white to-emerald-50 border-emerald-200 hover:border-emerald-400 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-200/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  In-Hours Leads
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Calls received during each call center&apos;s configured
                        operating hours and days of the week.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.totalInHours || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Calls during business hours
                </p>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-white to-purple-50 border-purple-200 hover:border-purple-400 transition-all duration-300 hover:shadow-lg hover:shadow-purple-200/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  After-Hours Leads
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Calls received outside each call center&apos;s
                        configured operating hours or on non-operating days.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PhoneCall className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.totalAfterHours || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Calls received outside business hours
                </p>
              </CardContent>
            </Card>

            {/* Callbacks card removed per requirement: after-hours and recovery are the same */}
          </div>

          {/* Table Section */}
          <Card className="bg-linear-to-br from-white to-slate-50 border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-slate-900">
                Stats by Call Center
              </CardTitle>
              <CardDescription className="text-slate-600">
                Comprehensive breakdown of leads and calls performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && stats.callCenterStats.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-slate-50">
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[200px] px-6">
                          <div className="flex items-center justify-center gap-2">
                            Call Center
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Name of the call center handling the leads and
                                  calls
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[220px] px-6">
                          <div className="flex items-center justify-center gap-2">
                            Operating Hours
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Business hours when the call center is
                                  actively staffed and taking calls. After-hours
                                  is defined as from close to next-day open
                                  (e.g., 8pm → 9am local time).
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[200px] px-6">
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span>Total Leads Sent</span>
                            <span className="text-xs text-slate-500">
                              (All)
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Total number of leads sent to this call center
                                  (both during and after hours)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[220px] px-6">
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span>Total Leads Sent</span>
                            <span className="text-xs text-slate-500">
                              (In-Hours)
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Number of leads sent during business operating
                                  hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[220px] px-6">
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span>Total Unique Calls</span>
                            <span className="text-xs text-slate-500">
                              (In-Hours)
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Number of unique phone numbers that called
                                  during business hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[220px] px-6">
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span>Call Rate %</span>
                            <span className="text-xs text-slate-500">
                              (In-Hours)
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Percentage of leads that resulted in actual
                                  calls during business hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-60 px-6">
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span>Total Leads Sent</span>
                            <span className="text-xs text-slate-500">
                              (After-Hours)
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Number of leads sent outside of business
                                  operating hours (close → next open)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-60 px-6">
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span>Total Unique Calls</span>
                            <span className="text-xs text-slate-500">
                              (After-Hours)
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Number of unique phone numbers that called
                                  after business hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-60 px-6">
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span>Call Rate %</span>
                            <span className="text-xs text-slate-500">
                              (After-Hours)
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Percentage of after-hours leads that resulted
                                  in actual calls
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-60 px-6">
                          <div className="flex flex-col items-center justify-center gap-0 leading-tight">
                            <span>Total Calls Missed</span>
                            <span className="text-xs text-slate-500">
                              (After-Hours)
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Number of calls that were not answered because
                                  they came in after hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.callCenterStats
                        .filter(
                          (center) =>
                            selectedCallCenter === "all" ||
                            center.callCenter === selectedCallCenter
                        )
                        .map((centerStat, index) => {
                          return (
                            <TableRow
                              key={`${centerStat.callCenter}-${index}`}
                              className="border-slate-200 hover:bg-slate-50"
                            >
                              <TableCell className="text-center font-medium text-slate-900 px-6">
                                {centerStat.callCenter.replace(/_/g, "")}
                              </TableCell>
                              <TableCell className="text-center text-sm text-slate-600 px-6">
                                {centerStat.operatingHours}
                              </TableCell>
                              <TableCell className="text-center text-cyan-600 font-semibold px-6">
                                {centerStat.totalLeadsSent}
                              </TableCell>
                              <TableCell className="text-center text-emerald-600 font-semibold px-6">
                                {centerStat.totalLeadsSentInHours}
                              </TableCell>
                              <TableCell className="text-center text-blue-600 font-semibold px-6">
                                {centerStat.totalUniqueCallsInHours}
                              </TableCell>
                              <TableCell className="text-center px-6">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    centerStat.totalLeadsSentInHours === 0 &&
                                    centerStat.totalUniqueCallsInHours > 0
                                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                                      : centerStat.callRateInHours >= 50
                                      ? "bg-green-100 text-green-700 border border-green-300"
                                      : centerStat.callRateInHours >= 25
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                      : "bg-red-100 text-red-700 border border-red-300"
                                  }`}
                                >
                                  {centerStat.totalLeadsSentInHours === 0 &&
                                  centerStat.totalUniqueCallsInHours > 0
                                    ? "N/A (no leads)"
                                    : `${centerStat.callRateInHours.toFixed(
                                        1
                                      )}%`}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-purple-600 font-semibold px-6">
                                {centerStat.totalLeadsSentAfterHours}
                              </TableCell>
                              <TableCell className="text-center text-indigo-600 font-semibold px-6">
                                {centerStat.totalUniqueCallsAfterHours}
                              </TableCell>
                              <TableCell className="text-center px-6">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    centerStat.totalLeadsSentAfterHours === 0 &&
                                    centerStat.totalUniqueCallsAfterHours > 0
                                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                                      : centerStat.callRateAfterHours >= 50
                                      ? "bg-green-100 text-green-700 border border-green-300"
                                      : centerStat.callRateAfterHours >= 25
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                      : "bg-red-100 text-red-700 border border-red-300"
                                  }`}
                                >
                                  {centerStat.totalLeadsSentAfterHours === 0 &&
                                  centerStat.totalUniqueCallsAfterHours > 0
                                    ? "N/A (no leads)"
                                    : `${centerStat.callRateAfterHours.toFixed(
                                        1
                                      )}%`}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-red-600 font-semibold px-6">
                                {centerStat.totalCallMissedAfterHours}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <PhoneCall className="mx-auto h-12 w-12 mb-4 opacity-30" />
                  <p>No data found in the selected date range</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
