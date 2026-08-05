const admin = require("firebase-admin");

/**
 * Firebase Admin Service
 * Handles centralized initialization of Firebase Admin SDK
 * and provides helper methods for push notifications.
 */

let messaging = null;
let isInitialized = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle private key with escaped newlines
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : null;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    messaging = admin.messaging();
    isInitialized = true;
    console.log("✓ Firebase Admin Initialized Successfully");
  } else {
    console.warn("⚠ Firebase Messaging Disabled: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY is missing.");
  }
} catch (error) {
  console.error("✖ Firebase Initialization Error:", error.message);
}

/**
 * Send a push notification to a specific device token
 * @param {string} token - FCM device token
 * @param {object} notification - { title, body }
 * @param {object} data - Custom data payload
 */
const sendNotification = async (token, notification, data = {}) => {
  if (!isInitialized || !messaging) {
    console.warn("FCM: sendNotification ignored - Firebase not configured.");
    return { success: false, error: "Firebase not configured" };
  }

  if (!token) {
    return { success: false, error: "Token is required" };
  }

  try {
    const message = {
      token: token,
      notification: {
        title: notification.title || "Taka Live",
        body: notification.body || "",
      },
      data: data,
      // Modern Android settings
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          }
        }
      }
    };

    const response = await messaging.send(message);
    return { success: true, response };
  } catch (error) {
    console.error("FCM: Error sending notification:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Legacy wrapper for backward compatibility with fcm-node structure
 * Used to avoid deep refactoring of payload objects in controllers
 */
const send = async (payload, callback) => {
  const token = payload.to;
  const notification = payload.notification || {};
  const data = payload.data || {};

  // Convert all data values to strings as required by Firebase Admin SDK
  const stringData = {};
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'object') {
      stringData[key] = JSON.stringify(data[key]);
    } else {
      stringData[key] = String(data[key]);
    }
  });

  const result = await sendNotification(token, notification, stringData);

  if (callback) {
    if (result.success) {
      callback(null, result.response);
    } else {
      callback(new Error(result.error), null);
    }
  }
  return result;
};

module.exports = {
  admin,
  messaging,
  isInitialized,
  sendNotification,
  send // Legacy compatibility method
};
