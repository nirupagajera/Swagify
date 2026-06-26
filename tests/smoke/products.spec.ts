import { test } from '../../src/fixtures/test';

test.describe('Product browsing @smoke', () => {
  test('customer can view the product catalog', async ({ productsPage }) => {
    await productsPage.goto();

    await productsPage.expectLoaded();
    await productsPage.expectFiltersVisible();
  });
});
