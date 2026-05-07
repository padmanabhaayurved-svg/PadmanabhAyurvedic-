/* ============================================================
   PADMANABH AYURVEDICS — SHIPROCKET INTEGRATION
   Direct API client (no proxy). Token stored in localStorage.
   Base URL: https://apiv2.shiprocket.in
   ============================================================ */

const SR = {
  BASE: 'https://apiv2.shiprocket.in/v1/external',
  CREDENTIALS: {
    email:    'padmanabhaayurved@gmail.com',
    password: 'I5#6ASqv5flJN7j0TMgbRGRoI$fqvZO4'
  },
  // Pickup location defaults — update these in admin settings later
  PICKUP: {
    name:    'Primary',
    pincode: '414001',
    city:    'Ahilyanagar',
    state:   'Maharashtra',
    country: 'India'
  },

  // ── Token Management ────────────────────────────────────
  _getToken() {
    try { return JSON.parse(localStorage.getItem('sr_token') || 'null'); }
    catch { return null; }
  },

  _setToken(token, expiresInHours = 240) {
    const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);
    localStorage.setItem('sr_token', JSON.stringify({ token, expiresAt }));
  },

  _clearToken() {
    localStorage.removeItem('sr_token');
  },

  async authenticate() {
    try {
      const res = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          endpoint: '/auth/login', 
          method: 'POST', 
          body: { email: this.CREDENTIALS.email, password: this.CREDENTIALS.password } 
        })
      });
      const data = await res.json();
      if (data.token) {
        this._setToken(data.token);
        console.log('[Shiprocket] Authenticated successfully via Proxy');
        return data.token;
      }
      throw new Error(data.message || 'Authentication failed');
    } catch (e) {
      console.error('[Shiprocket] Auth error:', e.message);
      throw e;
    }
  },

  async _ensureToken() {
    const cached = this._getToken();
    if (cached && cached.token && cached.expiresAt > Date.now()) {
      return cached.token;
    }
    return await this.authenticate();
  },

  async _request(endpoint, method = 'GET', body = null) {
    const token = await this._ensureToken();
    const opts = {
      method: 'POST', // Proxy always receives POST
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint,
        method,
        body,
        token
      })
    };

    let res;
    try {
      res = await fetch('/api/shiprocket', opts);
    } catch (e) {
      throw new Error(`Network error: ${e.message}`);
    }

    if (res.status === 401) {
      // Token expired — re-auth and retry once
      this._clearToken();
      await this.authenticate();
      return this._request(endpoint, method, body);
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const d = await res.json(); errMsg = d.message || d.error || errMsg; } catch {}
      throw new Error(errMsg);
    }

    return await res.json();
  },

  // ── 1. Serviceability Check ─────────────────────────────
  async checkServiceability(pickupPincode, deliveryPincode, weight = 0.5) {
    const params = new URLSearchParams({
      pickup_postcode: pickupPincode || this.PICKUP.pincode,
      delivery_postcode: deliveryPincode,
      weight: weight.toString(),
      cod: '1'
    });
    const res = await this._request(`/courier/serviceability/?${params}`);
    // Shiprocket returns nested structure: res.data.available_courier_companies
    if (res && res.data && res.data.available_courier_companies) {
      return res.data.available_courier_companies;
    }
    return res.available_courier_companies || res.courier_company_details || [];
  },

  // ── 2. Create Adhoc Order ───────────────────────────────
  async createOrder(order) {
    /**
     * order object:
     * {
     *   order_id, order_date, pickup_location, channel_id,
     *   billing_customer_name, billing_last_name,
     *   billing_address, billing_city, billing_pincode, billing_state, billing_country,
     *   billing_email, billing_phone,
     *   shipping_is_billing, shipping_customer_name, shipping_last_name,
     *   shipping_address, shipping_city, shipping_pincode, shipping_state, shipping_country,
     *   shipping_email, shipping_phone,
     *   order_items: [{ name, sku, units, selling_price }],
     *   payment_method, sub_total, length, breadth, height, weight,
     *   courier_company  ← selected courier name from serviceability
     * }
     */
    const payload = {
      order_id:            order.orderId || `PA-${Date.now()}`,
      order_date:          order.orderDate || new Date().toISOString().slice(0, 10),
      pickup_location:     order.pickupLocation || this.PICKUP.name,
      channel_id:          order.channelId || '',
      billing_customer_name:  order.customerName || '',
      billing_last_name:   '',
      billing_address:     order.address || '',
      billing_city:        order.city || '',
      billing_pincode:     order.pincode || '',
      billing_state:       order.state || '',
      billing_country:     order.country || 'India',
      billing_email:       order.email || '',
      billing_phone:       order.phone || '',
      shipping_is_billing: true,
      order_items:         order.items.map(i => ({
        name:          i.name,
        sku:           i.productId || i.sku || 'N/A',
        units:         i.qty,
        selling_price: i.price
      })),
      payment_method:  order.paymentMethod || 'Prepaid',
      sub_total:       order.subtotal || 0,
      length:          order.length || 15,
      breadth:         order.breadth || 10,
      height:          order.height || 10,
      weight:          order.weight || 0.5,
      courier_company: order.courierCompany || ''
    };

    const data = await this._request('/orders/create/adhoc', 'POST', payload);
    // Returns { order_id, shipment_id }
    return {
      srOrderId:  data.order_id,
      shipmentId: data.shipment_id
    };
  },

  // ── 3. Assign AWB ───────────────────────────────────────
  async assignAWB(shipmentId, courierName) {
    const data = await this._request('/courier/assign/awb', 'POST', {
      shipment_id:    shipmentId,
      courier_company: courierName
    });
    // Returns { awb_code, courier_name, ... }
    return {
      awb:          data.awb_code || data.awb,
      courierName:  data.courier_name || courierName,
      shipmentId:   data.shipment_id || shipmentId
    };
  },

  // ── 4. Generate Pickup ──────────────────────────────────
  async generatePickup(shipmentId) {
    const data = await this._request('/courier/generate/pickup', 'POST', {
      shipment_id: shipmentId
    });
    return data;
  },

  // ── 5. Generate Label ───────────────────────────────────
  async generateLabel(shipmentId) {
    const data = await this._request('/courier/generate/label', 'POST', {
      shipment_id: shipmentId,
      label_type:  'label'
    });
    return {
      labelUrl: data.label_pdf || data.pdf_url || data.print_url || '',
      success:  !!data.label_pdf || !!data.pdf_url || !!data.print_url
    };
  },

  // ── 6. Generate Invoice ─────────────────────────────────
  async generateInvoice(srOrderId) {
    const data = await this._request('/orders/print/invoice', 'POST', {
      ids: [srOrderId]
    });
    return {
      invoiceUrl: data.pdf_url || data.print_url || '',
      success:    !!data.pdf_url || !!data.print_url
    };
  },

  // ── 7. Generate Manifest ────────────────────────────────
  async generateManifest(orderIds) {
    const data = await this._request('/manifests/generate', 'POST', {
      ids: orderIds
    });
    return data;
  },

  // ── 8. Print Manifest ───────────────────────────────────
  async printManifest() {
    const data = await this._request('/manifests/print', 'POST', {});
    return {
      manifestUrl: data.pdf_url || data.print_url || '',
      success:     !!data.pdf_url || !!data.print_url
    };
  },

  // ── 9. Track Shipment ───────────────────────────────────
  async trackAWB(awb) {
    const data = await this._request(`/courier/track/awb/${awb}`);
    return {
      awb,
      status:       data.track_status,
      statusText:   data.shipment_track?.status || data.track_status || 'Unknown',
      activities:   data.shipment_track?.activities || data.tracking_details || [],
      courierName:  data.courier_name || '',
      delivered:    data.track_status === 7,
      rawData:      data
    };
  },

  // ── 10. Test Connection ─────────────────────────────────
  async testConnection() {
    try {
      await this._ensureToken();
      return { connected: true, token: this._getToken() };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  },

  // ── 11. Reconnect (force new token) ─────────────────────
  async reconnect() {
    this._clearToken();
    return await this.authenticate();
  }
};

