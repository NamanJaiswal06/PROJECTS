/**
 * asyncHandler — Wraps async Express route handlers so we don't need
 * try/catch in every controller.
 *
 * Why this exists:
 *   Without this wrapper, any async controller that throws or rejects
 *   would silently hang the request (Express < 5). This wrapper catches
 *   rejections and forwards them to next(err), triggering the global
 *   error middleware.
 *
 * Usage:
 *   router.get("/agents", asyncHandler(async (req, res) => {
 *     const agents = await agentService.list();
 *     res.json({ success: true, data: agents });
 *   }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
