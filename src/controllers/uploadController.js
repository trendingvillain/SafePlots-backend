const { uploadToR2 } = require("../services/r2Service");


const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const path = req.body.path;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const key = path || `uploads/${Date.now()}-${file.originalname}`;

    const url = await uploadToR2(file, key);

    res.json({
      success: true,
      url
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Upload failed"
    });
  }
};

module.exports = { uploadFile };