/**
 * Daily Logger Utility
 * Provides detailed logging of data broken down by day
 */

import type { NormalizedLead, NormalizedCall } from "@/lib/types";
import { format, subDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

interface DailyStats {
  date: string;
  totalLeads: number;
  inHoursLeads: number;
  afterHoursLeads: number;
  totalCalls: number;
  inHoursCalls: number;
  afterHoursCalls: number;
  callCenters: Map<string, {
    leads: number;
    inHoursLeads: number;
    afterHoursLeads: number;
    calls: number;
    inHoursCalls: number;
    afterHoursCalls: number;
  }>;
}

interface Past4DaysReport {
  days: DailyStats[];
  aggregated: {
    totalLeads: number;
    inHoursLeads: number;
    afterHoursLeads: number;
    totalCalls: number;
    inHoursCalls: number;
    afterHoursCalls: number;
  };
}

const PACIFIC_TZ = "America/Los_Angeles";

/**
 * Check if a date is within a specific day (Pacific Time)
 */
function isWithinDay(date: Date, targetDay: Date): boolean {
  // Convert both dates to Pacific Time for comparison
  const datePST = toZonedTime(date, PACIFIC_TZ);
  const targetDayPST = toZonedTime(targetDay, PACIFIC_TZ);

  // Get start and end of target day in Pacific Time
  const startOfDayPST = new Date(targetDayPST);
  startOfDayPST.setHours(0, 0, 0, 0);

  const endOfDayPST = new Date(targetDayPST);
  endOfDayPST.setHours(23, 59, 59, 999);

  return datePST >= startOfDayPST && datePST <= endOfDayPST;
}

/**
 * Generate daily stats for leads and calls
 */
export function generateDailyStats(
  leads: NormalizedLead[],
  calls: NormalizedCall[],
  numberOfDays: number = 4
): Past4DaysReport {
  // Get current time in Pacific timezone
  const nowUTC = new Date();
  const nowPST = toZonedTime(nowUTC, PACIFIC_TZ);
  const days: DailyStats[] = [];

  // Generate stats for each of the past N days (in Pacific Time)
  for (let i = numberOfDays - 1; i >= 0; i--) {
    const targetDatePST = subDays(nowPST, i);
    const dateStr = format(targetDatePST, "yyyy-MM-dd (EEE)") + " PST";

    // Initialize daily stats
    const dailyStats: DailyStats = {
      date: dateStr,
      totalLeads: 0,
      inHoursLeads: 0,
      afterHoursLeads: 0,
      totalCalls: 0,
      inHoursCalls: 0,
      afterHoursCalls: 0,
      callCenters: new Map()
    };

    // Process leads for this day
    leads.forEach(lead => {
      if (isWithinDay(lead.timestamp, targetDatePST)) {
        dailyStats.totalLeads++;

        if (lead.isAfterHours) {
          dailyStats.afterHoursLeads++;
        } else {
          dailyStats.inHoursLeads++;
        }

        // Track by call center
        const cc = lead.callCenter;
        if (!dailyStats.callCenters.has(cc)) {
          dailyStats.callCenters.set(cc, {
            leads: 0,
            inHoursLeads: 0,
            afterHoursLeads: 0,
            calls: 0,
            inHoursCalls: 0,
            afterHoursCalls: 0
          });
        }

        const ccStats = dailyStats.callCenters.get(cc)!;
        ccStats.leads++;
        if (lead.isAfterHours) {
          ccStats.afterHoursLeads++;
        } else {
          ccStats.inHoursLeads++;
        }
      }
    });

    // Process calls for this day
    calls.forEach(call => {
      if (isWithinDay(call.timestamp, targetDatePST)) {
        dailyStats.totalCalls++;

        if (call.isAfterHours) {
          dailyStats.afterHoursCalls++;
        } else {
          dailyStats.inHoursCalls++;
        }

        // Track by call center
        const cc = call.callCenter;
        if (!dailyStats.callCenters.has(cc)) {
          dailyStats.callCenters.set(cc, {
            leads: 0,
            inHoursLeads: 0,
            afterHoursLeads: 0,
            calls: 0,
            inHoursCalls: 0,
            afterHoursCalls: 0
          });
        }

        const ccStats = dailyStats.callCenters.get(cc)!;
        ccStats.calls++;
        if (call.isAfterHours) {
          ccStats.afterHoursCalls++;
        } else {
          ccStats.inHoursCalls++;
        }
      }
    });

    days.push(dailyStats);
  }

  // Calculate aggregated totals
  const aggregated = {
    totalLeads: days.reduce((sum, day) => sum + day.totalLeads, 0),
    inHoursLeads: days.reduce((sum, day) => sum + day.inHoursLeads, 0),
    afterHoursLeads: days.reduce((sum, day) => sum + day.afterHoursLeads, 0),
    totalCalls: days.reduce((sum, day) => sum + day.totalCalls, 0),
    inHoursCalls: days.reduce((sum, day) => sum + day.inHoursCalls, 0),
    afterHoursCalls: days.reduce((sum, day) => sum + day.afterHoursCalls, 0)
  };

  return { days, aggregated };
}

/**
 * Log detailed daily breakdown to console
 */
export function logDailyBreakdown(report: Past4DaysReport): void {
  console.log("\n" + "=".repeat(80));
  console.log("📅 DAILY DATA BREAKDOWN - PAST 4 DAYS");
  console.log("=".repeat(80));

  // Log each day
  report.days.forEach((day, index) => {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`📆 Day ${index + 1}: ${day.date}`);
    console.log(`${"─".repeat(80)}`);
    console.log(`📊 Leads Summary:`);
    console.log(`   • Total Leads: ${day.totalLeads}`);
    console.log(`   • In-Hours Leads: ${day.inHoursLeads}`);
    console.log(`   • After-Hours Leads: ${day.afterHoursLeads}`);
    console.log(`\n📞 Calls Summary:`);
    console.log(`   • Total Calls: ${day.totalCalls}`);
    console.log(`   • In-Hours Calls: ${day.inHoursCalls}`);
    console.log(`   • After-Hours Calls: ${day.afterHoursCalls}`);

    // Log call center breakdown if there are multiple centers
    if (day.callCenters.size > 0) {
      console.log(`\n🏢 Call Center Breakdown (${day.callCenters.size} centers):`);

      // Sort call centers by name
      const sortedCenters = Array.from(day.callCenters.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      // Only show top 10 centers to avoid cluttering logs
      const centersToShow = sortedCenters.slice(0, 10);

      centersToShow.forEach(([ccName, ccStats]) => {
        if (ccStats.leads > 0 || ccStats.calls > 0) {
          console.log(`   ${ccName}:`);
          console.log(`      Leads: ${ccStats.leads} (In: ${ccStats.inHoursLeads}, After: ${ccStats.afterHoursLeads})`);
          console.log(`      Calls: ${ccStats.calls} (In: ${ccStats.inHoursCalls}, After: ${ccStats.afterHoursCalls})`);
        }
      });

      if (sortedCenters.length > 10) {
        console.log(`   ... and ${sortedCenters.length - 10} more call centers`);
      }
    }
  });

  // Log aggregated totals
  console.log(`\n${"=".repeat(80)}`);
  console.log("📈 AGGREGATED TOTALS (ALL 4 DAYS)");
  console.log("=".repeat(80));
  console.log(`📊 Total Leads: ${report.aggregated.totalLeads}`);
  console.log(`   • In-Hours: ${report.aggregated.inHoursLeads} (${((report.aggregated.inHoursLeads / report.aggregated.totalLeads) * 100).toFixed(1)}%)`);
  console.log(`   • After-Hours: ${report.aggregated.afterHoursLeads} (${((report.aggregated.afterHoursLeads / report.aggregated.totalLeads) * 100).toFixed(1)}%)`);
  console.log(`\n📞 Total Calls: ${report.aggregated.totalCalls}`);
  console.log(`   • In-Hours: ${report.aggregated.inHoursCalls} (${((report.aggregated.inHoursCalls / report.aggregated.totalCalls) * 100).toFixed(1)}%)`);
  console.log(`   • After-Hours: ${report.aggregated.afterHoursCalls} (${((report.aggregated.afterHoursCalls / report.aggregated.totalCalls) * 100).toFixed(1)}%)`);
  console.log("=".repeat(80) + "\n");
}

/**
 * Generate and log daily breakdown in one call
 */
export function generateAndLogDailyBreakdown(
  leads: NormalizedLead[],
  calls: NormalizedCall[],
  numberOfDays: number = 4
): Past4DaysReport {
  const report = generateDailyStats(leads, calls, numberOfDays);
  logDailyBreakdown(report);
  return report;
}
