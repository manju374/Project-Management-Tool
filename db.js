const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,     
  user: process.env.DB_USER,      
  database: process.env.DB_NAME,  
  password: process.env.DB_PASSWORD, 
  port: process.env.DB_PORT || 3306, 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
