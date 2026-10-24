"use strict";
require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Campus Connect server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

start();
