require('dotenv').config();

const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'chatbot',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  charset: 'utf8mb4'
});
module.exports = pool;
