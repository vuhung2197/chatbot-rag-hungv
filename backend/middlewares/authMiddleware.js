import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db.js';

/**
 * Middleware xác thực token JWT của người dùng.
 * - Kiểm tra token trong header Authorization.
 * - Verify JWT token signature và expiry.
 * - Kiểm tra session có trong database và chưa hết hạn.
 * - Nếu hợp lệ, giải mã và gán thông tin user vào req.user.
 * - Nếu không hợp lệ hoặc thiếu token, trả về lỗi 401.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 * @param {function} next - Hàm next để chuyển sang middleware tiếp theo
 */
export async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    // 1. Verify JWT token signature và expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 2. Hash token để kiểm tra trong database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // 3. Kiểm tra session có trong database và chưa hết hạn
    const [sessions] = await pool.execute(
      `SELECT id, user_id, expires_at 
       FROM user_sessions 
       WHERE token_hash = ? AND expires_at > NOW()`,
      [tokenHash]
    );
    
    // 4. Nếu không tìm thấy session hoặc đã hết hạn
    if (sessions.length === 0) {
      return res.status(401).json({ 
        message: 'Session expired or revoked. Please login again.' 
      });
    }
    
    // 5. Verify user_id trong session khớp với user_id trong token
    const session = sessions[0];
    if (session.user_id !== decoded.id) {
      return res.status(401).json({ 
        message: 'Session user mismatch' 
      });
    }
    
    // 6. Gán thông tin user vào req.user
    req.user = decoded;
    req.sessionId = session.id; // Thêm sessionId vào request để có thể dùng sau này
    
    next();
  } catch (error) {
    // JWT verification failed (invalid signature, expired, etc.)
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    
    // Database error hoặc lỗi khác
    console.error('Error in verifyToken middleware:', error);
    return res.status(500).json({ message: 'Authentication error' });
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
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin only' });
  next();
}
