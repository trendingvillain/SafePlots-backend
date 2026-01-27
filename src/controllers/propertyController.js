const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');


const getProperties = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = 'newest',
      state,
      city,
      type,
      minPrice,
      maxPrice,
      status = 'approved',
      // ADDED THESE THREE:
      title,
      pincode,
      address
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('properties')
      .select(
        `
        *,
        sellers!inner(id, name, phone, email)
      `,
        { count: 'exact' }
      )
      .eq('status', status);

    // Existing filters
    if (state) query = query.eq('state', state);
    if (city) query = query.ilike('city', `%${city}%`);
    if (type) query = query.eq('property_type', type);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);

    // NEW FILTERS ADDED HERE:
    
    // 1. Title Search (Partial Match - Case Insensitive)
    if (title) query = query.ilike('title', `%${title}%`);

    // 2. Address Search (Partial Match - Case Insensitive)
    if (address) query = query.ilike('address', `%${address}%`);

    // 3. Pincode Search (Exact Match)
    if (pincode) query = query.eq('pincode', pincode);

    // Sorting logic...
    switch (sort) {
      case 'price-low':
        query = query.order('price', { ascending: true });
        break;
      case 'price-high':
        query = query.order('price', { ascending: false });
        break;
      case 'popular':
        query = query.order('views', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: properties, error, count } = await query;

    if (error) {
      console.error('Properties fetch error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch properties', 500);
    }

    // ... formatting logic remains the same ...
    const formattedProperties = properties.map(prop => ({
       id: prop.id,
      title: prop.title,
      description: prop.description,
      type: prop.property_type,
      price: prop.price,
      priceOnRequest: prop.price_on_request,
      area: prop.area,
      areaUnit: prop.area_unit,
       location: {
         address: prop.address,
         city: prop.city,
         state: prop.state,
         pincode: prop.pincode
       },
       images: prop.images || [],
      sellerId: prop.sellers.id,
      sellerName: prop.sellers.name,
      sellerPhone: prop.sellers.phone,
      status: prop.status,
      isVerified: prop.is_verified,
      views: prop.views,
      inquiries: prop.inquiries_count,
      createdAt: prop.created_at,
      updatedAt: prop.updated_at
    }));

    return successResponse(
      res,
      {
        items: formattedProperties,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      'Properties fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get properties error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch properties', 500);
  }
};

const getFeaturedProperties = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const { data: properties, error } = await supabase
      .from('properties')
      .select(
        `
        *,
        sellers!inner(id, name, phone, email)
      `
      )
      .eq('status', 'approved')
      .eq('is_verified', true)
      .order('views', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Featured properties fetch error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to fetch featured properties',
        500
      );
    }

    const formattedProperties = properties.map(prop => ({
      id: prop.id,
      title: prop.title,
      description: prop.description,
      type: prop.property_type,
      price: prop.price,
      priceOnRequest: prop.price_on_request,
      area: prop.area,
      areaUnit: prop.area_unit,
      location: {
        address: prop.address,
        city: prop.city,
        state: prop.state,
        pincode: prop.pincode
      },
      images: prop.images || [],
      sellerId: prop.sellers.id,
      sellerName: prop.sellers.name,
      sellerPhone: prop.sellers.phone,
      status: prop.status,
      isVerified: prop.is_verified,
      views: prop.views,
      inquiries: prop.inquiries_count,
      createdAt: prop.created_at,
      updatedAt: prop.updated_at
    }));

    return successResponse(
      res,
      formattedProperties,
      'Featured properties fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get featured properties error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to fetch featured properties',
      500
    );
  }
};

