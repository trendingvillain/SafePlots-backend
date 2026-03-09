const supabase = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const createReport = async (req, res) => {
  try {
    const { propertyId, reason, description } = req.body;
    const userId = req.user.id;

    const { data: property } = await supabase
      .from('properties')
      .select('id, title')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property) {
      return errorResponse(res, 'NOT_FOUND', 'Property not found', 404);
    }

    const { error } = await supabase.from('property_reports').insert({
      property_id: propertyId,
      property_title: property.title,
      reporter_id: userId,
      reporter_name: req.user.name,
      reason,
      description,
      status: 'pending'
    });

    if (error) {
      console.error('Report creation error:', error);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to create report', 500);
    }

    await supabase.raw(`
      UPDATE properties
      SET report_count = report_count + 1
      WHERE id = '${propertyId}'
    `);

    await supabase.from('user_activities').insert({
      user_id: userId,
      user_name: req.user.name,
      user_email: req.user.email,
      action: 'report_property',
      property_id: propertyId,
      property_title: property.title,
      details: `Reported property for: ${reason}`
    });

    return successResponse(res, null, 'Report submitted successfully', 201);
  } catch (error) {
    console.error('Create report error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to create report', 500);
  }
};

const getReports = async (req, res) => {
  try {
    const { status, search } = req.query;

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
    console.error('Get reports error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to fetch reports', 500);
  }
};

const updateReport = async (req, res) => {
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
      console.error('Report update error:', error);
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
    console.error('Update report error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to update report', 500);
  }
};

module.exports = {
  createReport,
  getReports,
  updateReport
};
