const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getOTPExpiry = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 10);
  return now.toISOString();
};

module.exports = {
  generateOTP,
  getOTPExpiry
};
