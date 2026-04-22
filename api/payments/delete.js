import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireDeveloperAuth } from "../../lib/requireDeveloperAuth.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!requireDeveloperAuth(req, res)) return;

  try {
    const { paymentId } = req.body || {};

    if (!paymentId) {
      return res.status(400).json({ message: "paymentId가 필요합니다." });
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .select("*");

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    return res.status(500).json({ message: error.message || "입금 삭제 실패" });
  }
}