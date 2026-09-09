const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { orderId, orderPayload } = req.body;
    
    if (!orderPayload || !orderPayload.address) {
      return res.status(400).json({ error: 'Invalid order payload' });
    }

    const { address, items, total, paymentMethod } = orderPayload;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS.replace(/\s+/g, '') // remove spaces just in case
      }
    });

    const generateEmailHTML = (isCustomer) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #1a1a1a; padding: 30px 20px; text-align: center; }
        .header img { max-height: 60px; margin-bottom: 15px; }
        .header h1 { color: #C9A84C; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
        .content { padding: 40px 30px; }
        .title { font-size: 20px; color: #1a1a1a; margin-top: 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 25px; }
        .details-box { background-color: #fcfbf8; border: 1px solid #efe8d5; border-radius: 6px; padding: 20px; margin-bottom: 30px; }
        .details-box p { margin: 8px 0; font-size: 14px; }
        .details-box strong { color: #1a1a1a; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { text-align: left; padding: 12px; background-color: #f5f5f5; color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .items-table td { padding: 15px 12px; border-bottom: 1px solid #f0f0f0; font-size: 15px; }
        .total-row td { font-weight: bold; color: #1a1a1a; font-size: 18px; border-bottom: none; padding-top: 20px; }
        .gold { color: #C9A84C; }
        .footer { background-color: #1a1a1a; color: #888; padding: 30px; text-align: center; font-size: 13px; }
        .footer a { color: #C9A84C; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <!-- Hosted logo URL for email rendering -->
          <img src="https://raw.githubusercontent.com/padmanabhaayurved-svg/PadmanabhAyurvedic-/main/assets/logo.png" alt="Padmanabh Ayurvedics" />
          <h1>${isCustomer ? 'ORDER CONFIRMATION' : 'NEW ORDER ALERT'}</h1>
        </div>
        
        <div class="content">
          <h2 class="title">${isCustomer ? 'Thank you for your order, ' + address.name + '!' : 'New order received from ' + address.name}</h2>
          
          <div class="details-box">
            <p><strong>Order ID:</strong> #${orderId.slice(-8).toUpperCase()}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
            <p><strong>Customer Name:</strong> ${address.name}</p>
            <p><strong>Phone:</strong> ${address.phone}</p>
            <p><strong>Delivery Address:</strong><br/>
              ${address.address}<br/>
              ${address.city}, ${address.state} - ${address.pincode}
            </p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right">Qty</th>
                <th style="text-align: right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.title}</td>
                  <td style="text-align: right">${item.quantity}</td>
                  <td style="text-align: right">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2" style="text-align: right">Total Amount:</td>
                <td style="text-align: right" class="gold">₹${total.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          
          ${isCustomer ? `
            <p style="text-align: center; color: #666; font-size: 15px; margin-top: 40px;">
              Your order is being processed. We will notify you once it ships.
            </p>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>Padmanabh Ayurvedics</p>
          <p>Rooted in Ancient Wisdom | Crafted for You</p>
          <p><a href="mailto:padmanabhaayurved@gmail.com">padmanabhaayurved@gmail.com</a></p>
        </div>
      </div>
    </body>
    </html>
    `;

    // 1. Send Email to Customer (if they provided an email, else we use phone mapped email or fallback)
    const customerEmail = (address.email && address.email.includes('@') && !address.email.includes('padmanabh.site')) 
                            ? address.email 
                            : process.env.GMAIL_USER; // fallback to admin for testing

    const mailToCustomer = {
      from: '"Padmanabh Ayurvedics" <' + process.env.GMAIL_USER + '>',
      to: customerEmail,
      subject: `Order Confirmation #${orderId.slice(-8).toUpperCase()}`,
      html: generateEmailHTML(true)
    };

    const mailToAdmin = {
      from: '"Padmanabh Store" <' + process.env.GMAIL_USER + '>',
      to: process.env.GMAIL_USER,
      subject: `New Order Alert! #${orderId.slice(-8).toUpperCase()} - ₹${total}`,
      html: generateEmailHTML(false)
    };

    await transporter.sendMail(mailToCustomer);
    await transporter.sendMail(mailToAdmin);

    res.status(200).json({ success: true, message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send emails' });
  }
}
