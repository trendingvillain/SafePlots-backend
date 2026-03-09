const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const sendInquiry = async (req, res) => {
  try {
    const { propertyId, message } = req.body;
    const userId = req.user.id;

    const { data: property } = await supabase
      .from('properties')
      .select('id, title, seller_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property) {
      return errorResponse(res, 'NOT_FOUND', 'Property not found', 404);
    }

    const { data: inquiry, error } = await supabase
      .from('inquiries')
      .insert({
        property_id: propertyId,
        property_title: property.title,
        buyer_id: userId,
        buyer_name: req.user.name,
        buyer_email: req.user.email,
        buyer_phone: req.user.phone,
        seller_id: property.seller_id,
        message,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Inquiry creation error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to send inquiry', 500);
    }

    await supabase.raw(`
      UPDATE properties
      SET inquiries_count = inquiries_count + 1
      WHERE id = '${propertyId}'
    `);

    await supabase.from('user_activities').insert({
      user_id: userId,
      user_name: req.user.name,
      user_email: req.user.email,
      action: 'send_inquiry',
      property_id: propertyId,
      property_title: property.title,
      details: 'Sent inquiry for property'
    });

    return successResponse(res, null, 'Inquiry sent successfully', 201);
  } catch (error) {
    console.error('Send inquiry error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to send inquiry', 500);
  }
};

const getInquiries = async (req, res) => {
  try {
    const userId = req.user.id;
    const isSeller = req.user.roles.includes('seller');

    let query = supabase.from('inquiries').select('*');

    if (isSeller) {
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!seller) {
        return errorResponse(res, 'NOT_FOUND', 'Seller not found', 404);
      }

      query = query.eq('seller_id', seller.id);
    } else {
      query = query.eq('buyer_id', userId);
    }

    const { data: inquiries, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) {
      console.error('Inquiries fetch error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch inquiries', 500);
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
    console.error('Get inquiries error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch inquiries', 500);
  }
};

const updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('seller_id, sellers!inner(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (!inquiry) {
      return errorResponse(res, 'NOT_FOUND', 'Inquiry not found', 404);
    }

    if (inquiry.sellers.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Unauthorized access', 403);
    }

    const { error } = await supabase
      .from('inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Inquiry update error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to update inquiry', 500);
    }

    return successResponse(
      res,
      { id, status },
      'Inquiry status updated',
      200
    );
  } catch (error) {
    console.error('Update inquiry error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to update inquiry', 500);
  }
};

module.exports = {
  sendInquiry,
  getInquiries,
  updateInquiry
};
