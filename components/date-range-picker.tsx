"use client";

import * as React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  date?: DateRange | undefined;
  setDate?: (date: DateRange | undefined) => void;
  onDateRangeChange?: (start: Date | null, end: Date | null) => void;
  activeFilter?: string;
  setActiveFilter?: (filter: string | null) => void;
  className?: string;
}

export function DateRangePicker({
  date,
  setDate,
  onDateRangeChange,
  activeFilter: externalActiveFilter,
  setActiveFilter: externalSetActiveFilter,
  className,
}: DateRangePickerProps) {
  // Initialize with default dates (last 7 days) if not provided
  const getDefaultDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end };
  };

  const defaults = getDefaultDates();
  const [startDate, setStartDate] = React.useState<Date | null>(
    date?.from || defaults.start
  );
  const [endDate, setEndDate] = React.useState<Date | null>(
    date?.to || defaults.end
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalActiveFilter, setInternalActiveFilter] = React.useState<
    string | null
  >(externalActiveFilter || null);

  const activeFilter =
    externalActiveFilter !== undefined
      ? externalActiveFilter
      : internalActiveFilter;
  const setActiveFilter = externalSetActiveFilter || setInternalActiveFilter;

  const onChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    setActiveFilter(null); // Clear active filter when manually selecting
  };

  const handleQuickSelect = (days: number, type: string) => {
    const today = new Date();
    // Reset today to start of day (00:00:00)
    today.setHours(0, 0, 0, 0);

    let start: Date;
    let end: Date = new Date(today);

    switch (type) {
      case "thisWeek":
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case "lastWeek":
        end = new Date(today);
        end.setDate(today.getDate() - today.getDay() - 1);
        end.setHours(0, 0, 0, 0);
        start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case "last7Days":
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        break;
      case "thisYear":
        start = new Date(today.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start = new Date(today);
        start.setHours(0, 0, 0, 0);
    }

    setStartDate(start);
    setEndDate(end);

    // Call the appropriate callback
    if (setDate) {
      setDate({ from: start, to: end });
    }
    if (onDateRangeChange) {
      onDateRangeChange(start, end);
    }

    setActiveFilter(type); // Set active filter
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      // Call the appropriate callback
      if (setDate) {
        setDate({ from: startDate, to: endDate });
      }
      if (onDateRangeChange) {
        onDateRangeChange(startDate, endDate);
      }
      setIsOpen(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`; // local date, avoids UTC shift
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-medium bg-white border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-900",
              !date && "text-slate-500"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-600" />
            {startDate && endDate ? (
              <>
                {formatDate(startDate)} → {formatDate(endDate)}
              </>
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="start">
          <div className="p-4">
            <DatePicker
              selected={startDate}
              onChange={onChange}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              inline
              monthsShown={2}
              calendarClassName={cn(
                "custom-datepicker",
                !startDate && !endDate && "no-selection"
              )}
            />
          </div>
          <div className="flex gap-2 p-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 border-slate-300 hover:bg-slate-100 hover:border-slate-400 font-medium",
                activeFilter === "thisWeek"
                  ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                  : "bg-white text-slate-700"
              )}
              onClick={() => handleQuickSelect(0, "thisWeek")}
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 border-slate-300 hover:bg-slate-100 hover:border-slate-400 font-medium",
                activeFilter === "lastWeek"
                  ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                  : "bg-white text-slate-700"
              )}
              onClick={() => handleQuickSelect(0, "lastWeek")}
            >
              Last Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 border-slate-300 hover:bg-slate-100 hover:border-slate-400 font-medium",
                activeFilter === "last7Days"
                  ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                  : "bg-white text-slate-700"
              )}
              onClick={() => handleQuickSelect(7, "last7Days")}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 border-slate-300 hover:bg-slate-100 hover:border-slate-400 font-medium",
                activeFilter === "thisMonth"
                  ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                  : "bg-white text-slate-700"
              )}
              onClick={() => handleQuickSelect(0, "thisMonth")}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1 border-slate-300 hover:bg-slate-100 hover:border-slate-400 font-medium",
                activeFilter === "thisYear"
                  ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
                  : "bg-white text-slate-700"
              )}
              onClick={() => handleQuickSelect(0, "thisYear")}
            >
              This Year
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
