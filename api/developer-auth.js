export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { password } = req.body || {};
    const expected = process.env.DEV_ADMIN_PASSWORD;

    const inputPassword = String(password || "").trim();
    const savedPassword = String(expected || "").trim();

    if (!savedPassword) {
      return res.status(500).json({ message: "DEV_ADMIN_PASSWORD가 없습니다." });
    }

    if (inputPassword !== savedPassword) {
      return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || "개발자 인증 실패" });
  }
}