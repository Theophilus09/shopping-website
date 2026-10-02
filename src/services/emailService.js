import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);

// Initialize Mailgun client using process.env loaded by server.js
const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
    // If your domain was created in the EU region, uncomment the line below:
    // url: 'https://api.eu.mailgun.net'
});

/**
 * Dispatches an order confirmation receipt via Mailgun
 */
export const sendOrderEmail = async ({ to, orderId, total, customerName = 'Customer', items = [] }) => {
    const domain = process.env.MAILGUN_DOMAIN;
    const fromEmail = process.env.MAILGUN_FROM_EMAIL || `ModernStore <postmaster@${domain}>`;

    if (!domain || !process.env.MAILGUN_API_KEY) {
        console.warn('[Mailgun] Missing credentials in .env. Skipping email dispatch.');
        return null;
    }

    const formattedTotal = Number(total || 0).toFixed(2);
    const shortId = orderId ? orderId.slice(0, 8) : 'N/A';

    const itemsHtml = Array.isArray(items) && items.length > 0
        ? items.map(item => `
        <li style="margin-bottom: 8px;">
          <strong>${item.name || item.product_name || 'Item'}</strong> &times; ${item.quantity || 1} — $${Number(item.price || 0).toFixed(2)}
        </li>
      `).join('')
        : '<li>Item details processed successfully.</li>';

    const messageData = {
        from: fromEmail,
        to: [to],
        subject: `Order Confirmation - #${shortId}`,
        text: `Hello ${customerName},\n\nThank you for your order! Your total is $${formattedTotal}.\nOrder Reference: ${orderId}\n\nWe are preparing your shipment!`,
        html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Order Confirmed!</h2>
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Thank you for shopping with ModernStore. We have received your order and are processing it for shipment.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Order ID:</strong> <span style="font-family: monospace;">${orderId}</span></p>
          <p style="margin: 0; font-size: 14px;"><strong>Total Paid:</strong> $${formattedTotal}</p>
        </div>

        <h3 style="font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px;">Items Purchased:</h3>
        <ul style="padding-left: 20px; color: #475569; font-size: 14px;">
          ${itemsHtml}
        </ul>

        <p style="font-size: 13px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          If you have any questions, simply reply to this email.
        </p>
      </div>
    `
    };

    console.log(`[Mailgun] Dispatching confirmation to ${to} via domain ${domain}...`);

    try {
        const response = await mg.messages.create(domain, messageData);
        console.log('[Mailgun] Email dispatched successfully:', response);
        return response;
    } catch (err) {
        console.error('[Mailgun] Failed to dispatch email:', err);
        throw err;
    }
};

export default sendOrderEmail;