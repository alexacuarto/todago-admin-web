import { supabase } from "./supabase";

// PostgREST caps a single response; dashboard totals must include every page.
export async function fetchAllRows(table: string, columns = "*", order = "id") {
  const rows: any[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from(table).select(columns).order(order, { ascending: order === "id" });
    if (order !== "id") query = query.order("id");
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
