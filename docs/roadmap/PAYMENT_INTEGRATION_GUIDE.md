# Payment Integration Guide

## Overview

This document outlines the structure for integrating payment gateways (Stripe/PayPal) into the subscription system.

## Current Status

✅ **Structure Created**: Basic payment controller and routes are in place
⚠️ **Integration Pending**: Actual Stripe/PayPal integration needs to be implemented

## Files Created

### Backend
- `backend/controllers/paymentController.js` - Payment logic
- `backend/routes/payment.js` - Payment API routes

### API Endpoints

```
POST   /api/payment/intent          # Create payment intent
POST   /api/payment/confirm          # Confirm payment
POST   /api/payment/webhook         # Handle payment webhooks
GET    /api/payment/methods         # Get payment methods
POST   /api/payment/methods         # Add payment method
DELETE /api/payment/methods/:id     # Remove payment method
```

## Integration Steps

### 1. Stripe Integration

#### Install Stripe SDK
```bash
npm install stripe
```

#### Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Update `paymentController.js`

```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// In createPaymentIntent:
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount * 100, // Convert to cents
  currency: 'usd',
  metadata: {
    userId: userId,
    tierName: tierName,
    billingCycle: billingCycle
  }
});

// In handlePaymentWebhook:
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 2. PayPal Integration

#### Install PayPal SDK
```bash
npm install @paypal/checkout-server-sdk
```

#### Environment Variables
```env
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # or 'live'
```

#### Update `paymentController.js`

```javascript
import paypal from '@paypal/checkout-server-sdk';

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const client = new paypal.core.PayPalHttpClient(environment);

// Create order
const request = new paypal.orders.OrdersCreateRequest();
request.prefer("return=representation");
request.requestBody({
  intent: 'CAPTURE',
  purchase_units: [{
    amount: {
      currency_code: 'USD',
      value: amount.toString()
    }
  }]
});
```

## Database Updates

The `user_subscriptions` table already has fields for payment integration:
- `stripe_subscription_id`
- `stripe_customer_id`

You may want to add:
- `paypal_subscription_id`
- `paypal_customer_id`
- `payment_method_id`
- `last_payment_date`
- `next_payment_date`

## Webhook Security

### Stripe
```javascript
const sig = req.headers['stripe-signature'];
try {
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
} catch (err) {
  return res.status(400).send(`Webhook Error: ${err.message}`);
}
```

### PayPal
```javascript
// Verify webhook signature
const headers = req.headers;
const body = req.body;
// Use PayPal SDK to verify
```

## Testing

### Stripe Test Mode
- Use test API keys
- Use Stripe CLI for local webhook testing:
  ```bash
  stripe listen --forward-to localhost:3001/api/payment/webhook
  ```

### PayPal Sandbox
- Use sandbox credentials
- Test with PayPal sandbox accounts

## Next Steps

1. **Choose Payment Gateway**: Decide on Stripe, PayPal, or both
2. **Install SDK**: Add payment gateway SDK
3. **Update Controllers**: Implement actual payment logic
4. **Add Environment Variables**: Configure API keys
5. **Test Integration**: Test with sandbox/test mode
6. **Update Frontend**: Add payment UI components
7. **Handle Webhooks**: Process payment confirmations
8. **Update Subscriptions**: Link payments to subscription activation

## Frontend Integration

After backend is ready, create:
- `PaymentForm.js` - Payment form component
- `PaymentMethods.js` - Manage payment methods
- Integration with `SubscriptionPlans.js` to redirect to payment

## Security Considerations

1. **Never expose secret keys** in frontend
2. **Verify webhook signatures** before processing
3. **Use HTTPS** in production
4. **Validate payment amounts** server-side
5. **Handle payment failures** gracefully
6. **Log all payment events** for auditing

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [PayPal Developer Docs](https://developer.paypal.com/docs)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [PayPal Webhooks](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)

