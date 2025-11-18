"use client";

import { useState } from "react";
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
} from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";

// Placeholder data structure
interface CallCenterStats {
  name: string;
  totalCalls: number;
  inHoursLeads: number;
  afterHoursLeads: number;
  callbackRate: string;
}

export function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedCallCenter, setSelectedCallCenter] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Placeholder stats - replace with real data
  const stats = {
    totalCalls: 0,
    inHoursLeads: 0,
    afterHoursLeads: 0,
  };

  // Placeholder call center data - replace with real data
  const callCenterStats: CallCenterStats[] = [];

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    if (start && end) {
      setDateRange({ start, end });
      // TODO: Fetch data based on new date range
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    // TODO: Implement data refresh logic
    setTimeout(() => setLoading(false), 1000);
  };

  const handleExport = (format: "json" | "csv") => {
    // TODO: Implement export logic
    console.log(`Exporting as ${format}`);
  };

  const handleLogout = () => {
    // TODO: Implement logout logic
    window.location.href = "/login";
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen">
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
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2 border-slate-300 hover:bg-slate-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>

          {/* Filters and Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap flex-1">
              <DateRangePicker
                onDateRangeChange={handleDateRangeChange}
                className="w-full sm:w-auto"
              />

              <Select value={selectedCallCenter} onValueChange={setSelectedCallCenter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-white border-slate-300">
                  <SelectValue placeholder="All Call Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Call Centers</SelectItem>
                  {/* TODO: Add call center options */}
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
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className={`mr-2 w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
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
                  Total Calls
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total number of calls in the selected date range</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <PhoneCall className="w-5 h-5 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-cyan-700">
                  {stats.totalCalls.toLocaleString()}
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
                  {stats.inHoursLeads.toLocaleString()}
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
                  {stats.afterHoursLeads.toLocaleString()}
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
              {callCenterStats.length === 0 ? (
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
                        <TableHead className="font-semibold text-slate-700">
                          Call Center
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">
                          Total Calls
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">
                          In-Hours Leads
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">
                          After-Hours Leads
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">
                          Callback Rate
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {callCenterStats.map((cc, idx) => (
                        <TableRow
                          key={idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-900">
                            {cc.name}
                          </TableCell>
                          <TableCell className="text-right text-slate-700">
                            {cc.totalCalls.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-emerald-700 font-medium">
                            {cc.inHoursLeads.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-purple-700 font-medium">
                            {cc.afterHoursLeads.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-cyan-700 font-semibold">
                            {cc.callbackRate}
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
