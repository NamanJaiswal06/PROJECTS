"use strict";
const { rewriteNotice } = require("../services/ai.service");
const { rewriteNoticeSchema } = require("../validators/ai.validator");
const { success, failure } = require("../utils/apiResponse");

/**
 * POST /api/ai/rewrite-notice
 * Teacher only — rewrites raw text into a professional notice draft
 * Input:  { rawText: "..." }
 * Output: data: { title, content }
 */
const rewriteNoticeHandler = async (req, res, next) => {
  try {
    const parsed = rewriteNoticeSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { rawText } = parsed.data;

    const result = await rewriteNotice(rawText);
    return success(res, 200, "Notice rewritten successfully", result);
  } catch (err) {
    // Typed errors from ai.service.js (503, 502, etc.)
    if (err.statusCode) {
      return failure(res, err.statusCode, err.message);
    }
    next(err);
  }
};

module.exports = { rewriteNoticeHandler };
