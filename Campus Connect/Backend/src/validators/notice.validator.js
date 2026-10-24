"use strict";
const { z } = require("zod");

const createNoticeSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  content: z.string().min(1, "Content is required"),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

module.exports = { createNoticeSchema };
