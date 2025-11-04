"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import {
  isAfterHours,
  formatOperatingHours,
  getCallCenterName,
  callCenterHours,
} from "@/lib/call-center-hours";
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
  RefreshCw,
  TrendingUp,
  PhoneCall,
  Phone,
  LogOut,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  const [dateRange, setDateRange] = useState(7); // Default to Last 7 Days for recent calls
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function loadStats() {
    setLoading(true);
    setError(null);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      console.log("Date Range:", dateRange, "days");
      console.log("Current Date:", new Date().toISOString());
      console.log("Fetching data from:", startDate.toISOString());

      // Fetch calls from Ringba
      const { data: calls, error: fetchError } = await supabase
        .from("calls")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Supabase error:", fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // Fetch irev leads data
      const { data: irevLeads, error: irevError } = await supabase
        .from("irev_leads")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (irevError) {
        console.error("Supabase irev error:", irevError);
        throw new Error(`Database error: ${irevError.message}`);
      }

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

      // Separate calls into in-hours and after-hours
      // Use created_at since call_date may have wrong timestamps from Ringba
      const afterHoursCalls = calls.filter((call) => {
        const callDate = new Date(call.created_at || call.call_date);
        return isAfterHours(callDate, call.call_center);
      });

      const inHoursCalls = calls.filter((call) => {
        const callDate = new Date(call.created_at || call.call_date);
        return !isAfterHours(callDate, call.call_center);
      });

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
            !isAfterHours(callDate, call.call_center) &&
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

        const callDate = new Date(call.call_date);
        if (isAfterHours(callDate, centerId)) {
          byCallCenter[centerId].afterHours++;
        } else {
          byCallCenter[centerId].inHours++;
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

        // Normalize ID for config lookup
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

        // Total leads sent from irev_leads (by utm_source)
        const totalLeadsSent = (irevLeads || []).filter(
          (lead) => lead.utm_source === centerId
        ).length;

        // Total leads sent in hours (irev_leads during operating hours)
        const totalLeadsSentInHours = (irevLeads || []).filter((lead) => {
          if (lead.utm_source !== centerId) return false;
          const leadDate = new Date(lead.timestampz || lead.created_at);
          return !isAfterHours(leadDate, centerId);
        }).length;

        // Total leads sent after hours (irev_leads outside operating hours)
        const totalLeadsSentAfterHours = (irevLeads || []).filter((lead) => {
          if (lead.utm_source !== centerId) return false;
          const leadDate = new Date(lead.timestampz || lead.created_at);
          return isAfterHours(leadDate, centerId);
        }).length;

        // Get all calls for this center
        const centerCalls = calls.filter(
          (call) => call.call_center === centerId
        );

        // Total unique calls in hours (Ringba calls during operating hours, unique by phone)
        const callsInHours = centerCalls.filter((call) => {
          const callDate = new Date(call.created_at || call.call_date);
          return !isAfterHours(callDate, centerId);
        });
        const uniquePhoneNumbersInHours = new Set(
          callsInHours.map((call) => call.caller_phone)
        );
        const totalUniqueCallsInHours = uniquePhoneNumbersInHours.size;

        // Total unique calls after hours (Ringba calls outside operating hours, unique by phone)
        const callsAfterHours = centerCalls.filter((call) => {
          const callDate = new Date(call.created_at || call.call_date);
          return isAfterHours(callDate, centerId);
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

      // Convert to array and sort by total leads sent
      const callCenterStats = Object.values(callCenterStatsMap).sort(
        (a, b) => b.totalLeadsSent - a.totalLeadsSent
      );

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
          <RefreshCw className="w-12 h-12 animate-spin text-purple-600" />
          <p className="text-xl text-slate-700 font-medium">
            Loading statistics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
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

        {/* Date Range Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={dateRange === 7 ? "default" : "outline"}
            onClick={() => setDateRange(7)}
            className={
              dateRange === 7
                ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-md"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
            }
          >
            Last 7 Days
          </Button>
          <Button
            variant={dateRange === 30 ? "default" : "outline"}
            onClick={() => setDateRange(30)}
            className={
              dateRange === 30
                ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-md"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
            }
          >
            Last 30 Days
          </Button>
          <Button
            variant={dateRange === 90 ? "default" : "outline"}
            onClick={() => setDateRange(90)}
            className={
              dateRange === 90
                ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-md"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
            }
          >
            Last 90 Days
          </Button>
          <Button
            variant={dateRange === 365 ? "default" : "outline"}
            onClick={() => setDateRange(365)}
            className={
              dateRange === 365
                ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-md"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
            }
          >
            Last Year
          </Button>
          <Button
            variant={dateRange === 9999 ? "default" : "outline"}
            onClick={() => setDateRange(9999)}
            className={
              dateRange === 9999
                ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-md"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
            }
          >
            All Time
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
                      Calls received outside each call center&apos;s configured
                      operating hours or on non-operating days.
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-slate-50">
                      <TableHead className="text-slate-700 font-semibold">
                        Call Center
                      </TableHead>
                      <TableHead className="text-slate-700 font-semibold">
                        Operating Hours
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Total Leads Sent
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Leads Sent (In Hours)
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Unique Calls (In Hours)
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Call Rate % (In Hours)
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Leads Sent (After Hours)
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Unique Calls (After Hours)
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Call Rate % (After Hours)
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Calls Missed After Hours
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.callCenterStats.map((centerStat) => {
                      return (
                        <TableRow
                          key={centerStat.callCenter}
                          className="border-slate-200 hover:bg-slate-50"
                        >
                          <TableCell className="font-medium text-slate-900">
                            {centerStat.callCenter}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {centerStat.operatingHours}
                          </TableCell>
                          <TableCell className="text-right text-cyan-600 font-semibold">
                            {centerStat.totalLeadsSent}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">
                            {centerStat.totalLeadsSentInHours}
                          </TableCell>
                          <TableCell className="text-right text-blue-600 font-semibold">
                            {centerStat.totalUniqueCallsInHours}
                          </TableCell>
                          <TableCell className="text-right">
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
                          <TableCell className="text-right text-purple-600 font-semibold">
                            {centerStat.totalLeadsSentAfterHours}
                          </TableCell>
                          <TableCell className="text-right text-indigo-600 font-semibold">
                            {centerStat.totalUniqueCallsAfterHours}
                          </TableCell>
                          <TableCell className="text-right">
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
                          <TableCell className="text-right text-red-600 font-semibold">
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
    </TooltipProvider>
  );
}
