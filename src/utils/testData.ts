import { type ShippingAddress } from '../pages/CheckoutPage';

export const productionShippingAddress: ShippingAddress = {
  firstName: 'Nirupa',
  lastName: 'Gajera',
  addressLine1: '100 north carolwood drive',
  mobileNumber: '4243432423',
  city: 'Los Angeles',
  state: 'California',
  postalCode: '90077',
  country: 'United States'
};

export const invalidProductionShippingAddress: ShippingAddress = {
  ...productionShippingAddress,
  addressLine1: '100 north carolwood drive',
  mobileNumber: ''
};

export const productData = {
  smokeProductSearchTerm: process.env.SMOKE_PRODUCT_SEARCH_TERM ?? 'SW-BTLO1'
};
