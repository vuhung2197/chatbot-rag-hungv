import mysql from 'mysql2/promise';
import './bootstrap/env.js'; // Ensure environment variables are loaded

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'chatbot',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  charset: 'utf8mb4'
});

export default pool;