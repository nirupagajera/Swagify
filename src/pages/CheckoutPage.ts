import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type ShippingAddress = {
  firstName: string;
  lastName: string;
  addressLine1: string;
  mobileNumber: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export class CheckoutPage extends BasePage {
  private static readonly guestEmail = 'nirupa@krishaweb.com';

  constructor(page: Page) {
    super(page);
  }

  async fillShippingAddress(address: ShippingAddress): Promise<void> {
    const savedAddressWasSelected = await this.selectSavedAddressIfVisible(address.addressLine1);

    if (savedAddressWasSelected) {
      await this.fillMobileNumberIfVisible(address.mobileNumber);
      return;
    }

    const firstNameInput = this.firstNameInput();
    const firstNameIsVisible = await firstNameInput
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (firstNameIsVisible) {
      await this.fillNewShippingAddress(address);
      return;
    }

    const addressSelect = this.addressSelect();
    await expect(addressSelect).toBeVisible({ timeout: 10000 });

    await addressSelect.selectOption({ label: 'Add a new address' });
    await expect(this.firstNameInput()).toBeVisible({ timeout: 10000 });
    await this.fillNewShippingAddress(address);
  }

  async completeCheckoutOptions(): Promise<void> {
    await this.selectNoPaymentRequiredIfVisible();
    await this.completeGuestCheckoutSectionIfVisible();
    await this.acceptTermsIfVisible();
  }

  async placeOrder(): Promise<void> {
    const placeOrderButton = this.placeOrderButton();

    await placeOrderButton.scrollIntoViewIfNeeded();
    await expect(placeOrderButton).toBeVisible({ timeout: 10000 });
    await expect(placeOrderButton).toBeEnabled({ timeout: 10000 });
    await placeOrderButton.click();
  }

  async orderTotal(): Promise<number> {
    const totalLocator = await this.firstVisibleCheckoutLocator([
      this.byTestId('checkout-total'),
      this.byTestId('order-total'),
      this.page.locator('xpath=//*[contains(normalize-space(), "Order Total") and contains(normalize-space(), "$")]').last(),
      this.page.locator('xpath=//*[contains(normalize-space(), "Order Total")]/following::*[contains(normalize-space(), "$")][1]').first()
    ], 5_000);

    if (!totalLocator) {
      throw new Error('Unable to find checkout order total');
    }

    await expect(totalLocator).toBeVisible({ timeout: 10000 });

    return this.parseCurrencyValue(await totalLocator.innerText());
  }

  async expectOrderConfirmation(): Promise<void> {
    await expect(
      this.byTestId('order-status-label')
        .or(this.page.getByRole('heading', { name: /thank you/i }))
        .or(this.page.getByText(/your order number is/i))
        .first()
    ).toBeVisible({ timeout: 30000 });
  }

  async expectCheckoutValidation(expectedMessage: string | RegExp): Promise<void> {
    await expect(
      this.page
        .getByRole('alert')
        .or(this.page.locator('strong'))
        .or(this.page.locator('.invalid-feedback, .text-danger, .error'))
        .filter({ hasText: expectedMessage })
        .first()
    ).toBeVisible({ timeout: 10000 });
  }

  async orderId(): Promise<string> {
    const orderIdLocator = this.byTestId('order-id')
      .or(this.page.getByText(/your order number is/i))
      .or(this.page.getByText(/order\s*(id|number|#)/i))
      .first();

    await expect(orderIdLocator).toBeVisible({ timeout: 30000 });

    const orderText = (await orderIdLocator.innerText()).trim();
    const orderIdMatch = orderText.match(/(?:order\s*(?:id|number|#)?\s*(?:is)?\s*[:#-]?\s*)([A-Z]{2}-\d+)/i);

    return orderIdMatch?.[1] ?? orderText;
  }

  private async fillNewShippingAddress(address: ShippingAddress): Promise<void> {
    await this.firstNameInput().fill(address.firstName);
    await this.lastNameInput().fill(address.lastName);
    await this.addressLine1Input().fill(address.addressLine1);
    await this.cityInput().fill(address.city);

    const stateField = this.stateField();
    const stateTagName = await stateField.evaluate((element) => element.tagName.toLowerCase());
    if (stateTagName === 'select') {
      await stateField.selectOption({ label: address.state });
    } else {
      await stateField.fill(address.state);
    }

    await this.postalCodeInput().fill(address.postalCode);

    await this.fillMobileNumberIfVisible(address.mobileNumber);

    const countrySelect = this.countrySelect();

    if (await countrySelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await countrySelect.selectOption({ label: address.country });
    }
  }

  private async selectSavedAddressIfVisible(addressLine: string): Promise<boolean> {
    const addressSelect = this.addressSelect();
    const isVisible = await addressSelect.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isVisible) {
      return false;
    }

    const matchingOption = addressSelect.locator('option', { hasText: new RegExp(addressLine, 'i') }).first();

    if ((await matchingOption.count()) === 0) {
      return false;
    }

    const value = await matchingOption.getAttribute('value');
    const label = (await matchingOption.innerText()).trim();

    await addressSelect.selectOption(value ? { value } : { label });
    return true;
  }

  private async fillMobileNumberIfVisible(mobileNumber: string): Promise<void> {
    const mobileInput = this.byTestId('shipping-mobile-number-input')
      .or(this.byTestId('mobile-number-input'))
      .or(this.page.getByRole('textbox', { name: /mobile|phone|telephone/i }))
      .or(this.page.getByPlaceholder(/\+1\(999\)-999-9999/i))
      .or(this.page.locator('input[placeholder*="999"]'))
      .or(this.page.locator('input[type="tel"]').first())
      .first();

    if (await mobileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mobileInput.click();
      await mobileInput.fill('');
      if (mobileNumber) {
        await mobileInput.pressSequentially(mobileNumber);
      }
      await mobileInput.press('Tab');
    }
  }

  private async completeGuestCheckoutSectionIfVisible(): Promise<void> {
    const createAccountHeading = this.page.getByRole('heading', { name: /create an account/i }).first();

    if (!(await createAccountHeading.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }

    await this.enableGuestCheckoutIfVisible();
    await this.page.waitForTimeout(500);
    await this.fillGuestEmailIfVisible();
    await this.acceptGuestAgreementIfVisible();
  }

  private async enableGuestCheckoutIfVisible(): Promise<void> {
    const guestToggleLabel = this.page.getByText(/checkout as a guest user/i).first();

    if (!(await guestToggleLabel.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }

    if (await this.guestCheckoutIsEnabled()) {
      return;
    }

    await this.clickGuestToggleByLabel();
    await expect(this.guestEmailInput()).toBeVisible({ timeout: 10000 });
  }

  private async guestCheckoutIsEnabled(): Promise<boolean> {
    if (await this.guestPasswordInput().isVisible({ timeout: 500 }).catch(() => false)) {
      return false;
    }

    if (await this.guestEmailInput().isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }

    const guestToggleInput = this.guestToggleInput();

    return guestToggleInput
      .evaluate((element) => element instanceof HTMLInputElement && element.checked)
      .catch(() => false);
  }

  private async clickGuestToggleByLabel(): Promise<void> {
    const guestLabel = this.page.getByText(/checkout as a guest user/i).first();

    if (!(await guestLabel.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }

    const exactGuestSwitch = this.page.locator('xpath=//*[@id="card_section"]/div[7]/div/label/span').first();

    if (await exactGuestSwitch.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await exactGuestSwitch.click({ force: true });
      return;
    }

    const guestOptionRow = this.page
      .locator('xpath=//*[contains(normalize-space(), "Checkout as a Guest User")]/ancestor::*[self::label or self::div][contains(normalize-space(), "Checkout as a Guest User")][1]')
      .first();

    if (await guestOptionRow.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const box = await guestOptionRow.boundingBox();
      if (box) {
        await this.page.mouse.click(box.x + 35, box.y + box.height / 2);
        return;
      }
    }

    const visibleSwitch = this.page
      .locator('xpath=//*[contains(normalize-space(), "Checkout as a Guest User")]/preceding::*[@role="switch" or @role="checkbox" or self::button][1]')
      .first();

    if (await visibleSwitch.isVisible({ timeout: 500 }).catch(() => false)) {
      await visibleSwitch.click({ force: true });
      return;
    }

    const box = await guestLabel.boundingBox();
    if (box) {
      await this.page.mouse.click(box.x - 40, box.y + box.height / 2);
    }
  }

  private async fillGuestEmailIfVisible(): Promise<void> {
    const emailInput = await this.firstVisibleCheckoutLocator([this.guestEmailInput()], 3_000);

    if (emailInput) {
      await emailInput.fill(CheckoutPage.guestEmail);
      await emailInput.press('Tab');
    }
  }

  private async acceptGuestAgreementIfVisible(): Promise<void> {
    const agreeCheckbox = await this.firstVisibleCheckoutLocator([
      this.byTestId('guest-agree-checkbox'),
      this.byTestId('terms-and-conditions-checkbox'),
      this.page.getByRole('checkbox', { name: /agree|terms|condition|create account/i }).first(),
      this.page.locator('xpath=//*[contains(normalize-space(), "Terms of Service")]/preceding::input[@type="checkbox"][1]').first()
    ]);

    if (!agreeCheckbox) {
      return;
    }

    await this.ensureCheckboxChecked(agreeCheckbox);
  }

  private async firstVisibleCheckoutLocator(locators: Locator[], timeout = 2_000): Promise<Locator | undefined> {
    for (const locator of locators) {
      if (await locator.isVisible({ timeout }).catch(() => false)) {
        return locator;
      }
    }

    return undefined;
  }

  private guestEmailInput(): Locator {
    return this.byTestId('guest-email-input')
      .or(this.byTestId('checkout-email-input'))
      .or(this.page.locator('xpath=//*[contains(normalize-space(), "EMAIL ADDRESS")]/following::input[1]').first())
      .or(this.page.getByRole('textbox', { name: /email/i }).first())
      .or(this.page.getByPlaceholder(/email/i).first())
      .or(this.page.locator('input[type="email"]').first())
      .first();
  }

  private guestPasswordInput(): Locator {
    return this.page
      .locator('xpath=//*[contains(normalize-space(), "PASSWORD") or contains(normalize-space(), "Password")]/following::input[@type="password"][1]')
      .or(this.page.getByLabel(/^password$/i))
      .or(this.page.getByPlaceholder(/^password$/i))
      .first();
  }

  private guestToggleInput(): Locator {
    return this.byTestId('guest-checkout-option')
      .or(
        this.page
          .locator('label')
          .filter({ hasText: /checkout as a guest user/i })
          .locator('input[type="checkbox"], input[type="radio"]')
          .first()
      )
      .or(
        this.page
          .locator('xpath=//*[contains(normalize-space(), "Checkout as a Guest User")]/preceding::input[@type="checkbox" or @type="radio"][1]')
          .first()
      )
      .or(this.page.getByRole('checkbox', { name: /guest/i }).first())
      .or(this.page.getByRole('radio', { name: /guest/i }).first())
      .first();
  }

  private async selectNoPaymentRequiredIfVisible(): Promise<void> {
    const paymentSelect = this.byTestId('payment-method-select')
      .or(this.page.getByRole('combobox', { name: /payment/i }))
      .or(
        this.page
          .locator('select')
          .filter({ has: this.page.locator('option', { hasText: /no payment information required/i }) })
      )
      .first();

    if (await paymentSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.selectOptionByText(paymentSelect, /no payment information required/i);
      return;
    }

    const paymentOption = this.page.getByRole('radio', { name: /no payment information required/i }).first();

    if (await paymentOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paymentOption.check({ force: true });
    }
  }

  private async acceptTermsIfVisible(): Promise<void> {
    const termsCheckbox = this.byTestId('terms-and-conditions-checkbox')
      .or(this.page.getByRole('checkbox', { name: /terms|condition/i }))
      .first();

    if (!(await termsCheckbox.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }

    await this.ensureCheckboxChecked(termsCheckbox);
  }

  private async ensureCheckboxChecked(checkbox: Locator): Promise<void> {
    await checkbox.evaluate((element) => {
      if (element instanceof HTMLInputElement) {
        if (element.checked) {
          return;
        }

        element.checked = true;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  private firstNameInput() {
    return this.byTestId('shipping-first-name-input')
      .or(this.page.getByRole('textbox', { name: /first name/i }))
      .or(this.page.getByPlaceholder(/mark/i))
      .first();
  }

  private lastNameInput() {
    return this.byTestId('shipping-last-name-input')
      .or(this.page.getByRole('textbox', { name: /last name/i }))
      .or(this.page.getByPlaceholder(/rogers/i))
      .first();
  }

  private addressLine1Input() {
    return this.byTestId('shipping-address-line-1-input')
      .or(this.page.getByRole('textbox', { name: /^address 1$/i }))
      .or(this.page.getByPlaceholder(/^address 1$/i))
      .first();
  }

  private cityInput() {
    return this.byTestId('shipping-city-input')
      .or(this.page.getByRole('textbox', { name: /city/i }))
      .or(this.page.getByPlaceholder(/enter city name/i))
      .first();
  }

  private postalCodeInput() {
    return this.byTestId('shipping-postal-code-input')
      .or(this.page.getByRole('textbox', { name: /zip|postal/i }))
      .or(this.page.getByPlaceholder(/enter zip code/i))
      .first();
  }

  private stateField() {
    const californiaOption = this.page.locator('option', { hasText: /^California$/ });

    return this.byTestId('shipping-state-input')
      .or(this.page.getByRole('textbox', { name: /state/i }))
      .or(this.page.getByRole('combobox', { name: /state/i }))
      .or(this.page.locator('select').filter({ has: californiaOption }))
      .first();
  }

  private countrySelect() {
    const unitedStatesOption = this.page.locator('option', { hasText: /^United States$/ });

    return this.byTestId('shipping-country-select')
      .or(this.page.getByRole('combobox', { name: /country/i }))
      .or(this.page.locator('select').filter({ has: unitedStatesOption }))
      .first();
  }

  private async selectOptionByText(select: Locator, text: RegExp): Promise<void> {
    const option = select.locator('option').filter({ hasText: text }).first();
    const value = await option.getAttribute('value');
    const label = (await option.innerText()).trim();

    await select.selectOption(value ? { value } : { label });
  }

  private parseCurrencyValue(text: string): number {
    const currencyMatch = text.match(/\border\s+total\b\s*:?\s*\$?\s*([0-9,]+(?:\.[0-9]{2})?)/i)
      ?? text.match(/\$?\s*([0-9,]+(?:\.[0-9]{2})?)/);

    if (!currencyMatch) {
      throw new Error(`Unable to parse checkout total from text: "${text}"`);
    }

    return Number(currencyMatch[1].replace(/,/g, ''));
  }

  private placeOrderButton() {
    return this.byTestId('place-order-button')
      .or(this.page.getByRole('button', { name: /place order/i }))
      .first();
  }

  private addressSelect() {
    const addressOption = this.page.locator('option', { hasText: /add a new address|100 north carolwood drive/i });

    return this.byTestId('shipping-address-select')
      .or(this.page.locator('select').filter({ has: addressOption }))
      .or(this.page.getByRole('combobox', { name: /address/i }))
      .first();
  }
}
