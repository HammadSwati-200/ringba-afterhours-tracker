"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import {
  isAfterHours,
  formatOperatingHours,
  getCallCenterName,
  callCenterHours,
} from "@/lib/call-center-hours";

// DID to Call Center mapping with operating hours
const DID_TO_CALL_CENTER: { [key: string]: { cc: string; hasHours: boolean } } =
  {
    "18334411529": { cc: "CC1", hasHours: true },
    "18334362190": { cc: "CC2", hasHours: true },
    "18334310623": { cc: "CC3", hasHours: false },
    "18334410032": { cc: "CC4", hasHours: false },
    "18334310301": { cc: "CC5", hasHours: false },
    "18334320783": { cc: "CC6", hasHours: false },
    "18334370501": { cc: "CC7", hasHours: true },
    "18334411630": { cc: "CC8", hasHours: false },
    "18334412492": { cc: "CC9", hasHours: true },
    "18334412564": { cc: "CC10", hasHours: true },
    "18334411593": { cc: "CC12", hasHours: true },
    "18334411506": { cc: "CC13", hasHours: true },
    "18334412568": { cc: "CC_14", hasHours: true },
    "18334362221": { cc: "CC14B", hasHours: true },
    "18334950158": { cc: "CC14C", hasHours: true },
    "18557020153": { cc: "CC14D", hasHours: true },
    "18339913927": { cc: "CC14E", hasHours: true },
    "18334410027": { cc: "CC15", hasHours: true },
    "18334412573": { cc: "CC16", hasHours: true },
    "18334300436": { cc: "CC17", hasHours: true },
    "18339951463": { cc: "CC19", hasHours: true },
    "18339923833": { cc: "CC20", hasHours: true },
    "18339923731": { cc: "CC21", hasHours: true },
    "18337018811": { cc: "CC22", hasHours: true },
    "18337731567": { cc: "CC23A", hasHours: true },
    "18338360164": { cc: "CC23B", hasHours: true },
    "18339403006": { cc: "CC24", hasHours: true },
    "18337564307": { cc: "CC25", hasHours: true },
  };
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
  TrendingUp,
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

  // Sync filters with URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const callCenter = params.get("callCenter");
    const filter = params.get("filter");

    if (startDate && endDate) {
      const from = new Date(startDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(endDate);
      to.setHours(0, 0, 0, 0);
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
  }, []);

  // Update URL when filters change (only if not default)
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const defaultStart = new Date(today);
      defaultStart.setDate(today.getDate() - 7);
      defaultStart.setHours(0, 0, 0, 0);
      const defaultEnd = new Date(today);

      const isDefaultDateRange =
        dateRange.from.toISOString().split("T")[0] ===
          defaultStart.toISOString().split("T")[0] &&
        dateRange.to.toISOString().split("T")[0] ===
          defaultEnd.toISOString().split("T")[0];

      const isDefaultCallCenter = selectedCallCenter === "all";
      const isDefaultFilter = activeFilter === "last7Days";

      if (!isDefaultDateRange || !isDefaultCallCenter || !isDefaultFilter) {
        const params = new URLSearchParams();
        params.set("startDate", dateRange.from.toISOString().split("T")[0]);
        params.set("endDate", dateRange.to.toISOString().split("T")[0]);
        if (!isDefaultCallCenter) {
          params.set("callCenter", selectedCallCenter);
        }
        if (activeFilter) {
          params.set("filter", activeFilter);
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);
      } else {
        // Clear params if back to default
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [dateRange, selectedCallCenter, activeFilter]);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedCallCenter]);

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

      // Adjust end date to include the entire day (set to 23:59:59)
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);

      console.log(
        "Date Range:",
        startDate.toISOString(),
        "to",
        adjustedEndDate.toISOString()
      );
      console.log("Current Date:", new Date().toISOString());
      console.log("Fetching data from:", startDate.toISOString());

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
          .gte("created_at", startDate.toISOString())
          .lte("created_at", adjustedEndDate.toISOString())
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fetchError) {
          console.error("Supabase error:", fetchError);
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (callsPage && callsPage.length > 0) {
          allCalls = [...allCalls, ...callsPage];
          hasMore = callsPage.length === pageSize;
          page++;
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
          .gte("timestampz", startDate.toISOString())
          .lte("timestampz", adjustedEndDate.toISOString())
          .order("timestampz", { ascending: false })
          .range(irevPage * pageSize, (irevPage + 1) * pageSize - 1);

        if (irevError) {
          console.error("Supabase irev error:", irevError);
          throw new Error(`Database error: ${irevError.message}`);
        }

        if (irevLeadsPage && irevLeadsPage.length > 0) {
          allIrevLeads = [...allIrevLeads, ...irevLeadsPage];
          hasMoreIrev = irevLeadsPage.length === pageSize;
          irevPage++;
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

      // Separate calls into in-hours and after-hours using both CC_Number and publisher_name
      // Logic:
      // 1. If publisher_name includes "SMS" -> After Hours (always)
      // 2. If CC_Number matches any DID in our list -> After Hours (DID calls are after hours)
      // 3. Otherwise -> In Hours
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isInHoursCall = (call: any): boolean => {
        // SMS calls are always after hours
        if (call.publisher_name?.includes("SMS")) {
          return false;
        }

        // Extract phone number from CC_Number (remove +1 prefix if exists)
        const ccNumber = call.CC_Number?.replace(/^\+1/, "");
        if (!ccNumber) {
          // No CC_Number, check publisher_name - if no SMS, it's in hours
          return !call.publisher_name?.includes("SMS");
        }

        // Check if this CC_Number matches any DID in our mapping
        const didInfo = DID_TO_CALL_CENTER[ccNumber];
        if (didInfo) {
          // CC_Number matches a DID in our list -> After Hours (DID = after hours)
          return false;
        }

        // CC_Number doesn't match any DID and no SMS -> In Hours
        return true;
      };

      const inHoursCalls = calls.filter(isInHoursCall);
      const afterHoursCalls = calls.filter((call) => !isInHoursCall(call));
      console.log("Total calls:", calls.length);
      console.log("In-hours calls:", inHoursCalls.length);
      console.log("After-hours calls:", afterHoursCalls.length);

      let callbackCount = 0;
      const callbacksByCenter: { [key: string]: number } = {};

      afterHoursCalls.forEach((afterHoursCall) => {
        const afterHoursDate = new Date(
          afterHoursCall.created_at || afterHoursCall.call_date
        );
        const maxCallbackDate = new Date(afterHoursDate);
        maxCallbackDate.setHours(maxCallbackDate.getHours() + 48);

        const hasCallback = calls.some((call) => {
          const callDate = new Date(call.created_at || call.call_date);
          return (
            call.caller_phone === afterHoursCall.caller_phone &&
            callDate > afterHoursDate &&
            callDate <= maxCallbackDate &&
            isInHoursCall(call) && // In-hours callback using new logic
            call.call_center === afterHoursCall.call_center
          );
        });

        if (hasCallback) {
          callbackCount++;
          const centerId = afterHoursCall.call_center;
          callbacksByCenter[centerId] = (callbacksByCenter[centerId] || 0) + 1;
        }
      });

      const byCallCenter: {
        [key: string]: {
          total: number;
          inHours: number;
          afterHours: number;
          callbacks: number;
          rate: number;
        };
      } = {};

      // Count all calls by center
      calls.forEach((call) => {
        const centerId = call.call_center;
        if (!byCallCenter[centerId]) {
          byCallCenter[centerId] = {
            total: 0,
            inHours: 0,
            afterHours: 0,
            callbacks: 0,
            rate: 0,
          };
        }
        byCallCenter[centerId].total++;

        // Use publisher_name to determine in-hours vs after-hours
        if (!call.publisher_name?.includes("SMS")) {
          byCallCenter[centerId].inHours++;
        } else {
          byCallCenter[centerId].afterHours++;
        }
      });

      Object.keys(callbacksByCenter).forEach((centerId) => {
        if (byCallCenter[centerId]) {
          byCallCenter[centerId].callbacks = callbacksByCenter[centerId];
          byCallCenter[centerId].rate =
            (callbacksByCenter[centerId] / byCallCenter[centerId].afterHours) *
            100;
        }
      });

      // Build call center stats combining irev_leads and calls data
      const callCenterStatsMap: { [key: string]: CallCenterStats } = {};

      // Get all unique call centers from both sources
      const allCallCenters = new Set<string>();

      // Add from calls (call_center field)
      calls.forEach((call) => {
        if (call.call_center) allCallCenters.add(call.call_center);
      });

      // Add from irev_leads (utm_source field)
      (irevLeads || []).forEach((lead) => {
        if (lead.utm_source) allCallCenters.add(lead.utm_source);
      });

      // Process each call center
      allCallCenters.forEach((centerIdRaw) => {
        const centerId = centerIdRaw;

        // Find exact config match - no normalization to avoid CC_14 matching CC14A
        const config = callCenterHours.find(
          (cc) => cc.id === centerId || cc.name === centerId
        );

        const hasHours =
          config &&
          config.startHour !== undefined &&
          config.endHour !== undefined;

        const operatingHours = hasHours
          ? formatOperatingHours(centerId)
          : "No hours configured";

        // Total leads sent from irev_leads (by utm_source)
        const totalLeadsSent = (irevLeads || []).filter(
          (lead) => lead.utm_source === centerId
        ).length;

        // Total leads sent in hours (irev_leads during operating hours based on timestamp)
        const totalLeadsSentInHours = (irevLeads || []).filter((lead) => {
          if (lead.utm_source !== centerId) return false;
          const leadDate = new Date(lead.timestampz || lead.created_at);
          return !isAfterHours(leadDate, centerId);
        }).length;

        // Total leads sent after hours (irev_leads outside operating hours based on timestamp)
        const totalLeadsSentAfterHours = (irevLeads || []).filter((lead) => {
          if (lead.utm_source !== centerId) return false;
          const leadDate = new Date(lead.timestampz || lead.created_at);
          return isAfterHours(leadDate, centerId);
        }).length;

        // Get all calls for this center
        const centerCalls = calls.filter(
          (call) => call.call_center === centerId
        );

        // Total unique calls in hours (Ringba calls without "SMS" in publisher_name, unique by phone)
        const callsInHours = centerCalls.filter((call) => {
          return !call.publisher_name?.includes("SMS");
        });
        const uniquePhoneNumbersInHours = new Set(
          callsInHours.map((call) => call.caller_phone)
        );
        const totalUniqueCallsInHours = uniquePhoneNumbersInHours.size;

        // Total unique calls after hours (Ringba calls with "SMS" in publisher_name, unique by phone)
        const callsAfterHours = centerCalls.filter((call) => {
          return call.publisher_name?.includes("SMS");
        });
        const uniquePhoneNumbersAfterHours = new Set(
          callsAfterHours.map((call) => call.caller_phone)
        );
        const totalUniqueCallsAfterHours = uniquePhoneNumbersAfterHours.size;

        // Call rate in hours (unique calls / leads sent in hours)
        const callRateInHours =
          totalLeadsSentInHours > 0
            ? (totalUniqueCallsInHours / totalLeadsSentInHours) * 100
            : 0;

        // Call rate after hours (unique calls / leads sent after hours)
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

      setStats({
        totalCalls: calls.length,
        totalInHours: inHoursCalls.length,
        totalAfterHours: afterHoursCalls.length,
        totalCallbacks: callbackCount,
        callbackRate:
          afterHoursCalls.length > 0
            ? (callbackCount / afterHoursCalls.length) * 100
            : 0,
        byCallCenter,
        callCenterStats,
      });
    } catch (err: unknown) {
      console.error("Error loading stats:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load statistics"
      );
    } finally {
      setLoading(false);
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
      // CSV headers
      const headers = [
        "Call Center",
        "Operating Hours",
        "Total Leads Sent",
        "Leads Sent (In Hours)",
        "Unique Calls (In Hours)",
        "Call Rate % (In Hours)",
        "Leads Sent (After Hours)",
        "Unique Calls (After Hours)",
        "Call Rate % (After Hours)",
        "Calls Missed After Hours",
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

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
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
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-md"
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
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
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
                    {center.callCenter}
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
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-white to-cyan-50 border-cyan-200 hover:border-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-200/50 shadow-md">
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

            <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-200 hover:border-emerald-400 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-200/50 shadow-md">
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

            <Card className="bg-gradient-to-br from-white to-purple-50 border-purple-200 hover:border-purple-400 transition-all duration-300 hover:shadow-lg hover:shadow-purple-200/50 shadow-md">
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

            <Card className="bg-gradient-to-br from-white to-orange-50 border-orange-200 hover:border-orange-400 transition-all duration-300 hover:shadow-lg hover:shadow-orange-200/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  Callbacks
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Calls from the same phone number within 48 hours during
                        business hours after an initial after-hours call. Rate
                        shows the percentage of after-hours leads that
                        successfully called back.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.totalCallbacks || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats?.totalAfterHours
                    ? `${stats.callbackRate.toFixed(1)}% callback rate`
                    : "No after-hours calls yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table Section */}
          <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-300">
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
                                  actively staffed and taking calls
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[200px] px-6">
                          <div className="flex items-center justify-center gap-2">
                            Total Leads Sent
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
                          <div className="flex items-center justify-center gap-2">
                            Leads Sent (In Hours)
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
                          <div className="flex items-center justify-center gap-2">
                            Unique Calls (In Hours)
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
                          <div className="flex items-center justify-center gap-2">
                            Call Rate % (In Hours)
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
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[240px] px-6">
                          <div className="flex items-center justify-center gap-2">
                            Leads Sent (After Hours)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Number of leads sent outside of business
                                  operating hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[240px] px-6">
                          <div className="flex items-center justify-center gap-2">
                            Unique Calls (After Hours)
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
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[240px] px-6">
                          <div className="flex items-center justify-center gap-2">
                            Call Rate % (After Hours)
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
                        <TableHead className="text-center text-slate-700 font-semibold min-w-[240px] px-6">
                          <div className="flex items-center justify-center gap-2">
                            Calls Missed After Hours
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
                                {centerStat.callCenter}
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
                                    centerStat.callRateInHours >= 50
                                      ? "bg-green-100 text-green-700 border border-green-300"
                                      : centerStat.callRateInHours >= 25
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                      : "bg-red-100 text-red-700 border border-red-300"
                                  }`}
                                >
                                  {centerStat.callRateInHours.toFixed(1)}%
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
                                    centerStat.callRateAfterHours >= 50
                                      ? "bg-green-100 text-green-700 border border-green-300"
                                      : centerStat.callRateAfterHours >= 25
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                      : "bg-red-100 text-red-700 border border-red-300"
                                  }`}
                                >
                                  {centerStat.callRateAfterHours.toFixed(1)}%
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
