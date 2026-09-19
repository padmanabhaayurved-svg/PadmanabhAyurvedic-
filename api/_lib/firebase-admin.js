const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    // Expected env var: FIREBASE_SERVICE_ACCOUNT (JSON string)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase Admin] Initialized successfully.');
  } catch (error) {
    console.error('[Firebase Admin] Initialization failed:', error.message);
  }
}

/**
 * Middleware to verify a Firebase ID Token.
 * Returns the decoded token if valid, throws error if not.
 */
async function verifyIdToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid Authorization header');
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Unauthorized: Invalid token');
  }
}

/**
 * Middleware to verify token AND ensure the user is the Admin
 */
async function verifyAdmin(req) {
  const decodedToken = await verifyIdToken(req);
  if (decodedToken.email !== 'padmanabhaayurved@gmail.com') {
    throw new Error('Forbidden: Admin access required');
  }
  return decodedToken;
}

module.exports = {
  admin,
  verifyIdToken,
  verifyAdmin
};
