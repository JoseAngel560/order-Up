// food-backend/firebaseConfig.ts
import * as admin from 'firebase-admin';

// Inicialización de Firebase Admin SDK
let bucket: any; // Usamos 'any' para evitar dramas de TS

try {
  const serviceAccount = require('./firebase-service-account.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'joseangel-5dfd2.firebasestorage.app' // Tu bucket
  });

  bucket = admin.storage().bucket();
  console.log('Firebase Admin SDK inicializado correctamente');
} catch (error: any) {
  console.warn('ADVERTENCIA: No se pudo inicializar Firebase Admin SDK.');
  console.warn('Esto es normal en desarrollo si firebase-service-account.json no existe.');
  console.warn('Error:', error.message);
}

// Exporta el bucket
export { bucket };