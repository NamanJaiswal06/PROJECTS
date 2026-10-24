/**
 * event.routes.js — Security event routes. Phase 9 stub.
 */
const { Router } = require("express");
const router = Router();

router.all("*", (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: "NOT_IMPLEMENTED", message: "Event endpoints are coming in Phase 9." },
  });
});

module.exports = router;
