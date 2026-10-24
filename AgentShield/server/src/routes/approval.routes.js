/**
 * approval.routes.js — Approval workflow routes. Phase 8 stub.
 */
const { Router } = require("express");
const router = Router();

router.all("*", (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Approval endpoints are coming in Phase 8." },
  });
});

module.exports = router;
