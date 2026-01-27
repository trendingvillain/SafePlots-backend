const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, avatar_url, status, email_verified, created_at, last_login_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return errorResponse(res, 'NOT_FOUND', 'User not found', 404);
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const userRoles = roles ? roles.map(r => r.role) : ['user'];

    return successResponse(
      res,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar_url,
        role: userRoles[0] || 'user',
        status: user.status,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      },
      'Profile fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch profile', 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, avatar } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar_url = avatar;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, name, phone, avatar_url')
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to update profile', 500);
    }

    return successResponse(
      res,
      {
        id: user.id,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar_url
      },
      'Profile updated successfully',
      200
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to update profile', 500);
  }
};

const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const { count: savedCount } = await supabase
      .from('saved_properties')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: inquiriesCount } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId);

    const { count: viewedCount } = await supabase
      .from('property_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return successResponse(
      res,
      {
        savedProperties: savedCount || 0,
        sentInquiries: inquiriesCount || 0,
        viewedProperties: viewedCount || 0
      },
      'Stats fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get stats error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch stats', 500);
  }
};

const getSavedProperties = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: savedProperties, error } = await supabase
      .from('saved_properties')
      .select(
        `
        property_id,
        properties (
          id,
          title,
          description,
          property_type,
          price,
          price_on_request,
          area,
          area_unit,
          address,
          city,
          state,
          pincode,
          images,
          status,
          is_verified,
          created_at,
          sellers!inner(id, name)
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Saved properties fetch error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to fetch saved properties',
        500
      );
    }

    const formattedProperties = savedProperties
      .filter(sp => sp.properties)
      .map(sp => ({
        id: sp.properties.id,
        title: sp.properties.title,
        description: sp.properties.description,
        type: sp.properties.property_type,
        price: sp.properties.price,
        priceOnRequest: sp.properties.price_on_request,
        area: sp.properties.area,
        areaUnit: sp.properties.area_unit,
        location: {
          address: sp.properties.address,
          city: sp.properties.city,
          state: sp.properties.state,
          pincode: sp.properties.pincode
        },
        images: sp.properties.images || [],
        sellerId: sp.properties.sellers.id,
        sellerName: sp.properties.sellers.name,
        status: sp.properties.status,
        isVerified: sp.properties.is_verified,
        createdAt: sp.properties.created_at
      }));

    return successResponse(
      res,
      formattedProperties,
      'Saved properties fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get saved properties error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to fetch saved properties',
      500
    );
  }
};

const saveProperty = async (req, res) => {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property) {
      return errorResponse(res, 'NOT_FOUND', 'Property not found', 404);
    }

    const { data: existing } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (existing) {
      return successResponse(res, null, 'Property already saved', 200);
    }

    const { error } = await supabase.from('saved_properties').insert({
      user_id: userId,
      property_id: propertyId
    });

    if (error) {
      console.error('Save property error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to save property', 500);
    }

    await supabase.from('user_activities').insert({
      user_id: userId,
      user_name: req.user.name,
      user_email: req.user.email,
      action: 'save_property',
      property_id: propertyId,
      details: 'Saved property'
    });

    return successResponse(res, null, 'Property saved successfully', 201);
  } catch (error) {
    console.error('Save property error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to save property', 500);
  }
};

const unsaveProperty = async (req, res) => {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    const { error } = await supabase
      .from('saved_properties')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) {
      console.error('Unsave property error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to unsave property', 500);
    }

    return successResponse(res, null, 'Property removed from saved', 200);
  } catch (error) {
    console.error('Unsave property error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to unsave property', 500);
  }
};

const getViewedProperties = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: viewedProperties, error } = await supabase
      .from('property_views')
      .select('*')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Viewed properties fetch error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to fetch viewed properties',
        500
      );
    }

    const formattedProperties = viewedProperties.map(view => ({
      id: view.id,
      userId: view.user_id,
      propertyId: view.property_id,
      propertyTitle: view.property_title,
      propertyImage: view.property_image,
      propertyPrice: view.property_price,
      propertyLocation: view.property_location,
      viewedAt: view.viewed_at
    }));

    return successResponse(
      res,
      formattedProperties,
      'Viewed properties fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get viewed properties error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to fetch viewed properties',
      500
    );
  }
};

const getUserInquiries = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: inquiries, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('User inquiries fetch error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to fetch inquiries',
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
      'Inquiries fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get user inquiries error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch inquiries', 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getStats,
  getSavedProperties,
  saveProperty,
  unsaveProperty,
  getViewedProperties,
  getUserInquiries
};
