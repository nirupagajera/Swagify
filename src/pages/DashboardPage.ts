import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/home');
  }

  async openOrder(orderId: string): Promise<void> {
    const orderLink = this.page
      .getByRole('link', { name: new RegExp(orderId, 'i') })
      .or(this.page.getByText(orderId).first())
      .first();

    await expect(orderLink).toBeVisible({ timeout: 30000 });

    const detailNavigation = this.page
      .waitForURL(/\/order|\/orders|\/dashboard|\/home/i, { timeout: 15000 })
      .catch(() => undefined);

    await orderLink.click({ force: true });
    await detailNavigation;
  }

  async expectOrderDetail(orderId: string, productSearchTerm: string): Promise<void> {
    await expect(this.page.getByText(orderId).first()).toBeVisible({ timeout: 30000 });
    await expect(
      this.page
        .getByText(new RegExp(productSearchTerm, 'i'))
        .or(this.page.locator('main').filter({ hasText: new RegExp(productSearchTerm, 'i') }))
        .first()
    ).toBeVisible({ timeout: 30000 });
  }
}
