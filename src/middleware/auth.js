const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const supabase = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'UNAUTHORIZED', 'No token provided', 401);
    }

    const token = authHeader.substring(7);

    const decoded = verifyToken(token);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, phone, avatar_url, status')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (error || !user) {
      return errorResponse(res, 'UNAUTHORIZED', 'User not found', 401);
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      return errorResponse(res, 'FORBIDDEN', 'Account has been suspended', 403);
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles ? roles.map(r => r.role) : ['user'];

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar_url,
      status: user.status,
      roles: userRoles
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, phone, avatar_url, status')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (user && user.status === 'active') {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const userRoles = roles ? roles.map(r => r.role) : ['user'];

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar_url,
        status: user.status,
        roles: userRoles
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
