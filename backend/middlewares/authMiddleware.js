import jwt from "jsonwebtoken";

/**
 * Middleware xác thực token JWT của người dùng.
 * - Kiểm tra token trong header Authorization.
 * - Nếu hợp lệ, giải mã và gán thông tin user vào req.user.
 * - Nếu không hợp lệ hoặc thiếu token, trả về lỗi 401.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 * @param {function} next - Hàm next để chuyển sang middleware tiếp theo
 */
export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ message: "Invalid token" });
  }
}

/**
 * Middleware kiểm tra quyền admin.
 * - Yêu cầu đã xác thực (đã qua verifyToken).
 * - Kiểm tra req.user.role hoặc trường tương ứng là 'admin'.
 * - Nếu không phải admin, trả về lỗi 403 Forbidden.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 * @param {function} next - Hàm next để chuyển sang middleware tiếp theo
 */
export function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
}