// Expose globally for page scripts
window.Shiprocket = SR;

// Backwards compatibility alias
window.ShiprocketHelper = {
  async createShipment(order) {
    const result = await SR.createOrder({
      orderId:       order.id || `PA-${Date.now()}`,
      orderDate:     new Date().toISOString().slice(0, 10),
      customerName:  order.address?.name || order.customerName || '',
      address:       order.address?.address || order.address || '',
      city:          order.address?.city || order.city || '',
      pincode:       order.address?.pincode || order.pincode || '',
      state:         order.address?.state || order.state || '',
      country:       'India',
      email:         order.address?.email || order.email || '',
      phone:         order.address?.phone || order.phone || '',
      items:         (order.items || []).map(i => ({
        name: i.name,
        sku: i.productId || i.sku || 'N/A',
        qty: i.qty,
        price: i.price
      })),
      paymentMethod: order.paymentMethod || 'Prepaid',
      subtotal:      order.subtotal || order.total || 0,
      courierCompany: order.courierCompany || order.courier || '',
      weight:        order.weight || 0.5
    });

    // Try to assign AWB
    let awb = '', shipmentId = result.shipmentId;
    try {
      const awbResult = await SR.assignAWB(shipmentId, order.courierCompany || 'Delhivery');
      awb = awbResult.awb;
    } catch(e) { console.warn('[Shiprocket] AWB assign failed:', e.message); }

    return {
      shiprocketOrderId: result.srOrderId,
      shipmentId:        shipmentId,
      awb:               awb
    };
  },
  async trackShipment(awb) {
    const result = await SR.trackAWB(awb);
    // Return in legacy format for backwards compatibility
    return {
      tracking_data: {
        track_status: result.status || 0,
        shipment_track_activities: result.activities.map(a => ({
          date: a.date || a.scan_time || a.timestamp || '',
          activity: a.activity || a.status || a.description || '',
          location: a.location || ''
        }))
      },
      courier_name: result.courierName,
      awb_code: result.awb
    };
  }
};

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
  // Pre-warm token in background (don't block)
  SR._ensureToken().catch(() => {});
});
