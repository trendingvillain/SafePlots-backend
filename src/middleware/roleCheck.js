const { errorResponse } = require('../utils/response');
const supabase = require('../config/database');

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

      if (!hasRole) {
        return errorResponse(
          res,
          'FORBIDDEN',
          'Insufficient permissions',
          403
        );
      }

      if (allowedRoles.includes('seller')) {
        const { data: seller } = await supabase
          .from('sellers')
          .select('id, status, is_verified')
          .eq('user_id', req.user.id)
          .maybeSingle();

        if (!seller) {
          return errorResponse(res, 'FORBIDDEN', 'Seller account not found', 403);
        }

        if (seller.status === 'banned') {
          return errorResponse(res, 'FORBIDDEN', 'Seller account has been banned', 403);
        }

        req.seller = seller;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return errorResponse(res, 'FORBIDDEN', 'Permission check failed', 403);
    }
  };
};

const requireSeller = requireRole('seller', 'admin');
const requireAdmin = requireRole('admin');

module.exports = {
  requireRole,
  requireSeller,
  requireAdmin
};
