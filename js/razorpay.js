/* ============================================================
   PADMANABH AYURVEDICS — RAZORPAY INTEGRATION
   Standard Checkout · UPI, Cards, Net Banking, Wallets
   TODO: Replace key_id with your real Razorpay key.
   ============================================================ */

const Razorpay_KEY_ID = 'rzp_test_PLACEHOLDER_YOUR_KEY'; // TODO: replace

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

      const options = {
        key:         Razorpay_KEY_ID,
        amount:      orderData.amount * 100, // in paise
        currency:    'INR',
        name:        'Padmanabh Ayurvedics',
        description: 'Ayurvedic Wellness Order',
        image:       '', // TODO: add logo URL
        order_id:    orderData.razorpayOrderId || '', // from your backend if needed
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
            showToast('Payment cancelled.', 'warning');
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
        showToast('Payment failed: ' + response.error.description, 'error');
        if (onFailure) onFailure(response.error);
      });

      rzp.open();
    } catch (e) {
      console.error('[Razorpay] Error:', e);
      showToast('Payment service unavailable. Try again.', 'error');
      if (onFailure) onFailure(e);
    }
  }

  return { initiatePayment };
})();
