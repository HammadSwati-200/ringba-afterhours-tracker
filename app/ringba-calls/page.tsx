"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { RingbaCall } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, ArrowUpDown } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { callCenterHours } from "@/lib/call-center-hours";

export default function RingbaCallsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [calls, setCalls] = useState<RingbaCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCallCenter, setSelectedCallCenter] = useState<string>("all");
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    return { start, end };
  });

  // Auth check
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

  // Fetch calls
  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const allCalls: RingbaCall[] = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        let query = supabase
          .from("calls")
          .select("*")
          .gte("call_date", dateRange.start.toISOString())
          .lte("call_date", dateRange.end.toISOString());

        const { data, error } = await query
          .order("call_date", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allCalls.push(...data);
        if (data.length < pageSize) break;
        page++;
      }

      console.log(`Fetched ${allCalls.length} total calls`);
      console.log("Selected call center:", selectedCallCenter);

      // Log unique call center values to see what's actually in the database
      const uniqueCallCenters = [...new Set(allCalls.map(call => call.call_center))];
      console.log("Unique call centers in database:", uniqueCallCenters);

      // Normalize function to handle both CC1 and CC_1 formats
      const normalizeCallCenter = (cc: string) => cc?.replace(/_/g, '');

      // Filter client-side by call center if not "all"
      const filteredCalls = selectedCallCenter !== "all"
        ? allCalls.filter(call =>
            normalizeCallCenter(call.call_center) === normalizeCallCenter(selectedCallCenter)
          )
        : allCalls;

      console.log(`After filter: ${filteredCalls.length} calls`);

      setCalls(filteredCalls);
    } catch (error) {
      console.error("Error fetching calls:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedCallCenter, supabase]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCalls();
    }
  }, [isAuthenticated, fetchCalls]);

  const handleDateRangeChange = (start: Date, end: Date) => {
    // Normalize to full day range
    const normalizedStart = new Date(start);
    normalizedStart.setHours(0, 0, 0, 0);

    const normalizedEnd = new Date(end);
    normalizedEnd.setHours(23, 59, 59, 999);

    setDateRange({ start: normalizedStart, end: normalizedEnd });
  };

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Call Center",
      "Call Date",
      "Caller Phone",
      "Click ID",
      "CC Number (DID)",
      "Publisher Name",
    ];

    const rows = calls.map((call) => [
      call.id?.toString() || "",
      call.call_center || "",
      call.call_date || call.created_at || "",
      call.caller_phone || "",
      call.click_id || "",
      call.CC_Number || "",
      call.publisher_name || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ringba-calls-${dateRange.start.toISOString().split("T")[0]}-to-${dateRange.end.toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Define columns for the data table
  const columns = useMemo<ColumnDef<RingbaCall>[]>(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              ID
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.getValue("id")}</div>
        ),
      },
      {
        accessorKey: "call_center",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Call Center
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("call_center")}</div>
        ),
      },
      {
        accessorKey: "call_date",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Call Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const callDate = row.getValue("call_date") as string;
          const createdAt = row.original.created_at;
          const dateStr = callDate || createdAt;
          return dateStr ? new Date(dateStr).toLocaleString() : "N/A";
        },
      },
      {
        accessorKey: "caller_phone",
        header: "Caller Phone",
        cell: ({ row }) => (
          <div className="font-mono">{row.getValue("caller_phone") || "N/A"}</div>
        ),
      },
      {
        accessorKey: "click_id",
        header: "Click ID",
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.getValue("click_id") || "N/A"}</div>
        ),
      },
      {
        accessorKey: "CC_Number",
        header: "CC Number (DID)",
        cell: ({ row }) => (
          <div className="font-mono">{row.getValue("CC_Number") || "N/A"}</div>
        ),
      },
      {
        accessorKey: "publisher_name",
        header: "Publisher Name",
        cell: ({ row }) => (
          <div className="max-w-xs truncate">
            {row.getValue("publisher_name") || "N/A"}
          </div>
        ),
      },
    ],
    []
  );

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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="mb-4 bg-white hover:bg-slate-50 border-slate-300 text-slate-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">Ringba Calls</h1>
            <p className="text-slate-600 mt-2">
              View all calls from Ringba platform
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
              <Button
                onClick={handleExportCSV}
                disabled={loading || calls.length === 0}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {loading ? "Loading..." : `${calls.length} Records`}
            </CardTitle>
            <CardDescription>
              Showing calls from {dateRange.start.toLocaleDateString()} to{" "}
              {dateRange.end.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={calls}
                searchKey="call_center"
                searchPlaceholder="Search in table..."
                callCenters={callCenterHours}
                onCallCenterChange={setSelectedCallCenter}
                selectedCallCenter={selectedCallCenter}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
