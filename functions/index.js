const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * SHIPROCKET PROXY FUNCTION
 * Handles authentication and proxies requests to Shiprocket API.
 * 
 * Required Environment Secrets:
 * - SHIPROCKET_EMAIL
 * - SHIPROCKET_PASSWORD
 */
exports.shiprocket = onRequest({ secrets: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"] }, (req, res) => {
  return cors(req, res, async () => {
    try {
      const email = process.env.SHIPROCKET_EMAIL;
      const password = process.env.SHIPROCKET_PASSWORD;

      if (!email || !password) {
        throw new Error("Shiprocket credentials not set in Firebase secrets.");
      }

      // 1. Get Authentication Token
      logger.info("Authenticating with Shiprocket...");
      const authRes = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
        email,
        password
      });
      const token = authRes.data.token;

      // 2. Determine Shiprocket Endpoint
      // We expect the path to be /createOrder or /track/:awb
      const path = req.path.replace(/^\//, "");
      let shiprocketUrl = "";
      let method = "GET";

      if (path === "createOrder") {
        shiprocketUrl = "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc";
        method = "POST";
      } else if (path.startsWith("track/")) {
        const awb = path.split("/")[1];
        shiprocketUrl = `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`;
        method = "GET";
      } else {
        return res.status(404).json({ error: "Invalid endpoint. Use /createOrder or /track/:awb" });
      }

      // 3. Proxy the request
      logger.info(`Proxying ${method} request to Shiprocket: ${shiprocketUrl}`);
      const response = await axios({
        url: shiprocketUrl,
        method: method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        data: method === "POST" ? req.body : undefined
      });

      return res.status(response.status).json(response.data);

    } catch (error) {
      logger.error("Shiprocket Proxy Error:", error.response?.data || error.message);
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      return res.status(status).json({ error: message });
    }
  });
});

/**
 * SHIPROCKET WEBHOOK
 * Listens for tracking updates from Shiprocket and updates Firestore.
 */
exports.shiprocketWebhook = onRequest((req, res) => {
  // 1. Verify Authentication Token
  const token = req.headers["x-api-key"];
  const EXPECTED_TOKEN = "pa_webhook_secret_2026"; // The token to paste in Shiprocket UI

  if (token !== EXPECTED_TOKEN) {
    logger.warn("Webhook unauthorized request with token:", token);
    return res.status(401).send("Unauthorized");
  }

  // 2. Parse Payload
  const payload = req.body;
  logger.info("Received Shiprocket Webhook Payload:", payload);

  const awb = payload.awb;
  const currentStatus = payload.current_status;
  const srOrderId = payload.order_id || payload.sr_order_id;

  if (!awb && !srOrderId) {
    return res.status(400).send("Bad Request: Missing AWB or Order ID");
  }

  // 3. Find and update the order in Firestore
  return (async () => {
    try {
      let ordersRef = db.collection("orders");
      let querySnapshot;

      if (awb) {
        querySnapshot = await ordersRef.where("awb", "==", awb).get();
      }
      
      if (!querySnapshot || querySnapshot.empty) {
        if (srOrderId) {
          // Fallback to srOrderId search
          querySnapshot = await ordersRef.where("srOrderId", "==", String(srOrderId)).get();
        }
      }

      if (!querySnapshot || querySnapshot.empty) {
        logger.warn(`Order not found for AWB: ${awb} or SR Order ID: ${srOrderId}`);
        return res.status(404).send("Order not found");
      }

      // Update the matched document(s)
      const batch = db.batch();
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          srStatus: currentStatus,
          status: currentStatus.toLowerCase() === 'delivered' ? 'delivered' : 'processing',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      logger.info(`Successfully updated status to ${currentStatus} for AWB: ${awb}`);
      return res.status(200).send("Success");

    } catch (error) {
      logger.error("Error processing webhook:", error);
      return res.status(500).send("Internal Server Error");
    }
  })();
});
