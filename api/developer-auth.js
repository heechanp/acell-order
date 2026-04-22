export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { password } = req.body || {};
    const expected = process.env.DEV_ADMIN_PASSWORD;

    if (!expected) {
      return res.status(500).json({ message: "DEV_ADMIN_PASSWORD가 없습니다." });
    }

    if (!password || password !== expected) {
      return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || "개발자 인증 실패" });
  }
}