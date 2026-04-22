import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireDeveloperAuth } from "../../lib/requireDeveloperAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!requireDeveloperAuth(req, res)) return;

  try {
    const {
      customer_id,
      amount,
      memo = null,
      order_id = null,
      order_number = null,
      payment_type = "manual",
    } = req.body || {};

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "입금액이 올바르지 않습니다." });
    }

    // 명세서 중복 입금 방지
    if (payment_type === "receipt" && order_id) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("order_id", order_id)
        .limit(1);

      if (existingError) {
        return res.status(500).json({ message: existingError.message });
      }

      if (existing && existing.length > 0) {
        return res.status(409).json({ message: "이미 이 명세서로 등록된 입금 내역이 있습니다." });
      }
    }

    const insertPayload = {
      customer_id: customer_id === "manual" || customer_id == null ? null : Number(customer_id),
      amount: numericAmount,
      memo,
      order_id,
      order_number,
      payment_type,
    };

    const { data, error } = await supabaseAdmin
      .from("payments")
      .insert([insertPayload])
      .select("*");

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    return res.status(500).json({ message: error.message || "입금 저장 실패" });
  }
}