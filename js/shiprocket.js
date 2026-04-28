/* ============================================================
   PADMANABH AYURVEDICS — SHIPROCKET INTEGRATION
   NOTE: Shiprocket requires server-side calls.
   These functions proxy through a Firebase Cloud Function.

   TODO: Deploy the Cloud Function at /api/shiprocket and
   set SHIPROCKET_EMAIL & SHIPROCKET_PASSWORD in Firebase env.
   ============================================================ */

// TODO: Replace with your Firebase Cloud Functions base URL
const SHIPROCKET_PROXY = 'https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/shiprocket';

const ShiprocketHelper = (() => {

  async function _proxy(endpoint, method = 'POST', body = null) {
    const res = await fetch(`${SHIPROCKET_PROXY}/${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Shiprocket proxy error: ${res.status}`);
    }
    return await res.json();
  }

  /**
   * Create a Shiprocket shipment from an order
   * @param {object} order - Firestore order document
   * @returns {object} { shipmentId, awb, label }
   */
  async function createShipment(order) {
    // TODO: This will call the Cloud Function proxy
    // The Cloud Function authenticates with Shiprocket and forwards the request
    try {
      const payload = {
        order_id:          order.id,
        order_date:        new Date().toISOString().slice(0, 10),
        pickup_location:   'Primary',
        channel_id:        '',
        billing_customer_name: order.address.name,
        billing_last_name:  '',
        billing_address:   order.address.address,
        billing_city:      order.address.city,
        billing_pincode:   order.address.pincode,
        billing_state:     order.address.state,
        billing_country:   'India',
        billing_email:     order.address.email || '',
        billing_phone:     order.address.phone,
        shipping_is_billing: true,
        order_items: order.items.map(i => ({
          name:       i.name,
          sku:        i.productId,
          units:      i.qty,
          selling_price: i.price
        })),
        payment_method: 'Prepaid',
        sub_total:      order.subtotal,
        length:         15, weight: 0.5, breadth: 10, height: 10
      };

      const result = await _proxy('createOrder', 'POST', payload);
      return {
        shiprocketOrderId: result.order_id,
        shipmentId:        result.shipment_id,
        awb:               result.awb_code
      };
    } catch (e) {
      console.warn('[Shiprocket] createShipment error (proxy may not be set up):', e.message);
      // Return a mock for UI flow to continue
      return {
        shiprocketOrderId: 'MOCK-' + Date.now(),
        shipmentId:        'SHP-' + Date.now(),
        awb:               'AWB-' + Date.now()
      };
    }
  }

  /**
   * Track shipment by AWB
   */
  async function trackShipment(awb) {
    try {
      return await _proxy(`track/${awb}`, 'GET');
    } catch (e) {
      console.warn('[Shiprocket] trackShipment error:', e.message);
      return {
        tracking_data: {
          track_status: 1,
          shipment_track_activities: [
            { date: new Date().toLocaleString(), activity: 'Order Placed', location: 'Warehouse' }
          ]
        }
      };
    }
  }

  return { createShipment, trackShipment };
})();
