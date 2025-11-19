/**
 * Export Service
 * Handle data export to JSON and CSV formats
 */

import type { AggregatedMetrics } from "@/lib/types";
import { formatPercentage } from "@/lib/utils/calculations";

/**
 * Export metrics as JSON file
 */
export function exportAsJSON(metrics: AggregatedMetrics, filename: string = "metrics.json"): void {
  const dataStr = JSON.stringify(metrics, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  downloadBlob(blob, filename);
}

/**
 * Export metrics as CSV file
 */
export function exportAsCSV(metrics: AggregatedMetrics, filename: string = "metrics.csv"): void {
  const headers = [
    "Call Center",
    "Operating Hours",
    "Total Lead Sent (from iRev)",
    "Total Calls (from Ringba)",
    "Total Leads Sent (In-Hours)",
    "Total Unique Call (In-Hours)",
    "Call Rate % (In-Hours)",
    "Total Leads Sent (After-Hours)",
    "Total Unique Call (After Hour Recovery)",
    "Call Rate % (After-Hours)",
    "Total Call Missed After Hours",
  ];

  const rows = metrics.byCallCenter.map((cc) => [
    cc.callCenter,
    cc.operatingHours,
    cc.totalLeadsSent.toString(),
    cc.totalCalls.toString(),
    cc.inHours.totalLeads.toString(),
    cc.inHours.uniqueCalls.toString(),
    formatPercentage(cc.inHours.callRate),
    cc.afterHours.totalLeads.toString(),
    cc.afterHours.callbacks.toString(),
    formatPercentage(cc.afterHours.callbackRate),
    cc.totalCallsMissedAfterHours.toString(),
  ]);

  // Add summary row
  rows.push([
    "TOTAL",
    "-",
    metrics.byCallCenter.reduce((sum, cc) => sum + cc.totalLeadsSent, 0).toString(),
    metrics.byCallCenter.reduce((sum, cc) => sum + cc.totalCalls, 0).toString(),
    metrics.totalInHoursLeads.toString(),
    "-",
    "-",
    metrics.totalAfterHoursLeads.toString(),
    metrics.totalCallbacks.toString(),
    formatPercentage(metrics.overallCallbackRate),
    metrics.byCallCenter.reduce((sum, cc) => sum + cc.totalCallsMissedAfterHours, 0).toString(),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/**
 * Helper function to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
