import { test as base } from '@playwright/test';
import { getEnvironmentConfig } from '../config/environments';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductsPage } from '../pages/ProductsPage';

type SwagifyFixtures = {
  loginPage: LoginPage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  dashboardPage: DashboardPage;
  envConfig: ReturnType<typeof getEnvironmentConfig>;
  cleanSession: void;
};

export const test = base.extend<SwagifyFixtures>({
  cleanSession: [async ({ context, page }, use) => {
    await context.clearCookies();
    await context.clearPermissions();

    await use();

    await context.clearCookies();
    await context.clearPermissions();
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }).catch(() => undefined);
  }, { auto: true }],
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  envConfig: async ({}, use) => {
    await use(getEnvironmentConfig());
  }
});

export { expect } from '@playwright/test';
