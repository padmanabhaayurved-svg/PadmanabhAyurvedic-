/* ============================================================
   PADMANABH AYURVEDICS — RAZORPAY INTEGRATION
   Standard Checkout · UPI, Cards, Net Banking, Wallets
   ============================================================ */

const RazorpayHelper = (() => {

  let _scriptLoaded = false;

  /** Lazy-load Razorpay checkout.js */
  function loadScript() {
    return new Promise((resolve, reject) => {
      if (_scriptLoaded || window.Razorpay) {
        _scriptLoaded = true;
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload  = () => { _scriptLoaded = true; resolve(); };
      s.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.head.appendChild(s);
    });
  }

  /**
   * Initiate payment
   * @param {object} orderData - { amount (INR), orderId, customerName, email, phone }
   * @param {function} onSuccess - called with Razorpay response object
   * @param {function} onFailure - called with error
   */
  async function initiatePayment(orderData, onSuccess, onFailure) {
    try {
      await loadScript();

      // 1. Fetch Razorpay order ID securely from the backend
      const res = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: orderData.amount })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate order ID');
      }

      // 2. Open Razorpay Checkout using the returned order ID
      const options = {
        key:         data.keyId,
        amount:      data.amount,
        currency:    data.currency,
        name:        'Padmanabh Ayurvedics',
        description: 'Ayurvedic Wellness Order',
        image:       '', // TODO: add logo URL
        order_id:    data.orderId,
        prefill: {
          name:    orderData.customerName || '',
          email:   orderData.email || '',
          contact: orderData.phone || ''
        },
        theme: {
          color: '#64a435',
          backdrop_color: '#0a0a0a'
        },
        modal: {
          ondismiss: () => {
            if (window.showToast) window.showToast('Payment cancelled.', 'warning');
          }
        },
        handler: function(response) {
          // response: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
          onSuccess({
            paymentId:  response.razorpay_payment_id,
            orderId:    response.razorpay_order_id,
            signature:  response.razorpay_signature
          });
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(response) {
        console.error('[Razorpay] Payment failed:', response.error);
        if (window.showToast) window.showToast('Payment failed: ' + response.error.description, 'error');
        if (onFailure) onFailure(response.error);
      });

      rzp.open();
    } catch (e) {
      console.error('[Razorpay] Error:', e);
      if (window.showToast) window.showToast('Payment service unavailable. Try again.', 'error');
      if (onFailure) onFailure(e);
    }
  }

  return { initiatePayment };
})();
