const FCM = require("fcm-node");
const config = require("../config");

let fcm;

if (config.SERVER_KEY) {
  try {
    fcm = new FCM(config.SERVER_KEY);
  } catch (error) {
    console.error("FCM Initialization Error:", error.message);
    fcm = createMockFCM();
  }
} else {
  console.warn(
    "WARNING: config.SERVER_KEY is missing. Notifications will not be sent."
  );
  fcm = createMockFCM();
}

function createMockFCM() {
  return {
    send: (payload, callback) => {
      console.warn("FCM: send called but SERVER_KEY is missing or invalid.");
      if (callback) callback(new Error("SERVER_KEY missing"), null);
    },
  };
}

module.exports = fcm;
