const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { sendOTPEmail } = require('../utils/email');
const { generateOTP, getOTPExpiry } = require('../utils/otp');
const { successResponse, errorResponse } = require('../utils/response');

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return errorResponse(
        res,
        'EMAIL_EXISTS',
        'An account with this email already exists',
        400
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        password_hash: hashedPassword,
        status: 'active',
        email_verified: false
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to create user', 500);
    }

    await supabase.from('user_roles').insert({
      user_id: user.id,
      role: 'user'
    });

    // INSERT only during registration
    const otp = generateOTP();
    const expiresAt = getOTPExpiry();

    await supabase.from('otp_verifications').insert({
      email,
      otp_code: otp,
      purpose: 'registration',
      expires_at: expiresAt,
      is_used: false
    });

    await sendOTPEmail(email, otp, 'registration');

    return successResponse(
      res,
      {
        requiresOtp: true,
        email
      },
      'Registration successful. Please verify your email.',
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Registration failed', 500);
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const { data: otpRecord } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('is_used', false)
      .maybeSingle();

    if (!otpRecord) {
      return errorResponse(res, 'INVALID_OTP', 'Invalid or expired OTP', 400);
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return errorResponse(res, 'INVALID_OTP', 'OTP has expired', 400);
    }

    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        last_login_at: new Date().toISOString()
      })
      .eq('email', email)
      .select('id, name, email, phone, avatar_url, status')
      .single();

    if (updateError || !user) {
      return errorResponse(res, 'SERVER_ERROR', 'Failed to verify email', 500);
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles ? roles.map(r => r.role) : ['user'];

    const token = generateToken({ userId: user.id, email: user.email });

    await supabase.from('user_activities').insert({
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      action: 'register',
      details: 'User registered and verified email'
    });

    return successResponse(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar_url,
          role: userRoles[0] || 'user',
          status: user.status
        },
        token
      },
      'Email verified successfully',
      200
    );
  } catch (error) {
    console.error('OTP verification error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Verification failed', 500);
  }
};

const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return errorResponse(res, 'NOT_FOUND', 'User not found', 404);
    }

    // UPDATE existing OTP record instead of INSERT
    const otp = generateOTP();
    const expiresAt = getOTPExpiry();

    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({
        otp_code: otp,
        purpose: 'registration',
        expires_at: expiresAt,
        is_used: false,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError && updateError.code !== 'PGRST116') { // PGRST116 = no rows updated
      console.error('OTP update error:', updateError);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to generate OTP', 500);
    }

    await sendOTPEmail(email, otp, 'registration');

    return successResponse(res, null, 'OTP sent successfully', 200);
  } catch (error) {
    console.error('Send OTP error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to send OTP', 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, phone, avatar_url, password_hash, status, email_verified')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return errorResponse(res, 'INVALID_CREDENTIALS', 'Invalid email', 403);
    }

    if (!user.password_hash) {
      return errorResponse(res, 'INVALID_CREDENTIALS', 'Please use Google login', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return errorResponse(res, 'INVALID_CREDENTIALS', 'Invalid password', 403);
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      return errorResponse(res, 'FORBIDDEN', 'Your account has been suspended', 403);
    }

    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles ? roles.map(r => r.role) : ['user'];
    const primaryRole = userRoles[0] || 'user';

    // Fetch seller verification only if role = seller
    let sellerVerified = null;

    if (primaryRole === 'seller') {
      const { data: seller } = await supabase
        .from('sellers')
        .select('is_verified') // adjust to your column name e.g verified_status
        .eq('user_id', user.id)
        .maybeSingle();

      sellerVerified = seller ? Boolean(seller.is_verified) : false;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    await supabase.from('user_activities').insert({
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      action: 'login',
      details: 'User logged in'
    });

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar_url,
      role: primaryRole,
      status: user.status,
      isVerified: user.email_verified
    };

    return successResponse(
      res,
      { user: userPayload, token },
      'Login successful',
      200
    );

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Login failed', 500);
  }
};


