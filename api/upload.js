const { v2: cloudinary } = require('cloudinary');
const { IncomingForm } = require('formidable');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Disable Vercel's default body parser so formidable can parse the multipart data
export const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const data = await new Promise((resolve, reject) => {
      const form = new IncomingForm({ keepExtensions: true });
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const file = data.files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filepath = Array.isArray(file) ? file[0].filepath : file.filepath;

    const result = await cloudinary.uploader.upload(filepath, {
      folder: 'padmanabh'
    });

    return res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to upload image" });
  }
}
