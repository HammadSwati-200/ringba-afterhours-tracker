"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Download,
  PhoneCall,
  Clock,
  TrendingUp,
  Info,
  LogOut,
  AlertCircle,
  FileText,
  Database,
} from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { useCallCenterMetrics } from "@/lib/hooks/useCallCenterMetrics";
import { useDateRange } from "@/lib/hooks/useDateRange";
import { exportAsJSON, exportAsCSV } from "@/lib/services/export.service";
import { formatPercentage, formatNumber } from "@/lib/utils/calculations";
import { callCenterHours } from "@/lib/call-center-hours";
import { createClient } from "@/lib/supabase-client";

export function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const { metrics, loading, error, fetchMetrics } = useCallCenterMetrics();
  const { dateRange, updateDateRange } = useDateRange();

  // ALL useState hooks must be declared at the top, before any conditional returns
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCallCenter, setSelectedCallCenter] = useState<string>(
    searchParams.get("callCenter") || "all"
  );
  const [selectedFilter, setSelectedFilter] = useState<string>(
    searchParams.get("filter") || "all"
  );

  // Auth check - redirect to login if not authenticated
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          router.push("/login");
          return;
        }

        setIsAuthenticated(true);
        setAuthChecking(false);

        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (!session) {
              setIsAuthenticated(false);
              router.push("/login");
            } else {
              setIsAuthenticated(true);
              setAuthChecking(false);
            }
          }
        );
        unsub = () => listener.subscription.unsubscribe();
      } catch (err) {
        console.error("Auth check error:", err);
        router.push("/login");
      }
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [router, supabase.auth]);

  // Fetch data on mount and when date range changes
  useEffect(() => {
    fetchMetrics(dateRange);
  }, [dateRange, fetchMetrics]);

  // Update URL parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedCallCenter !== "all") {
      params.set("callCenter", selectedCallCenter);
    }

    if (selectedFilter !== "all") {
      params.set("filter", selectedFilter);
    }

    if (dateRange.start && dateRange.end) {
      const formatDate = (date: Date) => date.toISOString().split("T")[0];
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 7);

      // Only add dates if they're not the default
      if (
        formatDate(dateRange.start) !== formatDate(defaultStart) ||
        formatDate(dateRange.end) !== formatDate(new Date())
      ) {
        params.set("startDate", formatDate(dateRange.start));
        params.set("endDate", formatDate(dateRange.end));
      }
    }

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [selectedCallCenter, selectedFilter, dateRange, router]);

  // Filter metrics based on selected call center and lead type
  const filteredMetrics = useMemo(() => {
    if (!metrics) return null;

    let filtered = metrics.byCallCenter;

    // Filter by call center
    if (selectedCallCenter !== "all") {
      filtered = filtered.filter((cc) => cc.callCenter === selectedCallCenter);
    }

    // Filter by lead type (in-hours / after-hours)
    if (selectedFilter !== "all") {
      filtered = filtered.map((cc) => {
        if (selectedFilter === "in-hours") {
          // Show only in-hours data, zero out after-hours
          return {
            ...cc,
            totalLeadsSent: cc.inHours.totalLeads,
            afterHours: {
              totalLeads: 0,
              totalCalls: 0,
              callbacks: 0,
              callbackRate: 0,
            },
            totalCallsMissedAfterHours: 0,
          };
        } else if (selectedFilter === "after-hours") {
          // Show only after-hours data, zero out in-hours
          return {
            ...cc,
            totalLeadsSent: cc.afterHours.totalLeads,
            inHours: {
              totalLeads: 0,
              totalCalls: 0,
              uniqueCalls: 0,
              callRate: 0,
            },
          };
        }
        return cc;
      });
    }

    return {
      ...metrics,
      byCallCenter: filtered,
      totalInHoursLeads: filtered.reduce(
        (sum, cc) => sum + cc.inHours.totalLeads,
        0
      ),
      totalAfterHoursLeads: filtered.reduce(
        (sum, cc) => sum + cc.afterHours.totalLeads,
        0
      ),
      totalCallbacks: filtered.reduce(
        (sum, cc) => sum + cc.afterHours.callbacks,
        0
      ),
      overallCallbackRate:
        filtered.reduce((sum, cc) => sum + cc.afterHours.totalLeads, 0) > 0
          ? (filtered.reduce((sum, cc) => sum + cc.afterHours.callbacks, 0) /
              filtered.reduce((sum, cc) => sum + cc.afterHours.totalLeads, 0)) *
            100
          : 0,
    };
  }, [metrics, selectedCallCenter, selectedFilter]);

  // Get unique call centers for dropdown
  const callCenters = useMemo(() => {
    return callCenterHours.map((cc) => ({
      id: cc.id.replace(/_/g, ""),
      name: cc.name.replace(/_/g, ""),
    }));
  }, []);

  const handleDateRangeChange = useCallback(
    (start: Date | null, end: Date | null) => {
      if (start && end) {
        updateDateRange(start, end);
      }
    },
    [updateDateRange]
  );

  const handleRefresh = useCallback(() => {
    fetchMetrics(dateRange);
  }, [dateRange, fetchMetrics]);

  const handleExport = useCallback(
    (format: "json" | "csv") => {
      if (!filteredMetrics) return;

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `ringba-metrics-${timestamp}`;

      if (format === "json") {
        exportAsJSON(filteredMetrics, `${filename}.json`);
      } else {
        exportAsCSV(filteredMetrics, `${filename}.csv`);
      }
    },
    [filteredMetrics]
  );

  const handleLogout = useCallback(async () => {
    try {
      // Sign out with scope: global to clear session everywhere
      const { error } = await supabase.auth.signOut({ scope: "global" });

      // Ignore expected session errors (session already expired/missing)
      if (
        error &&
        !error.message.includes("session_not_found") &&
        !error.message.includes("Auth session missing")
      ) {
        console.error("Logout error:", error);
      }
    } catch (error: unknown) {
      // Ignore AuthSessionMissingError - this is expected when session is already gone
      if (error instanceof Error) {
        if (
          error.name !== "AuthSessionMissingError" &&
          !error.message?.includes("Auth session missing")
        ) {
          console.error("Logout error:", error);
        }
      } else {
        console.error("Logout error:", error);
      }
    } finally {
      // Always redirect to login regardless of signOut result
      router.push("/login");
      router.refresh(); // Force a full page refresh to clear any cached state
    }
  }, [supabase.auth, router]);

  const handleClearFilters = useCallback(() => {
    setSelectedCallCenter("all");
    setSelectedFilter("all");
    // Reset to default date range (last 7 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    updateDateRange(start, end);
  }, [updateDateRange]);

  // Stats for display
  const stats = useMemo(() => {
    if (!filteredMetrics) {
      return {
        totalCalls: 0,
        inHoursLeads: 0,
        afterHoursLeads: 0,
      };
    }

    return {
      totalCalls:
        filteredMetrics.totalInHoursLeads +
        filteredMetrics.totalAfterHoursLeads,
      inHoursLeads: filteredMetrics.totalInHoursLeads,
      afterHoursLeads: filteredMetrics.totalAfterHoursLeads,
    };
  }, [filteredMetrics]);

  // Show loading while checking auth
  if (authChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <div className="max-w-[2000px] mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
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
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push("/irev-leads")}
                variant="outline"
                className="flex items-center gap-2 border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                <FileText className="w-4 h-4" />
                iRev Leads
              </Button>
              <Button
                onClick={() => router.push("/ringba-calls")}
                variant="outline"
                className="flex items-center gap-2 border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                <Database className="w-4 h-4" />
                Ringba Calls
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2 border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900">
                      Error loading data
                    </h3>
                    <p className="text-red-700 text-sm mt-1">{error.message}</p>
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      size="sm"
                      className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters and Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap flex-1">
              <DateRangePicker
                onDateRangeChange={handleDateRangeChange}
                className="w-full sm:w-auto"
              />

              <Select
                value={selectedCallCenter}
                onValueChange={setSelectedCallCenter}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-white border-slate-300">
                  <SelectValue placeholder="All Call Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Call Centers</SelectItem>
                  {callCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.name}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-300">
                  <SelectValue placeholder="All Leads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <SelectItem value="in-hours">In-Hours Only</SelectItem>
                  <SelectItem value="after-hours">After-Hours Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                Clear Filters
              </Button>

              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={loading}
                className="flex-1 sm:flex-none text-slate-700"
              >
                <RefreshCw
                  className={`mr-2 w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none text-slate-700"
                    disabled={!filteredMetrics}
                  >
                    <Download className="mr-2 w-4 h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("json")}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-white to-cyan-50 border-cyan-200 hover:border-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-200/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  Total Leads
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total number of leads in the selected date range</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <PhoneCall className="w-5 h-5 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-cyan-700">
                  {formatNumber(stats.totalCalls)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-emerald-50 border-emerald-200 hover:border-emerald-400 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-200/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  In-Hours Leads
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Leads generated during business hours</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <Clock className="w-5 h-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-700">
                  {formatNumber(stats.inHoursLeads)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-purple-50 border-purple-200 hover:border-purple-400 transition-all duration-300 hover:shadow-lg hover:shadow-purple-200/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  After-Hours Leads
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Leads generated outside business hours</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-700">
                  {formatNumber(stats.afterHoursLeads)}
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
                Detailed breakdown of calls and callback rates per call center
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
                  <p className="text-slate-500 text-lg mt-4">Loading data...</p>
                </div>
              ) : !filteredMetrics ||
                filteredMetrics.byCallCenter.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-lg">
                    No data available for the selected date range.
                  </p>
                  <p className="text-slate-400 text-sm mt-2">
                    Try adjusting your filters or date range.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-100">
                        <TableHead className="font-semibold text-slate-700 text-center">
                          Call Center
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          Operating Hours
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Lead Sent</div>
                              <div className="text-xs font-normal text-slate-500">
                                (from iRev)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Total number of leads sent from iRev platform
                                  for this call center
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Calls</div>
                              <div className="text-xs font-normal text-slate-500">
                                (from Ringba)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Total number of calls recorded in Ringba for
                                  this call center
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Leads Sent</div>
                              <div className="text-xs font-normal text-slate-500">
                                (In-Hours)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Number of leads sent during business hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Calls</div>
                              <div className="text-xs font-normal text-slate-500">
                                (In-Hours from Ringba)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Total count of non-SMS calls received during
                                  business hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Unique Call</div>
                              <div className="text-xs font-normal text-slate-500">
                                (In-Hours)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Number of in-hours leads that received at
                                  least one in-hours call
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Call Rate %</div>
                              <div className="text-xs font-normal text-slate-500">
                                (In-Hours)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Percentage of in-hours leads that received
                                  calls (Unique Calls / Total Leads × 100)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Leads Sent</div>
                              <div className="text-xs font-normal text-slate-500">
                                (After-Hours)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Number of leads sent outside business hours
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Calls</div>
                              <div className="text-xs font-normal text-slate-500">
                                (After-Hours from Ringba)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Total count of SMS/callback calls during
                                  business hours (after-hours recovery)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Unique Call</div>
                              <div className="text-xs font-normal text-slate-500">
                                (After Hour Recovery)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Number of after-hours leads that received
                                  callbacks
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Call Rate %</div>
                              <div className="text-xs font-normal text-slate-500">
                                (After-Hours)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Percentage of after-hours leads that received
                                  callbacks (Callbacks / Total Leads × 100)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div>
                              <div>Total Call Missed</div>
                              <div className="text-xs font-normal text-slate-500">
                                (After Hours)
                              </div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Number of after-hours leads that did NOT
                                  receive any callback
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMetrics.byCallCenter.map((cc, idx) => (
                        <TableRow
                          key={idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-900 text-center">
                            {cc.callCenter}
                          </TableCell>
                          <TableCell className="text-slate-700 text-sm text-center">
                            {cc.operatingHours}
                          </TableCell>
                          <TableCell className="text-center text-slate-700 font-medium">
                            {formatNumber(cc.totalLeadsSent)}
                          </TableCell>
                          <TableCell className="text-center text-blue-700 font-medium">
                            {formatNumber(cc.totalCalls)}
                          </TableCell>
                          <TableCell className="text-center text-slate-700">
                            {formatNumber(cc.inHours.totalLeads)}
                          </TableCell>
                          <TableCell className="text-center text-blue-700 font-medium">
                            {formatNumber(cc.inHours.totalCalls)}
                          </TableCell>
                          <TableCell className="text-center text-emerald-700 font-medium">
                            {formatNumber(cc.inHours.uniqueCalls)}
                          </TableCell>
                          <TableCell className="text-center text-cyan-700 font-semibold">
                            {formatPercentage(cc.inHours.callRate)}
                          </TableCell>
                          <TableCell className="text-center text-slate-700">
                            {formatNumber(cc.afterHours.totalLeads)}
                          </TableCell>
                          <TableCell className="text-center text-orange-700 font-medium">
                            {formatNumber(cc.afterHours.totalCalls)}
                          </TableCell>
                          <TableCell className="text-center text-purple-700 font-medium">
                            {formatNumber(cc.afterHours.callbacks)}
                          </TableCell>
                          <TableCell className="text-center text-cyan-700 font-semibold">
                            {formatPercentage(cc.afterHours.callbackRate)}
                          </TableCell>
                          <TableCell className="text-center text-red-700 font-medium">
                            {formatNumber(cc.totalCallsMissedAfterHours)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
