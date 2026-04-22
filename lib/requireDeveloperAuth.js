export function requireDeveloperAuth(req, res) {
  const password = req.headers["x-developer-password"];
  const expected = process.env.DEV_ADMIN_PASSWORD;

  if (!expected) {
    res.status(500).json({ message: "DEV_ADMIN_PASSWORD 환경변수가 없습니다." });
    return false;
  }

  if (!password || password !== expected) {
    res.status(401).json({ message: "개발자 인증 실패" });
    return false;
  }

  return true;
}