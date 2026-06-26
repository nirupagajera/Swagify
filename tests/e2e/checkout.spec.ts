import { customerAccount } from '../../src/fixtures/accounts';
import { expect, test } from '../../src/fixtures/test';
import { type CartPage } from '../../src/pages/CartPage';
import { type LoginPage } from '../../src/pages/LoginPage';
import { type ProductsPage } from '../../src/pages/ProductsPage';
import {
  invalidProductionShippingAddress,
  productData,
  productionShippingAddress
} from '../../src/utils/testData';

test.describe('Checkout', () => {
  test('registered customer can checkout with valid data and see an order id @production', async ({
    loginPage,
    productsPage,
    cartPage,
    checkoutPage
  }) => {
    await loginAndProceedToCheckout({ loginPage, productsPage, cartPage });

    await checkoutPage.fillShippingAddress(productionShippingAddress);
    await checkoutPage.completeCheckoutOptions();
    await checkoutPage.placeOrder();
    await checkoutPage.expectOrderConfirmation();

    const orderId = await checkoutPage.orderId();
    expect(orderId).toMatch(/\S+/);
    console.log(`Order ID: ${orderId}`);
  });

  test('registered customer cannot checkout with invalid data and sees validation @production', async ({
    loginPage,
    productsPage,
    cartPage,
    checkoutPage
  }) => {
    await loginAndProceedToCheckout({ loginPage, productsPage, cartPage });

    await checkoutPage.fillShippingAddress(invalidProductionShippingAddress);
    await checkoutPage.completeCheckoutOptions();
    await checkoutPage.placeOrder();
    await checkoutPage.expectCheckoutValidation(/phone number is required/i);
  });
});

async function loginAndProceedToCheckout({
  loginPage,
  productsPage,
  cartPage
}: {
  loginPage: LoginPage;
  productsPage: ProductsPage;
  cartPage: CartPage;
}): Promise<void> {
  await loginPage.goto();
  await loginPage.login(customerAccount());
  await productsPage.searchAndOpenFirstProduct(productData.smokeProductSearchTerm);
  await productsPage.addProductToCart();
  await productsPage.openCart();
  await cartPage.expectProductInCart();
  await cartPage.proceedToCheckout();
}
