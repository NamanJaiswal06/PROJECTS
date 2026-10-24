/**
 * simulator.routes.js — Agent simulator routes. Phase 11 stub.
 */
const { Router } = require("express");
const router = Router();

router.all("*", (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Simulator endpoints are coming in Phase 11." },
  });
});

module.exports = router;
