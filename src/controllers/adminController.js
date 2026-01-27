const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getAdminStats = async (req, res) => {
  try {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalSellers } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });

    const { count: totalProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    const { count: pendingProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: pendingSellers } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: totalInquiries } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true });

    const { count: soldProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    const { count: totalReports } = await supabase
      .from('property_reports')
      .select('*', { count: 'exact', head: true });

    const { count: bannedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'banned');

    return successResponse(
      res,
      {
        totalUsers: totalUsers || 0,
        totalSellers: totalSellers || 0,
        totalProperties: totalProperties || 0,
        pendingApprovals: pendingProperties || 0,
        pendingSellerVerifications: pendingSellers || 0,
        totalInquiries: totalInquiries || 0,
        propertiesSold: soldProperties || 0,
        totalReports: totalReports || 0,
        bannedUsers: bannedUsers || 0
      },
      'Admin stats fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get admin stats error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch admin stats', 500);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase.from('users').select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Users fetch error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch users', 500);
    }

    const usersWithStats = await Promise.all(
      users.map(async user => {
        const { count: totalViews } = await supabase
          .from('property_views')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { count: totalInquiries } = await supabase
          .from('inquiries')
          .select('*', { count: 'exact', head: true })
          .eq('buyer_id', user.id);

        const { count: totalSaved } = await supabase
          .from('saved_properties')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const userRoles = roles ? roles.map(r => r.role) : ['user'];

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar_url,
          role: userRoles[0] || 'user',
          status: user.status,
          isVerified: true,
          emailVerified: user.email_verified,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          totalViews: totalViews || 0,
          totalInquiries: totalInquiries || 0,
          totalSaved: totalSaved || 0
        };
      })
    );

    return successResponse(
      res,
      {
        users: usersWithStats,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      'Users fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get all users error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch users', 500);
  }
};

const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !user) {
      return errorResponse(res, 'NOT_FOUND', 'User not found', 404);
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles ? roles.map(r => r.role) : ['user'];

    return successResponse(
      res,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: userRoles[0] || 'user',
        status: user.status,
        createdAt: user.created_at
      },
      'User details fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get user details error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch user details', 500);
  }
};

const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { ban } = req.body;

    const newStatus = ban ? 'banned' : 'active';

    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Ban user error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to ban user', 500);
    }

    return successResponse(
      res,
      { id, status: newStatus },
      ban ? 'User banned successfully' : 'User unbanned successfully',
      200
    );
  } catch (error) {
    console.error('Ban user error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to ban user', 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) {
      console.error('Delete user error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to delete user', 500);
    }

    return successResponse(res, null, 'User deleted successfully', 200);
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to delete user', 500);
  }
};

const getAllSellers = async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = supabase.from('sellers').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: sellers, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) {
      console.error('Sellers fetch error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch sellers', 500);
    }

    const formattedSellers = sellers.map(seller => ({
      id: seller.id,
      userId: seller.user_id,
      name: seller.name,
      email: seller.email,
      phone: seller.phone,
      idProofType: seller.id_proof_type,
      idProofUrl: seller.id_proof_url,
      status: seller.status,
      isVerified: seller.is_verified,
      totalProperties: seller.total_properties,
      totalSold: seller.total_sold,
      rating: seller.rating,
      createdAt: seller.created_at
    }));

    return successResponse(
      res,
      formattedSellers,
      'Sellers fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get all sellers error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch sellers', 500);
  }
};

const getSellerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !seller) {
      return errorResponse(res, 'NOT_FOUND', 'Seller not found', 404);
    }

    return successResponse(
      res,
      {
        id: seller.id,
        userId: seller.user_id,
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        idProofType: seller.id_proof_type,
        idProofUrl: seller.id_proof_url,
        status: seller.status,
        isVerified: seller.is_verified,
        totalProperties: seller.total_properties,
        totalSold: seller.total_sold,
        rating: seller.rating,
        createdAt: seller.created_at
      },
      'Seller details fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get seller details error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch seller details', 500);
  }
};

const approveSeller = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('sellers')
      .update({ status: 'approved', is_verified: true })
      .eq('id', id);

    if (error) {
      console.error('Approve seller error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to approve seller', 500);
    }

    return successResponse(
      res,
      { id, status: 'approved', isVerified: true },
      'Seller approved successfully',
      200
    );
  } catch (error) {
    console.error('Approve seller error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to approve seller', 500);
  }
};

const rejectSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
      .from('sellers')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      console.error('Reject seller error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to reject seller', 500);
    }

    return successResponse(
      res,
      { id, status: 'rejected' },
      'Seller rejected',
      200
    );
  } catch (error) {
    console.error('Reject seller error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to reject seller', 500);
  }
};

