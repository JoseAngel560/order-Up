// food-backend/firebaseConfig.ts
import * as admin from 'firebase-admin';

// Inicialización de Firebase Admin SDK
let bucket: any;

try {
  let serviceAccount: any;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Para Render (env var)
    console.log('Cargando desde env var (Render)');
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountString) {
      throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_JSON en env');
    }
    serviceAccount = JSON.parse(serviceAccountString);
    // --- FIX: Reemplaza \\n con \n para PEM válido ---
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    console.log('Service account cargado OK desde env. Project ID:', serviceAccount.project_id);
  } else {
    // Para local (archivo JSON)
    console.log('Cargando desde archivo local');
    serviceAccount = require('./firebase-service-account.json');
    console.log('Service account cargado OK. Project ID:', serviceAccount.project_id);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'joseangel-5dfd2.firebasestorage.app' // Confirma si es .appspot.com
  });

  bucket = admin.storage().bucket();
  console.log('Firebase Admin SDK inicializado correctamente. Bucket:', bucket.name);
} catch (error: any) {
  console.error('ERROR en inicialización de Firebase:', error.message);
  console.error('Stack:', error.stack);
  bucket = undefined;
}

// Exporta el bucket
export { bucket };