const googleLogin = async (req, res) => {
  try {
    const { email, name, photoURL, uid } = req.body;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name, phone, avatar_url, status')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.status === 'banned' || existingUser.status === 'suspended') {
        return errorResponse(
          res,
          'FORBIDDEN',
          'Your account has been suspended',
          403
        );
      }

      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', existingUser.id);

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.id);

      const userRoles = roles ? roles.map(r => r.role) : ['user'];

      const token = generateToken({
        userId: existingUser.id,
        email: existingUser.email
      });

      await supabase.from('user_activities').insert({
        user_id: existingUser.id,
        user_name: existingUser.name,
        user_email: existingUser.email,
        action: 'login',
        details: 'User logged in with Google'
      });

      return successResponse(
        res,
        {
          user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
            avatar: existingUser.avatar_url,
            role: userRoles[0] || 'user'
          },
          token,
          isNewUser: false
        },
        'Login successful',
        200
      );
    }

    return successResponse(
      res,
      {
        isNewUser: true,
        email,
        name,
        photoURL
      },
      'New user detected',
      200
    );
  } catch (error) {
    console.error('Google login error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Google login failed', 500);
  }
};

const googleRegister = async (req, res) => {
  try {
    const { name, email, phone, firebaseUid } = req.body;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return errorResponse(
        res,
        'EMAIL_EXISTS',
        'An account with this email already exists',
        400
      );
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        status: 'active',
        email_verified: true
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to create user', 500);
    }

    await supabase.from('user_roles').insert({
      user_id: user.id,
      role: 'user'
    });

    const token = generateToken({ userId: user.id, email: user.email });

    await supabase.from('user_activities').insert({
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      action: 'register',
      details: 'User registered with Google'
    });

    return successResponse(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: 'user'
        },
        token
      },
      'Registration successful',
      201
    );
  } catch (error) {
    console.error('Google registration error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Registration failed', 500);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return successResponse(
        res,
        null,
        'Password reset OTP sent to your email',
        200
      );
    }

    // UPDATE existing OTP record instead of INSERT
    const otp = generateOTP();
    const expiresAt = getOTPExpiry();

    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({
        otp_code: otp,
        purpose: 'password_reset',
        expires_at: expiresAt,
        is_used: false,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError && updateError.code !== 'PGRST116') {
      console.error('Password reset OTP update error:', updateError);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to generate OTP', 500);
    }

    await sendOTPEmail(email, otp, 'password_reset');

    return successResponse(
      res,
      null,
      'Password reset OTP sent to your email',
      200
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to process request', 500);
  }
};

const resetPassword = async (req, res) => {
  try {
    // Accept BOTH 'otp' AND 'token' field names from frontend
    let { otp, token, newPassword } = req.body;
    const resetToken = token || otp; // Handle both field names
    
    console.log(`🔍 Reset attempt: Token=${resetToken}, Password=${newPassword}`);

    if (!resetToken || !newPassword) {
      console.log('❌ Missing token or password');
      return errorResponse(res, 'VALIDATION_ERROR', 'Reset token and new password are required', 400);
    }

    const { data: otpRecord } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('otp_code', resetToken)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      console.log('❌ No valid unused OTP found');
      return errorResponse(res, 'INVALID_TOKEN', 'Invalid or already used token', 400);
    }

    // Accept both registration AND password_reset OTPs
    if (otpRecord.purpose !== 'registration' && otpRecord.purpose !== 'password_reset') {
      console.log(`❌ Wrong OTP purpose: ${otpRecord.purpose}`);
      return errorResponse(res, 'INVALID_TOKEN', 'Invalid OTP purpose', 400);
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      console.log('❌ OTP expired:', otpRecord.expires_at);
      return errorResponse(res, 'INVALID_TOKEN', 'Token has expired', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password using email from OTP record
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', otpRecord.email);

    if (userUpdateError) {
      console.error('❌ User update failed:', userUpdateError);
      return errorResponse(res, 'SERVER_ERROR', 'Failed to update password', 500);
    }

    // Mark OTP as used
    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    console.log('✅ Password reset successful for:', otpRecord.email);
    return successResponse(res, null, 'Password reset successfully', 200);
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to reset password', 500);
  }
};




const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (!user.password_hash) {
      return errorResponse(
        res,
        'INVALID_OPERATION',
        'Cannot change password for Google login accounts',
        400
      );
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isPasswordValid) {
      return errorResponse(
        res,
        'INVALID_CREDENTIALS',
        'Current password is incorrect',
        401
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', userId);

    return successResponse(res, null, 'Password changed successfully', 200);
  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Failed to change password', 500);
  }
};

module.exports = {
  register,
  verifyOTP,
  sendOTP,
  login,
  googleLogin,
  googleRegister,
  forgotPassword,
  resetPassword,
  changePassword
};
