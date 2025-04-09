import { currentUser } from '$lib/scrubinClient/client';
import { Stethoscope } from 'lucide-svelte';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, locals }) => {
  // Get user from locals or fetch from API if needed
  const userId = locals.user?.id || null;
  const userCountry = locals.company?.countryIso || null;
  console.log(locals.company);
  let startingFee = 0;
  
  // Special case for specific user
  if (userId === 100003) {
    startingFee = 750;
  }
  
  // Get country from request headers or user data
  
  let pricingOptions = [
    { role: "Doctors", price: 500, currency: "EUR", duration: 12 },
    { role: "Nurses & Specialists", price: 250, currency: "EUR", duration: 12 }
  ];
  
  // Override pricing based on country
  if (userCountry === 'GBR' || userCountry === 'GB') {
    pricingOptions = [
      { role: "Doctors", price: 500, currency: "GBP", duration: 12 },
      { role: "Nurses & Specialists", price: 250, currency: "GBP", duration: 12 }
    ];
  } else if (userCountry === 'AUS') {
    pricingOptions = [
      { role: "Doctors", price: 800, currency: "AUD", duration: 12 },
      { role: "Nurses & Specialists", price: 400, currency: "AUD", duration: 12 }
    ];
  }
  
  return {
    pricingOptions,
    startingFee,
    currency: pricingOptions[0].currency
  };
};
