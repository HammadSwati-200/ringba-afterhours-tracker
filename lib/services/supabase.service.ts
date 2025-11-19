/**
 * Supabase Service
 * Handles all data fetching from Supabase with optimized batching
 */

import { createClient } from "@/lib/supabase-client";
import type { IrevLead, RingbaCall } from "@/lib/types";

const BATCH_SIZE = 1000; // Fetch 1000 records per batch

export class SupabaseService {
  private client = createClient();

  /**
   * Fetch all iRev leads within date range
   * Uses pagination to handle large datasets
   */
  async fetchLeads(startDate: Date, endDate: Date): Promise<IrevLead[]> {
    const allLeads: IrevLead[] = [];
    let page = 0;
    let hasMore = true;

    // Adjust endDate to end of day (23:59:59.999)
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    try {
      while (hasMore) {
        const { data, error } = await this.client
          .from("irev_leads")
          .select("*")
          .gte("timestampz", startDate.toISOString())
          .lte("timestampz", adjustedEndDate.toISOString())
          .order("timestampz", { ascending: false })
          .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);

        if (error) {
          console.error("Error fetching leads:", error);
          throw new Error(`Failed to fetch leads: ${error.message}`);
        }

        if (data && data.length > 0) {
          allLeads.push(...data);
          hasMore = data.length === BATCH_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ Fetched ${allLeads.length} leads`);
      return allLeads;
    } catch (error) {
      console.error("Error in fetchLeads:", error);
      throw error;
    }
  }

  /**
   * Fetch all Ringba calls within date range
   * Uses pagination to handle large datasets
   */
  async fetchCalls(startDate: Date, endDate: Date): Promise<RingbaCall[]> {
    const allCalls: RingbaCall[] = [];
    let page = 0;
    let hasMore = true;

    // Adjust endDate to end of day (23:59:59.999)
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    try {
      while (hasMore) {
        const { data, error } = await this.client
          .from("calls")
          .select("*")
          .gte("call_date", startDate.toISOString())
          .lte("call_date", adjustedEndDate.toISOString())
          .order("call_date", { ascending: false })
          .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);

        if (error) {
          console.error("Error fetching calls:", error);
          throw new Error(`Failed to fetch calls: ${error.message}`);
        }

        if (data && data.length > 0) {
          allCalls.push(...data);
          hasMore = data.length === BATCH_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ Fetched ${allCalls.length} calls`);
      return allCalls;
    } catch (error) {
      console.error("Error in fetchCalls:", error);
      throw error;
    }
  }

  /**
   * Fetch both leads and calls in parallel for better performance
   */
  async fetchAllData(
    startDate: Date,
    endDate: Date
  ): Promise<{ leads: IrevLead[]; calls: RingbaCall[] }> {
    try {
      const [leads, calls] = await Promise.all([
        this.fetchLeads(startDate, endDate),
        this.fetchCalls(startDate, endDate),
      ]);

      return { leads, calls };
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
