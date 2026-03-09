const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const registerSeller = async (req, res) => {
  try {
    const { name, phone, id_proof_type, id_proof_url } = req.body;
    const userId = req.user.id;

    // Remove "safeplots" from URL
    const cleanIdProofUrl = id_proof_url
      ? id_proof_url.replace('/safeplots/', '/')
      : null;

    // Check if seller already exists
    const { data: existingSeller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSeller) {
      return errorResponse(
        res,
        'SELLER_EXISTS',
        'Seller account already exists',
        400
      );
    }

    // Get user email
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    // Insert seller
    const { data: seller, error } = await supabase
      .from('sellers')
      .insert({
        user_id: userId,
        name,
        email: user.email,
        phone,
        id_proof_type,
        id_proof_url: cleanIdProofUrl, // cleaned URL
        status: 'pending',
        is_verified: false
      })
      .select()
      .single();

    if (error) {
      console.error('Seller registration error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to register seller',
        500
      );
    }

    // Update role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      await supabase
        .from('user_roles')
        .update({ role: 'seller' })
        .eq('id', existingRole.id);
    } else {
      await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'seller' });
    }

    return successResponse(
      res,
      {
        id: seller.id,
        userId: seller.user_id,
        name: seller.name,
        status: seller.status
      },
      'Seller registration submitted for verification',
      201
    );

  } catch (error) {
    console.error('Register seller error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to register seller',
      500
    );
  }
};

const getSellerProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
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
      'Seller profile fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get seller profile error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch seller profile', 500);
  }
};

const getSellerStats = async (req, res) => {
  try {
    const sellerId = req.seller.id;

    const { data: properties } = await supabase
      .from('properties')
      .select('status')
      .eq('seller_id', sellerId);

    const stats = {
      totalProperties: properties.length,
      liveProperties: properties.filter(p => p.status === 'approved').length,
      pendingProperties: properties.filter(p => p.status === 'pending').length,
      soldProperties: properties.filter(p => p.status === 'sold').length
    };

    const { count: inquiriesCount } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);

    const { count: newInquiriesCount } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'new');

    const { data: viewsData } = await supabase
      .from('properties')
      .select('views')
      .eq('seller_id', sellerId);

    const totalViews = viewsData.reduce((sum, prop) => sum + (prop.views || 0), 0);

    return successResponse(
      res,
      {
        ...stats,
        totalInquiries: inquiriesCount || 0,
        newInquiries: newInquiriesCount || 0,
        totalViews
      },
      'Seller stats fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get seller stats error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch seller stats', 500);
  }
};

const getSellerProperties = async (req, res) => {
  try {
    const sellerId = req.seller.id;

    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Seller properties fetch error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to fetch seller properties',
        500
      );
    }

    const formattedProperties = properties.map(prop => ({
      id: prop.id,
      title: prop.title,
      description: prop.description,
      type: prop.property_type,
      price: prop.price,
      area: prop.area,
      areaUnit: prop.area_unit,
      location: {
        address: prop.address,
        city: prop.city,
        state: prop.state,
        pincode: prop.pincode
      },
      images: prop.images || [],
      status: prop.status,
      isVerified: prop.is_verified,
      views: prop.views,
      inquiries: prop.inquiries_count,
      createdAt: prop.created_at
    }));

    return successResponse(
      res,
      formattedProperties,
      'Seller properties fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get seller properties error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to fetch seller properties',
      500
    );
  }
};

const getSellerInquiries = async (req, res) => {
  try {
    const sellerId = req.seller.id;

    const { data: inquiries, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Seller inquiries fetch error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to fetch seller inquiries',
        500
      );
    }

    const formattedInquiries = inquiries.map(inq => ({
      id: inq.id,
      propertyId: inq.property_id,
      propertyTitle: inq.property_title,
      buyerId: inq.buyer_id,
      buyerName: inq.buyer_name,
      buyerEmail: inq.buyer_email,
      buyerPhone: inq.buyer_phone,
      sellerId: inq.seller_id,
      message: inq.message,
      status: inq.status,
      createdAt: inq.created_at
    }));

    return successResponse(
      res,
      formattedInquiries,
      'Seller inquiries fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get seller inquiries error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to fetch seller inquiries',
      500
    );
  }
};

const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const sellerId = req.seller.id;

    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('seller_id')
      .eq('id', id)
      .maybeSingle();

    if (!inquiry) {
      return errorResponse(res, 'NOT_FOUND', 'Inquiry not found', 404);
    }

    if (inquiry.seller_id !== sellerId) {
      return errorResponse(res, 'FORBIDDEN', 'Unauthorized access', 403);
    }

    const { error } = await supabase
      .from('inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Inquiry status update error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to update inquiry status',
        500
      );
    }

    return successResponse(
      res,
      { id, status },
      'Inquiry status updated',
      200
    );
  } catch (error) {
    console.error('Update inquiry status error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to update inquiry status',
      500
    );
  }
};

module.exports = {
  registerSeller,
  getSellerProfile,
  getSellerStats,
  getSellerProperties,
  getSellerInquiries,
  updateInquiryStatus
};
