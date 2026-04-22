import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireDeveloperAuth } from "../../lib/requireDeveloperAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!requireDeveloperAuth(req, res)) return;

  try {
    const { customerId } = req.query;

    let query = supabaseAdmin
      .from("payments")
      .select("id,customer_id,amount,memo,created_at,order_id,order_number,payment_type")
      .order("created_at", { ascending: false });

    if (customerId === "manual") {
      query = query.is("customer_id", null);
    } else if (customerId) {
      query = query.eq("customer_id", Number(customerId));
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    return res.status(500).json({ message: error.message || "입금 목록 조회 실패" });
  }
}