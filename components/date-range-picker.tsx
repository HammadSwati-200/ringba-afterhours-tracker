"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  date,
  setDate,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal bg-white border-slate-300 hover:bg-slate-50",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "yyyy-MM-dd")} →{" "}
                  {format(date.to, "yyyy-MM-dd")}
                </>
              ) : (
                format(date.from, "yyyy-MM-dd")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
          <div className="flex gap-2 p-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-white border-slate-300 hover:bg-slate-50"
              onClick={() => {
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                setDate({ from: startOfWeek, to: today });
              }}
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-white border-slate-300 hover:bg-slate-50"
              onClick={() => {
                const today = new Date();
                const lastWeekEnd = new Date(today);
                lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                setDate({ from: lastWeekStart, to: lastWeekEnd });
              }}
            >
              Last Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-white border-slate-300 hover:bg-slate-50"
              onClick={() => {
                const today = new Date();
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                setDate({ from: sevenDaysAgo, to: today });
              }}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-white border-slate-300 hover:bg-slate-50"
              onClick={() => {
                const today = new Date();
                const startOfMonth = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  1
                );
                setDate({ from: startOfMonth, to: today });
              }}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-white border-slate-300 hover:bg-slate-50"
              onClick={() => {
                const today = new Date();
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                setDate({ from: startOfYear, to: today });
              }}
            >
              This Year
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              onClick={() => {
                // Confirm button - close the popover (handled by PopoverTrigger)
              }}
            >
              Confirm
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
