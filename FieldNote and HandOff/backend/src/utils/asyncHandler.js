/**
 * Wraps an async Express route handler and forwards any thrown errors
 * to the next() error-handling middleware — removes the need for try/catch
 * in every controller.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
