/**
 * tool.routes.js — Tool management routes.
 *
 * RBAC:
 *   POST, PATCH, DELETE → ADMIN only
 *   GET                 → Any authenticated user
 */
const { Router } = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const { USER_ROLES } = require("../utils/constants");
const { createToolSchema, updateToolSchema, toolIdSchema } = require("../validators/tool.validator");
const { createTool, listTools, getTool, updateTool, deleteTool } = require("../controllers/tool.controller");

const router = Router();

router.use(authenticate);

router.get("/", listTools);
router.get("/:id", validate(toolIdSchema, "params"), getTool);

router.post("/", authorize(USER_ROLES.ADMIN), validate(createToolSchema), createTool);

router.patch(
  "/:id",
  authorize(USER_ROLES.ADMIN),
  validate(toolIdSchema, "params"),
  validate(updateToolSchema),
  updateTool
);

router.delete("/:id", authorize(USER_ROLES.ADMIN), validate(toolIdSchema, "params"), deleteTool);

module.exports = router;