const getAllProperties = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('properties')
      .select(
        `
        *,
        sellers!inner(id, name)
      `,
        { count: 'exact' }
      );

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: properties, error, count } = await query;

    if (error) {
      console.error('Properties fetch error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch properties', 500);
    }

    const formattedProperties = properties.map(prop => ({
      id: prop.id,
      title: prop.title,
      type: prop.property_type,
      price: prop.price,
      location: {
        city: prop.city,
        state: prop.state
      },
      sellerId: prop.sellers.id,
      sellerName: prop.sellers.name,
      status: prop.status,
      isVerified: prop.is_verified,
      views: prop.views,
      inquiries: prop.inquiries_count,
      reportCount: prop.report_count,
      createdAt: prop.created_at
    }));

    return successResponse(
      res,
      {
        properties: formattedProperties,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      'Properties fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get all properties error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch properties', 500);
  }
};

const getPropertyDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !property) {
      return errorResponse(res, 'NOT_FOUND', 'Property not found', 404);
    }

    return successResponse(
      res,
      {
        id: property.id,
        title: property.title,
        description: property.description,
        type: property.property_type,
        price: property.price,
        status: property.status
      },
      'Property details fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get property details error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch property details', 500);
  }
};

const updatePropertyAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedUpdates = {
      title: updates.title,
      description: updates.description
    };

    Object.keys(allowedUpdates).forEach(
      key => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    const { data: property, error } = await supabase
      .from('properties')
      .update(allowedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Property update error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to update property', 500);
    }

    return successResponse(
      res,
      {
        id: property.id,
        title: property.title
      },
      'Property updated successfully',
      200
    );
  } catch (error) {
    console.error('Update property admin error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to update property', 500);
  }
};

const approveProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('properties')
      .update({ status: 'approved', is_verified: true })
      .eq('id', id);

    if (error) {
      console.error('Approve property error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to approve property', 500);
    }

    return successResponse(
      res,
      { id, status: 'approved', isVerified: true },
      'Property approved successfully',
      200
    );
  } catch (error) {
    console.error('Approve property error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to approve property', 500);
  }
};

const rejectProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
      .from('properties')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      console.error('Reject property error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to reject property', 500);
    }

    return successResponse(
      res,
      { id, status: 'rejected' },
      'Property rejected',
      200
    );
  } catch (error) {
    console.error('Reject property error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to reject property', 500);
  }
};

const suspendProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
      .from('properties')
      .update({ status: 'suspended' })
      .eq('id', id);

    if (error) {
      console.error('Suspend property error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to suspend property', 500);
    }

    return successResponse(
      res,
      { id, status: 'suspended' },
      'Property suspended',
      200
    );
  } catch (error) {
    console.error('Suspend property error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to suspend property', 500);
  }
};

const getAllReports = async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = supabase.from('property_reports').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`property_title.ilike.%${search}%,reporter_name.ilike.%${search}%`);
    }

    const { data: reports, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) {
      console.error('Reports fetch error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch reports', 500);
    }

    const formattedReports = reports.map(report => ({
      id: report.id,
      propertyId: report.property_id,
      propertyTitle: report.property_title,
      reporterId: report.reporter_id,
      reporterName: report.reporter_name,
      reason: report.reason,
      description: report.description,
      status: report.status,
      adminNotes: report.admin_notes,
      createdAt: report.created_at,
      updatedAt: report.updated_at
    }));

    return successResponse(
      res,
      formattedReports,
      'Reports fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get all reports error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch reports', 500);
  }
};

const takeReportAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, suspendProperty } = req.body;

    const { data: report } = await supabase
      .from('property_reports')
      .select('property_id')
      .eq('id', id)
      .maybeSingle();

    if (!report) {
      return errorResponse(res, 'NOT_FOUND', 'Report not found', 404);
    }

    const { error } = await supabase
      .from('property_reports')
      .update({
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Report action error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to update report', 500);
    }

    if (suspendProperty) {
      await supabase
        .from('properties')
        .update({ status: 'suspended' })
        .eq('id', report.property_id);
    }

    return successResponse(
      res,
      { id, status },
      'Report updated successfully',
      200
    );
  } catch (error) {
    console.error('Take report action error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to update report', 500);
  }
};

const getUserActivities = async (req, res) => {
  try {
    const { search, action, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase.from('user_activities').select('*', { count: 'exact' });

    if (action) {
      query = query.eq('action', action);
    }

    if (search) {
      query = query.or(
        `user_name.ilike.%${search}%,user_email.ilike.%${search}%,property_title.ilike.%${search}%`
      );
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: activities, error, count } = await query;

    if (error) {
      console.error('Activities fetch error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch activities', 500);
    }

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      userId: activity.user_id,
      userName: activity.user_name,
      userEmail: activity.user_email,
      action: activity.action,
      details: activity.details,
      propertyId: activity.property_id,
      propertyTitle: activity.property_title,
      ipAddress: activity.ip_address,
      createdAt: activity.created_at
    }));

    return successResponse(
      res,
      {
        activities: formattedActivities,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      'Activities fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get user activities error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch activities', 500);
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  getUserDetails,
  banUser,
  deleteUser,
  getAllSellers,
  getSellerDetails,
  approveSeller,
  rejectSeller,
  getAllProperties,
  getPropertyDetails,
  updatePropertyAdmin,
  approveProperty,
  rejectProperty,
  suspendProperty,
  getAllReports,
  takeReportAction,
  getUserActivities
};
