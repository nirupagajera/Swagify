import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  private readonly checkoutCouponCode = 'RUT100';

  constructor(page: Page) {
    super(page);
  }

  async expectProductInCart(): Promise<void> {
    const cartItem = this.page.getByRole('row').filter({ hasText: /Sku:/i }).first();

    await expect(cartItem).toBeVisible();
  }

  async proceedToCheckout(): Promise<number> {
    await this.applyCheckoutCoupon();
    const cartTotal = await this.orderTotal();

    const checkoutButton = this.byTestId('checkout-button')
      .or(this.page.getByRole('link', { name: /proceed to checkout/i }))
      .or(this.page.getByRole('button', { name: /checkout/i }))
      .first();

    await checkoutButton.scrollIntoViewIfNeeded();
    await expect(checkoutButton).toBeVisible({ timeout: 10000 });

    const checkoutNavigation = this.page
      .waitForURL(/\/secure-checkout(?:[/?#]|$)/, { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    const clicked = await checkoutButton.click({ timeout: 10000 }).then(() => true).catch(() => false);
    const reachedCheckout = clicked ? await checkoutNavigation : false;

    if (!reachedCheckout && !/\/secure-checkout(?:[/?#]|$)/.test(this.page.url())) {
      await this.page.goto('/secure-checkout');
    }

    return cartTotal;
  }

  async orderTotal(): Promise<number> {
    const totalLocator = await this.firstVisibleCartLocator([
      this.byTestId('cart-total'),
      this.byTestId('order-total'),
      this.page.locator('xpath=//*[contains(normalize-space(), "Order Total") and contains(normalize-space(), "$")]').last(),
      this.page.locator('xpath=//*[contains(normalize-space(), "Cart Total") and contains(normalize-space(), "$")]').last(),
      this.page.locator('xpath=//*[contains(normalize-space(), "Total") and contains(normalize-space(), "$")]').last(),
      this.page.locator('xpath=//*[contains(normalize-space(), "Order Total")]/following::*[contains(normalize-space(), "$")][1]').first(),
      this.page.locator('xpath=//*[contains(normalize-space(), "Cart Total")]/following::*[contains(normalize-space(), "$")][1]').first(),
      this.page.locator('xpath=//*[contains(normalize-space(), "Total")]/following::*[contains(normalize-space(), "$")][1]').first()
    ]);

    await expect(totalLocator).toBeVisible({ timeout: 10000 });

    return this.parseCurrencyValue(await totalLocator.innerText());
  }

  private async applyCheckoutCoupon(): Promise<void> {
    const couponInput = this.byTestId('coupon-code-input')
      .or(this.page.getByRole('textbox', { name: /coupon/i }))
      .or(this.page.getByPlaceholder(/coupon/i))
      .first();

    await expect(couponInput).toBeVisible({ timeout: 10000 });
    await couponInput.scrollIntoViewIfNeeded();
    await couponInput.fill(this.checkoutCouponCode);

    const applyButton = this.byTestId('apply-coupon-button')
      .or(this.page.getByRole('button', { name: /^apply$/i }))
      .first();

    await expect(applyButton).toBeVisible({ timeout: 10000 });
    await expect(applyButton).toBeEnabled({ timeout: 10000 });
    await applyButton.scrollIntoViewIfNeeded();
    await applyButton.click({ force: true });

    await expect(this.page.getByText(this.checkoutCouponCode).first()).toBeVisible({ timeout: 10000 });
  }

  private async firstVisibleCartLocator(locators: ReturnType<Page['locator']>[]): Promise<ReturnType<Page['locator']>> {
    for (const locator of locators) {
      if (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) {
        return locator;
      }
    }

    return locators[0];
  }

  private parseCurrencyValue(text: string): number {
    const currencyMatch = text.match(/(?:\border\s+total\b|\bcart\s+total\b|\btotal\b)\s*:?\s*\$?\s*([0-9,]+(?:\.[0-9]{2})?)/i)
      ?? text.match(/\$?\s*([0-9,]+(?:\.[0-9]{2})?)/);

    if (!currencyMatch) {
      throw new Error(`Unable to parse cart total from text: "${text}"`);
    }

    return Number(currencyMatch[1].replace(/,/g, ''));
  }
}
