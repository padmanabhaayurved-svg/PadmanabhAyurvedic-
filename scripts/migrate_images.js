const admin = require('firebase-admin');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config({ path: '.env.production.local' });

const CLOUD_NAME = 'ybzj1wn7';
const API_KEY = '255492243228976';
const API_SECRET = 'ANgf1NPDigcb8d0snA-sknvRUQY';
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/image/upload';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function uploadToCloudinary(buffer) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  form.append('upload_preset', 'padmanabh_store');

  const res = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: form
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Cloudinary error: ' + err);
  }
  const data = await res.json();
  return data.secure_url;
}

function convertGDriveUrl(url) {
  if (!url) return '';
  if (url.includes('drive.google.com/thumbnail')) return url.replace(/&sz=\w*\d+/, '') + '&sz=w1000';
  if (url.includes('drive.usercontent.google.com/download')) return url;

  let match = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1000';
  match = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match) return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1000';
  return url;
}

async function migrateImages() {
  const snapshot = await db.collection('products').get();
  console.log('Found ' + snapshot.size + ' products.');
  
  for (const doc of snapshot.docs) {
    const p = doc.data();
    if (!p.images || !Array.isArray(p.images)) continue;
    
    let updated = false;
    let newImages = [];
    
    for (let i = 0; i < p.images.length; i++) {
      let url = p.images[i];
      if (url.includes('drive.google') || url.includes('googleusercontent')) {
        console.log('Migrating image for product: ' + p.name);
        try {
          const fetchUrl = convertGDriveUrl(url);
          console.log('  Downloading: ' + fetchUrl);
          const imgRes = await fetch(fetchUrl);
          if (!imgRes.ok) throw new Error('Failed to download image ' + imgRes.status);
          const buffer = await imgRes.buffer();
          
          console.log('  Uploading to Cloudinary...');
          const cloudUrl = await uploadToCloudinary(buffer);
          console.log('  Success: ' + cloudUrl);
          newImages.push(cloudUrl);
          updated = true;
        } catch (e) {
          console.error('  Error migrating ' + url + ':', e.message);
          newImages.push(url); // keep original on failure
        }
      } else {
        newImages.push(url);
      }
    }
    
    if (updated) {
      await doc.ref.update({ images: newImages });
      console.log('[UPDATED] ' + p.name + ' saved in Firestore.');
    }
  }
  console.log('Migration complete.');
}

migrateImages().catch(console.error).finally(() => process.exit(0));
