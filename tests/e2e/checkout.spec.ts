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
  test.describe.configure({ timeout: 180_000 });

  test('registered customer can checkout with valid data and see an order id @production', async ({
    loginPage,
    productsPage,
    cartPage,
    checkoutPage,
    dashboardPage
  }) => {
    const cartTotal = await loginAndProceedToCheckout({ loginPage, productsPage, cartPage });
    await expect(checkoutPage.orderTotal()).resolves.toBe(cartTotal);

    await checkoutPage.fillShippingAddress(productionShippingAddress);
    await checkoutPage.completeCheckoutOptions();
    await checkoutPage.placeOrder();
    await checkoutPage.expectOrderConfirmation();

    const orderId = await checkoutPage.orderId();
    expect(orderId).toMatch(/\S+/);
    console.log(`Order ID: ${orderId}`);
    await loginPage.ensureLoggedIn(customerAccount());
    await dashboardPage.goto();
    await dashboardPage.openOrder(orderId);
    await dashboardPage.expectOrderDetail(orderId, productData.smokeProductSearchTerm);
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

  test('guest customer can place order with valid data @production', async ({
    productsPage,
    cartPage,
    checkoutPage
  }) => {
    const cartTotal = await shopAndProceedToCheckout({ productsPage, cartPage });
    await expect(checkoutPage.orderTotal()).resolves.toBe(cartTotal);

    await checkoutPage.fillShippingAddress(productionShippingAddress);
    await checkoutPage.completeCheckoutOptions();
    await checkoutPage.placeOrder();
    await checkoutPage.expectOrderConfirmation();

    const orderId = await checkoutPage.orderId();
    expect(orderId).toMatch(/\S+/);
    console.log(`Guest Order ID: ${orderId}`);
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
}): Promise<number> {
  await loginPage.goto();
  await loginPage.login(customerAccount());
  return shopAndProceedToCheckout({ productsPage, cartPage });
}

async function shopAndProceedToCheckout({
  productsPage,
  cartPage
}: {
  productsPage: ProductsPage;
  cartPage: CartPage;
}): Promise<number> {
  await productsPage.goto();
  await productsPage.searchAndOpenFirstProduct(productData.smokeProductSearchTerm);
  await productsPage.addProductToCart();
  await productsPage.openCart();
  await cartPage.expectProductInCart();
  return cartPage.proceedToCheckout();
}
