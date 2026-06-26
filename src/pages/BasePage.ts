import { type Locator, type Page, expect } from '@playwright/test';
import { getEnvironmentConfig } from '../config/environments';

export abstract class BasePage {
  protected readonly page: Page;

  protected constructor(page: Page) {
    this.page = page;
  }

  protected byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.acceptCookieConsentIfVisible();
    await this.unlockWebsiteIfNeeded();
    await this.acceptCookieConsentIfVisible();
  }

  private async unlockWebsiteIfNeeded(): Promise<void> {
    const { websiteAccessPassword } = getEnvironmentConfig();

    if (!websiteAccessPassword) {
      return;
    }

    const explicitPasswordInput = await this.firstVisible([this.byTestId('website-password-input')]);
    const loginEmailInputIsVisible = await this.page
      .getByRole('textbox', { name: /email/i })
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    const passwordInput =
      explicitPasswordInput ??
      (loginEmailInputIsVisible ? undefined : await this.firstVisible([this.page.locator('input[type="password"]').first()]));

    if (!passwordInput) {
      return;
    }

    await passwordInput.fill(websiteAccessPassword);

    const submitButton = await this.firstVisible([
      this.byTestId('website-access-submit-button'),
      this.page.getByRole('button', { name: /enter|submit|unlock|access|continue/i }).first(),
      this.page.locator('button[type="submit"], input[type="submit"]').first()
    ]);

    if (submitButton) {
      await this.clickStable(submitButton);
    } else {
      await passwordInput.press('Enter');
    }
  }

  private async acceptCookieConsentIfVisible(): Promise<void> {
    const acceptButton = this.page
      .getByRole('button', { name: /accept all/i })
      .or(this.page.locator('.cky-btn-accept'))
      .first();

    if (await acceptButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await acceptButton.click({ force: true }).catch(() => undefined);
    }
  }

  protected async clickStable(locator: Locator): Promise<void> {
    await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
    await expect(locator).toBeVisible({ timeout: 10000 });
    await expect(locator).toBeEnabled({ timeout: 10000 });

    const clicked = await locator
      .click({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (!clicked) {
      await locator.evaluate((element) => {
        if (element instanceof HTMLElement) {
          element.click();
        }
      });
    }
  }

  private async firstVisible(locators: Locator[]): Promise<Locator | undefined> {
    for (const locator of locators) {
      const isVisible = await locator.isVisible({ timeout: 1_000 }).catch(() => false);

      if (isVisible) {
        return locator;
      }
    }

    return undefined;
  }
}
