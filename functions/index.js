const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const axios = require("axios");
const cors = require("cors")({ origin: true });

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
