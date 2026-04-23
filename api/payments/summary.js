import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { customerId } = req.query;

    let query = supabaseAdmin
      .from("payments")
      .select("amount,customer_id");

    if (customerId === "manual") {
      query = query.is("customer_id", null);
    } else if (customerId) {
      query = query.eq("customer_id", Number(customerId));
    } else {
      return res.status(400).json({ message: "customerId is required" });
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }

    const totalPaid = (data || []).reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    return res.status(200).json({ totalPaid });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "입금 합계 조회 실패",
    });
  }
}