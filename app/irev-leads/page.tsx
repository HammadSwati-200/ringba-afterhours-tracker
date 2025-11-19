"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { IrevLead } from "@/lib/types";
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

export default function IrevLeadsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [leads, setLeads] = useState<IrevLead[]>([]);
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

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const allLeads: IrevLead[] = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        let query = supabase
          .from("irev_leads")
          .select("*")
          .gte("timestampz", dateRange.start.toISOString())
          .lte("timestampz", dateRange.end.toISOString());

        // Add call center filter if not "all"
        if (selectedCallCenter !== "all") {
          query = query.eq("utm_source", selectedCallCenter);
        }

        const { data, error } = await query
          .order("timestampz", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allLeads.push(...data);
        if (data.length < pageSize) break;
        page++;
      }

      setLeads(allLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedCallCenter, supabase]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
    }
  }, [isAuthenticated, fetchLeads]);

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
      "Timestamp",
      "Click ID",
      "Phone Number",
      "Phone Number Normalized",
    ];

    const rows = leads.map((lead) => [
      lead.id?.toString() || "",
      lead.utm_source || "",
      lead.timestampz || lead.created_at || "",
      lead.cid || lead.click_id || "",
      lead.phone_number || "",
      lead.phone_number_norm || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `irev-leads-${dateRange.start.toISOString().split("T")[0]}-to-${dateRange.end.toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Define columns for the data table
  const columns = useMemo<ColumnDef<IrevLead>[]>(
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
        accessorKey: "utm_source",
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
          <div className="font-medium">{row.getValue("utm_source")}</div>
        ),
      },
      {
        accessorKey: "timestampz",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Timestamp
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const timestamp = row.getValue("timestampz") as string;
          const createdAt = row.original.created_at;
          const dateStr = timestamp || createdAt;
          return dateStr ? new Date(dateStr).toLocaleString() : "N/A";
        },
      },
      {
        accessorKey: "cid",
        header: "Click ID",
        cell: ({ row }) => {
          const cid = row.getValue("cid") as string;
          const clickId = row.original.click_id;
          return (
            <div className="font-mono text-sm">{cid || clickId || "N/A"}</div>
          );
        },
      },
      {
        accessorKey: "phone_number",
        header: "Phone Number",
        cell: ({ row }) => (
          <div className="font-mono">{row.getValue("phone_number") || "N/A"}</div>
        ),
      },
      {
        accessorKey: "phone_number_norm",
        header: "Phone Normalized",
        cell: ({ row }) => (
          <div className="font-mono">
            {row.getValue("phone_number_norm") || "N/A"}
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
            <h1 className="text-3xl font-bold text-slate-900">iRev Leads</h1>
            <p className="text-slate-600 mt-2">
              View all leads from iRev platform
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
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Call Center
                </label>
                <Select
                  value={selectedCallCenter}
                  onValueChange={setSelectedCallCenter}
                >
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="All Call Centers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Call Centers</SelectItem>
                    {callCenterHours.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
              <Button
                onClick={handleExportCSV}
                disabled={loading || leads.length === 0}
                variant="outline"
                className="mt-auto"
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
              {loading ? "Loading..." : `${leads.length} Records`}
            </CardTitle>
            <CardDescription>
              Showing leads from {dateRange.start.toLocaleDateString()} to{" "}
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
                data={leads}
                searchKey="utm_source"
                searchPlaceholder="Filter by call center..."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
