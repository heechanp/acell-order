import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { requireDeveloperAuth } from "../../lib/requireDeveloperAuth";

console.log("payments/list module loaded");

export default async function handler(req, res) {
  console.log("payments/list handler start");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  console.log("before auth");
  if (!requireDeveloperAuth(req, res)) return;
  console.log("after auth");

  try {
    const { customerId } = req.query;
    console.log("customerId:", customerId);

    let query = supabaseAdmin
      .from("payments")
      .select("id,customer_id,amount,memo,created_at,order_id,order_number,payment_type")
      .order("created_at", { ascending: false });

    if (customerId === "manual") {
      query = query.is("customer_id", null);
    } else if (customerId) {
      query = query.eq("customer_id", Number(customerId));
    }

    console.log("before query");
    const { data, error } = await query;
    console.log("after query", { error, count: data?.length });

    if (error) {
      return res.status(500).json({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    console.error("payments/list catch error:", error);
    return res.status(500).json({
      message: error.message || "입금 목록 조회 실패",
    });
  }
}