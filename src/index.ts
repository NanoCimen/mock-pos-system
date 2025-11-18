import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as express from 'express';
import apiRouter from './api/router';

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();
app.use('/', apiRouter);

// Export single API function
export const api = functions.https.onRequest(app);