const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: property, error } = await supabase
      .from('properties')
      .select(
        `
        *,
        sellers!inner(id, name, phone, email)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error || !property) {
      return errorResponse(res, 'NOT_FOUND', 'Property not found', 404);
    }

    const formattedProperty = {
      id: property.id,
      title: property.title,
      description: property.description,
      type: property.property_type,
      price: property.price,
      priceOnRequest: property.price_on_request,
      area: property.area,
      areaUnit: property.area_unit,
      location: {
        address: property.address,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        coordinates: property.latitude && property.longitude
          ? { lat: property.latitude, lng: property.longitude }
          : null
      },
      images: property.images || [],
      video: property.video_url,
      amenities: property.amenities || [],
      features: property.features || [],
      sellerId: property.sellers.id,
      sellerName: property.sellers.name,
      sellerPhone: property.sellers.phone,
      status: property.status,
      isVerified: property.is_verified,
      views: property.views,
      inquiries: property.inquiries_count,
      reportCount: property.report_count,
      createdAt: property.created_at,
      updatedAt: property.updated_at
    };

    return successResponse(
      res,
      formattedProperty,
      'Property fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get property by ID error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch property', 500);
  }
};
const trackPropertyView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const { data: property } = await supabase
      .from('properties')
      .select('id, title, images, price, city, state, views')
      .eq('id', id)
      .maybeSingle();

    if (!property) {
      return successResponse(res, null, 'View recorded', 200);
    }

    // Increment main property views
    await supabase
      .from('properties')
      .update({ views: (property.views || 0) + 1 })
      .eq('id', id);

    if (userId) {
      // Check existing view
      const { data: existingView } = await supabase
        .from('property_views')
        .select('id, view_count')
        .eq('user_id', userId)
        .eq('property_id', property.id)
        .maybeSingle();

      if (existingView) {
        // Already exists: update timestamp + count
        await supabase
          .from('property_views')
          .update({
            view_count: (existingView.view_count || 0) + 1,
            last_viewed_at: new Date(), // timestamp update
          })
          .eq('id', existingView.id);
      } else {
        // Insert new row
        await supabase.from('property_views').insert({
          user_id: userId,
          property_id: property.id,
          property_title: property.title,
          property_image: property.images?.[0] || null,
          property_price: property.price,
          property_location: `${property.city}, ${property.state}`,
          view_count: 1,
          last_viewed_at: new Date(),
        });
      }

      // Log activity only once per view is optional — your choice
      await supabase.from('user_activities').insert({
        user_id: userId,
        user_name: req.user.name,
        user_email: req.user.email,
        action: 'view_property',
        property_id: property.id,
        property_title: property.title,
        details: 'Viewed property details'
      });
    }

    return successResponse(res, null, 'View recorded', 200);
  } catch (error) {
    console.error('Track property view error:', error);
    return successResponse(res, null, 'View recorded', 200);
  }
};


const createProperty = async (req, res) => {
  try {
    // 1. Destructure exactly what the frontend sends
    const {
      title,
      description,
      type,
      price,
      priceOnRequest = false,
      area,
      areaUnit,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      amenities = [],
      features = [],
      images = [], // These are the Firebase URLs from your frontend
      video       // This is the single video URL from Firebase
    } = req.body;

    const sellerId = req.seller.id;

    // 2. Default Image Logic
    const DEFAULT_PROPERTY_IMAGES = {
      plot: "https://is1-2.housingcdn.com/01c16c28/e869cb6437a2a0645bec70ee2cdb0cd9/v0/medium/residential_plot-for-sale-retteri_lake-Chennai-plot_view.jpg",
      house: "https://static.vecteezy.com/system/resources/previews/023/309/311/non_2x/ai-generative-exterior-of-modern-luxury-house-with-garden-and-beautiful-sky-photo.jpg",
      flat: "https://thumbs.dreamstime.com/b/below-shot-modern-new-apartment-building-photo-tall-block-flats-against-blue-sky-95469261.jpg",
      villa: "https://www.marbella-hills-homes.com/cms/wp-content/uploads/2018/04/mh2940_2_villa-at-night.jpg",
      farmland: "https://images.rawpixel.com/image_1000/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA4L3Jhd3BpeGVsX29mZmljZV8xMF9hX3Bob3RvX29mX2Zhcm1sYW5kX2JhY2tncm91bmRfbmF0dXJhbF9saWdodF9jYjQ5Njk4Yy1hNjc4LTRjMjMtYjFkNC1iYzMxNjRjOGE5MzRfMS5qcGc.jpg",
      default: "https://cdn.example.com/defaults/default.jpg"
    };

    // If frontend sends empty images array, use the default for that type
    const finalImages = images && images.length > 0 
      ? images 
      : [DEFAULT_PROPERTY_IMAGES[type] || DEFAULT_PROPERTY_IMAGES.default];

    // 3. Insert into Supabase
    const { data: property, error: insertError } = await supabase
      .from('properties')
      .insert({
        seller_id: sellerId,
        title,
        description,
        property_type: type,
        price: priceOnRequest ? 0 : Number(price),
        price_on_request: priceOnRequest,
        area: Number(area),
        area_unit: areaUnit,
        address,
        city,
        state,
        pincode,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        amenities,
        features,
        images: finalImages, // Saving the array of URLs
        video_url: video,    // Saving the video URL
        status: 'pending',
        is_verified: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to save property to database', 500);
    }

    // 4. Update Seller Stats (Corrected: supabase.raw does not exist)
    // We use a simple update here. For accuracy in high-traffic apps, 
    // use a Postgres Function (RPC).
    await supabase.rpc('increment_seller_stats', { seller_uuid: sellerId });

    return successResponse(
      res,
      {
        id: property.id,
        title: property.title,
        status: property.status,
        imageCount: finalImages.length,
        createdAt: property.created_at
      },
      'Property submitted for approval successfully',
      201
    );

  } catch (error) {
    console.error('Create property controller crash:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Internal server error', 500);
  }
};


const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    const { data: property } = await supabase
      .from('properties')
      .select('seller_id, sellers!inner(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (!property) {
      return errorResponse(res, 'NOT_FOUND', 'Property not found', 404);
    }

    if (!isAdmin && property.sellers.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Unauthorized access', 403);
    }

    const allowedUpdates = {
      title: updates.title,
      description: updates.description,
      property_type: updates.type,
      price: updates.price,
      price_on_request: updates.priceOnRequest,
      area: updates.area,
      area_unit: updates.areaUnit,
      address: updates.address,
      city: updates.city,
      state: updates.state,
      pincode: updates.pincode,
      latitude: updates.latitude,
      longitude: updates.longitude,
      amenities: updates.amenities,
      features: updates.features,
      images: updates.images,
      video_url: updates.video
    };

    Object.keys(allowedUpdates).forEach(
      key => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    if (!isAdmin) {
      allowedUpdates.status = 'pending';
    }

    const { data: updatedProperty, error } = await supabase
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
        id: updatedProperty.id,
        title: updatedProperty.title,
        status: updatedProperty.status,
        updatedAt: updatedProperty.updated_at
      },
      'Property updated successfully',
      200
    );
  } catch (error) {
    console.error('Update property error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to update property', 500);
  }
};

const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const { data: property } = await supabase
      .from('properties')
      .select('seller_id, sellers!inner(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (!property) {
      return errorResponse(res, 'NOT_FOUND', 'Property not found', 404);
    }

    if (property.sellers.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Unauthorized access', 403);
    }

    if (status !== 'sold') {
      return errorResponse(res, 'VALIDATION_ERROR', 'Invalid status', 400);
    }

    const { error } = await supabase
      .from('properties')
      .update({ status: 'sold' })
      .eq('id', id);

    if (error) {
      console.error('Property status update error:', error);
      return errorResponse(
        res,
        'SERVER_ERROR',
        'Failed to update property status',
        500
      );
    }

    await supabase
  .from('sellers')
  .update({ total_sold: supabase.rpc('increment_sold', { seller_id: property.seller_id }) })


    return successResponse(
      res,
      { id, status: 'sold' },
      'Property status updated',
      200
    );
  } catch (error) {
    console.error('Update property status error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to update property status',
      500
    );
  }
};

const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles.includes('admin');

    const { data: property } = await supabase
      .from('properties')
      .select('seller_id, sellers!inner(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (!property) {
      return errorResponse(res, 'NOT_FOUND', 'Property not found', 404);
    }

    if (!isAdmin && property.sellers.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Unauthorized access', 403);
    }

    const { error } = await supabase.from('properties').delete().eq('id', id);

    if (error) {
      console.error('Property deletion error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to delete property', 500);
    }

    return successResponse(res, null, 'Property deleted successfully', 200);
  } catch (error) {
    console.error('Delete property error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to delete property', 500);
  }
};

const getPropertiesBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!sellerId) {
      return errorResponse(
        res,
        'VALIDATION_ERROR',
        'Seller ID is required',
        400
      );
    }

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
      type: prop.property_type,
      price: prop.price,
      status: prop.status,
      isVerified: prop.is_verified
    }));

    return successResponse(
      res,
      formattedProperties,
      'Seller properties fetched successfully',
      200
    );
  } catch (error) {
    console.error('Get properties by seller error:', error);
    return errorResponse(
      res,
      'SERVER_ERROR',
      'Failed to fetch seller properties',
      500
    );
  }
};


module.exports = {
  getProperties,
  getFeaturedProperties,
  getPropertyById,
  trackPropertyView,
  createProperty,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
  getPropertiesBySeller
};
