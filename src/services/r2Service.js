const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  },
  forcePathStyle: true
});

const uploadToR2 = async (file, key) => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  });

  await r2.send(command);

  return `${process.env.R2_PUBLIC_URL}/${process.env.R2_BUCKET}/${key}`;
};

module.exports = { uploadToR2 };