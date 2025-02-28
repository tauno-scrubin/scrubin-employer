import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { PRIVATE_STRIPE_SECRET_KEY } from '$env/static/private';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {

        const billing = await locals.scrubinClient.company.getBilling();
        // Get the customer ID from the query parameter
        const customerId = billing.stripeCustomerId;
        
        if (!customerId) {
            return json({ error: 'Customer ID is required' }, { status: 400 });
        }
        
        // Initialize Stripe with your secret key
        const stripe = new Stripe(PRIVATE_STRIPE_SECRET_KEY, {
            apiVersion: '2025-02-24.acacia' // Use the latest API version or specify the one you need
        });
        
        // Fetch all payment methods for the customer
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card'
        });
        
        // Transform the payment methods to return only necessary information
        const cards = paymentMethods.data.map(method => {
            const card = method.card;
            
            return {
                id: method.id,
                brand: card?.brand || 'unknown',
                last4: card?.last4 || '****',
                expMonth: card?.exp_month,
                expYear: card?.exp_year,
                isDefault: method.metadata?.default === 'true',
                created: method.created,
                billingDetails: {
                    name: method.billing_details?.name,
                    email: method.billing_details?.email,
                    phone: method.billing_details?.phone,
                    address: method.billing_details?.address
                }
            };
        });
        
        return json({ cards });
    } catch (error) {
        console.error('Error fetching customer cards:', error);
        return json({ error: 'Failed to fetch payment methods' }, { status: 500 });
    }
};
