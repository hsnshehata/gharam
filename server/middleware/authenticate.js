const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('x-auth-token');
  console.log(`Authenticate middleware: Checking token for path ${req.path}`);

  if (!token) {
    console.log(`Authenticate middleware: No token provided for path ${req.path}`);
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('Authenticate middleware: JWT_SECRET is not defined');
      return res.status(500).json({ msg: 'Server configuration error: JWT_SECRET missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    console.log(`Authenticate middleware: Token verified for user ${decoded.user.id} on path ${req.path}`);
    next();
  } catch (err) {
    console.error(`Authenticate middleware: Token verification failed for path ${req.path}: ${err.message}`);
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};
