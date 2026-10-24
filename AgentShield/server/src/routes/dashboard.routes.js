/**
 * dashboard.routes.js — Dashboard/analytics routes. Phase 13 stub.
 */
const { Router } = require("express");
const router = Router();

router.all("*", (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Dashboard endpoints are coming in Phase 13." },
  });
});

module.exports = router;
