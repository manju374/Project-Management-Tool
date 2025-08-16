const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,      // e.g. "localhost"
  user: process.env.DB_USER,      // e.g. "root"
  database: process.env.DB_NAME,  // your db name
  password: process.env.DB_PASSWORD, 
  port: process.env.DB_PORT || 3306, // MySQL default is 3306
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
