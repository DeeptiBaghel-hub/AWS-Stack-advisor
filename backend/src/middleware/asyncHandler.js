// Express 4 doesn't catch rejected promises from async route handlers —
// an unhandled rejection there crashes the entire Node process instead of
// producing a normal error response. This wrapper forwards any rejection
// to next(err), so errorHandler.js can turn it into a proper 500 response.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
