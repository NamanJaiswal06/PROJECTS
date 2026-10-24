/**
 * validation.middleware.js — Zod schema validation middleware factory.
 *
 * Why Zod?
 *   Zod lets us define schemas in JavaScript and get runtime type checking
 *   with clear error messages. Unlike manual validation, Zod schemas are
 *   composable, reusable, and easy to read.
 *
 * Usage:
 *   import { validate } from './validation.middleware';
 *   import { createAgentSchema } from '../validators/agent.validator';
 *
 *   router.post('/agents', authenticate, validate(createAgentSchema), asyncHandler(agentController.create));
 *
 * The 'target' parameter tells the middleware which part of the request
 * to validate: 'body' (default), 'params', or 'query'.
 */
const AppError = require("../utils/AppError");

/**
 * validate — Returns an Express middleware that validates req[target]
 * against the given Zod schema.
 *
 * @param {import("zod").ZodSchema} schema  — The Zod schema to validate against
 * @param {"body"|"params"|"query"} target  — Which part of req to validate
 */
const validate = (schema, target = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      // Map Zod errors to a flat list of { field, message } objects
      const details = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      return next(
        new AppError("Validation failed", 400, "VALIDATION_ERROR", details)
      );
    }

    // Replace req[target] with the parsed (and type-coerced) data
    // This is important: Zod may coerce types (e.g., string → number)
    // and strip unknown fields, so use the parsed result, not the raw input.
    req[target] = result.data;

    next();
  };
};

module.exports = { validate };
