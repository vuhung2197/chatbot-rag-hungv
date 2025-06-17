const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await pool.execute("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [name, email, hash]);
  res.json({ message: "Registered" });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "Login failed" });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token, role: user.role });
};
