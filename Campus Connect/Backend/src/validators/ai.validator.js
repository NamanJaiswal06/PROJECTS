"use strict";
const { z } = require("zod");

const rewriteNoticeSchema = z.object({
  rawText: z
    .string()
    .min(1, "rawText cannot be empty")
    .max(5000, "rawText is too long (max 5000 characters)"),
});

module.exports = { rewriteNoticeSchema };
