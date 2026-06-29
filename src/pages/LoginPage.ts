import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { type TestAccount } from '../fixtures/accounts';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/login');
  }

  async login(account: TestAccount): Promise<void> {
    const emailInput = this.emailInput();
    const passwordInput = this.passwordInput();
    const submitButton = this.submitButton();

    await emailInput.fill(account.email);
    await passwordInput.fill(account.password);

    await submitButton.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    const clicked = await submitButton
      .click({ timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (!clicked) {
      await passwordInput.press('Enter');
    }
  }

  async ensureLoggedIn(account: TestAccount): Promise<void> {
    await this.goto();

    const emailInput = this.emailInput();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.login(account);
    }
  }

  async expectSignedIn(): Promise<void> {
    await expect(
      this.byTestId('account-status-label')
        .or(this.page.getByRole('button', { name: /open user menu|user menu|account/i }))
        .first()
    ).toBeVisible();
  }

  async expectLoginError(): Promise<void> {
    await expect(
      this.byTestId('login-error-message')
        .or(this.page.getByRole('alert'))
        .or(this.page.locator('.invalid-feedback, .text-danger, .error, .alert-danger'))
        .or(this.page.getByText(/invalid|incorrect|failed|not match|wrong|does not exist/i))
        .first()
    ).toBeVisible({ timeout: 10000 });
  }

  private emailInput() {
    return this.byTestId('login-email-input').or(this.page.getByRole('textbox', { name: 'Email' })).first();
  }

  private passwordInput() {
    return this.byTestId('login-password-input').or(this.page.locator('input[type="password"]')).first();
  }

  private submitButton() {
    return this.byTestId('login-submit-button').or(this.page.locator('button[type="submit"]')).first();
  }
}
