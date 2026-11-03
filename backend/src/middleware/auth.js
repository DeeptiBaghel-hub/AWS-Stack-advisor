const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  // code: 'AUTH_REQUIRED' marks this as specifically a missing/invalid/
  // expired-token rejection from this middleware — distinct from other,
  // unrelated 401s a controller might return on an otherwise-valid,
  // authenticated request (e.g. "current password is incorrect" when
  // changing your password). The client uses this code, not the message
  // text or the presence of an Authorization header alone, to decide
  // whether to clear the session and redirect to login — both of those
  // other signals would also be true for a wrong-current-password
  // rejection, which should just show an inline error, not log anyone out.
  if (!token) {
    return res.status(401).json({ message: 'Sign in to continue.', code: 'AUTH_REQUIRED' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Your session expired. Sign in again.', code: 'AUTH_REQUIRED' });
  }
}

module.exports = requireAuth;
