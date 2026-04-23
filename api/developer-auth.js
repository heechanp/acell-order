export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { password } = req.body || {};
    const expected = process.env.DEV_ADMIN_PASSWORD;

    const inputPassword = String(password || "");
    const savedPassword = String(expected || "");

    return res.status(200).json({
      inputPassword,
      savedPassword,
      inputLength: inputPassword.length,
      savedLength: savedPassword.length,
      same: inputPassword === savedPassword,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "개발자 인증 실패" });
  }
}