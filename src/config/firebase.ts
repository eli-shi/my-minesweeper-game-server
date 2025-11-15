import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const credentials = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Validate required environment variables
if (!credentials.projectId || !credentials.clientEmail || !credentials.privateKey) {
    throw new Error('Missing required Firebase environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
}

// Only initialize if not already initialized
if (getApps().length === 0) {
    initializeApp({
        credential: cert(credentials),
    });
    console.log('Firebase initialized in backend');
} else {
    console.log('Firebase already initialized');
}

export default admin;
