import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { google } from 'googleapis';
import { saveTokens } from '../helpers/tokenStore.js';
import crypto from 'crypto';
import '../bootstrap/env.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://chatbotai2197.com/oauth/google/callback'
);

export function authGoogle(req, res) {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state: crypto.randomUUID()
  });
  req.session.oauthState = url.match(/state=([^&]+)/)[1];
  res.redirect(url);
}

export async function googleCallback(req, res) {
  const { code, state } = req.query;
  if (state !== req.session.oauthState) return res.status(400).send('CSRF');
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const { data: profile } = await gmail.users.getProfile({ userId: 'me' });

  await saveTokens(profile.emailAddress, tokens);
  req.session.userEmail = profile.emailAddress; // để các route khác dùng
  res.redirect('/chat');
}

/**
 * Đăng ký tài khoản người dùng mới.
 * Nhận thông tin username, password từ request body và tạo tài khoản mới nếu chưa tồn tại.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function register(req, res) {
  const { name, email, password, role = "user" } = req.body;

  // ✅ Chỉ cho phép 'user' hoặc 'admin'
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ message: "Role không hợp lệ" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, hash, role]
    );
    res.json({ message: "Registered" });
  } catch (err) {
    console.error("❌ Lỗi khi đăng ký:", err);
    res.status(500).json({ message: "Lỗi server khi đăng ký" });
  }
}

/**
 * Đăng nhập tài khoản người dùng.
 * Kiểm tra username, password từ request body, trả về token hoặc thông báo lỗi nếu sai thông tin.
 * @param {object} req - Đối tượng request Express
 * @param {object} res - Đối tượng response Express
 */
export async function login(req, res) {
  const { email, password } = req.body;
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "Login failed" });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token, role: user.role, id: user.id });
}
