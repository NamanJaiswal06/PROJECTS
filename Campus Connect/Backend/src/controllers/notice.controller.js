"use strict";
const mongoose = require("mongoose");
const Notice = require("../models/Notice");
const { createNoticeSchema } = require("../validators/notice.validator");
const { success, failure } = require("../utils/apiResponse");

/**
 * GET /api/notices
 * Authenticated — returns published notices only
 */
const listNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find({ status: "published" })
      .populate("createdBy", "name email role")
      .sort({ publishedAt: -1 });

    return success(res, 200, "Notices retrieved", notices);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notices
 * Teacher only — creates a notice (draft or published)
 */
const createNotice = async (req, res, next) => {
  try {
    const parsed = createNoticeSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return failure(res, 400, messages);
    }

    const { title, content, status } = parsed.data;

    const noticeData = {
      title,
      content,
      status,
      createdBy: req.user._id,
      publishedAt: status === "published" ? new Date() : null,
    };

    const notice = await Notice.create(noticeData);
    await notice.populate("createdBy", "name email role");

    return success(res, 201, "Notice created", notice);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notices/:id/publish
 * Teacher only — publishes an existing draft notice
 */
const publishNotice = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure(res, 400, "Invalid notice ID format.");
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      return failure(res, 404, "Notice not found.");
    }

    notice.status = "published";
    notice.publishedAt = new Date();
    await notice.save();
    await notice.populate("createdBy", "name email role");

    return success(res, 200, "Notice published", notice);
  } catch (err) {
    next(err);
  }
};

module.exports = { listNotices, createNotice, publishNotice };
