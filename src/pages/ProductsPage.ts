import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  private static readonly productQuantity = '250';
  private static readonly defaultZipCode = '90077';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/products');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.firstProductCard()).toBeVisible();
    await expect(this.pageTitle()).toBeAttached();
  }

  async expectFiltersVisible(): Promise<void> {
    await expect(this.filtersTab()).toBeVisible();
  }

  async searchAndOpenFirstProduct(productName: string): Promise<void> {
    const searchField = this.searchInput();

    await expect(searchField).toBeVisible({ timeout: 10000 });
    await searchField.click();
    await searchField.fill('');
    await searchField.fill(productName);
    await searchField.press('Enter');

    const firstProductCard = this.firstProductCard();
    await expect(firstProductCard).toBeVisible({ timeout: 30000 });

    const firstProductLink = firstProductCard.locator('a').first();
    const targetToClick = (await firstProductLink.count()) > 0 ? firstProductLink : firstProductCard;

    await targetToClick.scrollIntoViewIfNeeded();

    await Promise.all([
      this.page.waitForURL(/\/products\/.+/, { timeout: 30000 }),
      targetToClick.click({ force: true }),
    ]);
  }

  async addProductToCart(): Promise<void> {
    await this.page.waitForURL(/\/products\/.+/, { timeout: 10000 });

    await this.configureProductOptions();
    await this.handleProductDesignStepIfVisible();
    await this.calculateShippingIfAvailable();
    await this.clickAddToCart();
  }

  private async configureProductOptions(): Promise<void> {
    await this.selectAnyColorIfVisible();
    await this.enterQuantity(ProductsPage.productQuantity);
    await this.selectSubmitDesignLaterIfVisible();
    await this.clickNextButtonIfVisible();
  }

  private async enterQuantity(quantity: string): Promise<void> {
    const quantityInput = this.quantityInput();

    await expect(quantityInput).toBeVisible({ timeout: 10000 });
    await this.setInputValue(quantityInput, quantity);
    await expect(quantityInput).toHaveValue(quantity, { timeout: 5000 });
  }

  private async handleProductDesignStepIfVisible(): Promise<void> {
    const dropdown = this.productDesignDropdown();
    const isVisible = await dropdown
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!isVisible) {
      return;
    }

    await dropdown.selectOption({ label: 'No, I want a blank product' });
    await this.clickNextButtonIfVisible();
  }

  private async calculateShippingIfAvailable(): Promise<void> {
    const zipInput = this.zipInput();

    await expect(zipInput).toBeVisible({ timeout: 10000 });
    await this.selectSubmitDesignLaterIfVisible();
    await zipInput.fill(process.env.SMOKE_ZIP_CODE ?? ProductsPage.defaultZipCode);
    await zipInput.press('Tab');

    const getRatesButton = this.getRatesButton();

    await expect(getRatesButton).toBeVisible({ timeout: 10000 });
    await expect(getRatesButton).toBeEnabled({ timeout: 10000 });

    await this.dismissEstimatedCostPopup();
    await this.clickStable(getRatesButton);
    await this.selectShippingRateIfVisible();
  }

  private async selectShippingRateIfVisible(): Promise<void> {
    const rateOption = this.shippingRateOption();
    const isVisible = await rateOption
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (isVisible) {
      await rateOption.click({ force: true });
    }
  }

  private async clickAddToCart(): Promise<void> {
    const addToCartButton = this.addToCartButton();

    await this.dismissEstimatedCostPopup();
    await expect(addToCartButton).toBeVisible({ timeout: 10000 });
    await expect(addToCartButton).toBeEnabled({ timeout: 10000 });

    const cartNavigation = this.page
      .waitForURL(/\/cart(?:[/?#]|$)/, { timeout: 30_000 })
      .catch(() => undefined);

    await this.clickStable(addToCartButton);
    await cartNavigation;
  }

  private async selectAnyColorIfVisible(): Promise<void> {
    const colorOption = this.byTestId('color-option')
      .or(this.page.locator('#color-swatches .colors-radio:visible').first())
      .or(this.page.locator('#color-swatches input[type="radio"]:visible').first())
      .or(this.page.locator('main .colors-radio:visible').first())
      .or(
        this.page.locator('main [aria-label*="color" i]:visible, main [title*="color" i]:visible').first()
      )
      .first();

    if (await colorOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await colorOption.click({ force: true });
    }
  }

  private quantityInput(): Locator {
    return this.byTestId('quantity-input')
      .or(this.page.locator('#multi_size_selector input:visible').first())
      .or(this.page.locator('input[type="number"]:visible').first())
      .or(this.page.getByRole('spinbutton').first())
      .first();
  }

  private async setInputValue(input: Locator, value: string): Promise<void> {
    await input.evaluate((element, nextValue) => {
      const inputElement = element as HTMLInputElement;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

      nativeSetter?.call(inputElement, nextValue);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      inputElement.blur();
    }, value);
  }

  private async selectSubmitDesignLaterIfVisible(): Promise<void> {
    const artworkSelect = this.byTestId('artwork-option')
      .or(this.page.getByLabel(/artwork option/i))
      .or(
        this.page
          .locator('select')
          .filter({ has: this.page.locator('option', { hasText: /submit design later|upload design now/i }) })
      )
      .first();

    if (!(await artworkSelect.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }

    const selectedText = await artworkSelect.locator('option:checked').innerText().catch(() => '');
    if (/submit design later/i.test(selectedText)) {
      return;
    }

    const optionValues = await artworkSelect.locator('option').evaluateAll((options) =>
      options.map((option) => ({
        label: option.textContent?.trim() ?? '',
        value: option.getAttribute('value') ?? ''
      }))
    );
    const laterOption = optionValues.find((option) => /submit design later/i.test(option.label));

    if (laterOption) {
      await artworkSelect.selectOption(laterOption.value ? { value: laterOption.value } : { label: laterOption.label });
      await expect(artworkSelect).toHaveValue(laterOption.value, { timeout: 5000 });
      return;
    }

    await artworkSelect.selectOption({ index: 1 });
  }

  private zipInput(): Locator {
    return this.byTestId('zip-code-input')
      .or(this.page.getByLabel('Zip Code'))
      .or(this.page.getByRole('textbox', { name: /zip|postal code/i }))
      .first();
  }

  private getRatesButton(): Locator {
    return this.byTestId('get-rates-button')
      .or(this.page.getByRole('button', { name: /get rates/i }))
      .first();
  }

  private shippingRateOption(): Locator {
    return this.byTestId('rate-option')
      .or(this.page.getByRole('radio'))
      .or(this.page.locator('[class*="rate"], [class*="shipping"]').filter({ hasText: /\$|USD|Ground|Shipping/i }))
      .first();
  }

  private addToCartButton(): Locator {
    return this.byTestId('add-to-cart-button')
      .or(this.page.getByRole('button', { name: /add to cart/i }))
      .first();
  }

  private productDesignDropdown() {
    const blankProductOption = this.page.locator('option', { hasText: /^No, I want a blank product$/ });

    return this.byTestId('product-design')
      .or(this.page.locator('select').filter({ has: blankProductOption }))
      .first();
  }

  private async clickNextButtonIfVisible(): Promise<void> {
    const nextButton = this.byTestId('next-button')
      .or(this.page.getByRole('button', { name: /next/i }))
      .first();

    if (await nextButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await super.clickStable(nextButton);
    }
  }

  private async dismissEstimatedCostPopup(): Promise<void> {
    const estimatedCostPopup = this.page
      .locator('div:visible')
      .filter({ hasText: /Estimated Cost/i })
      .last();

    const popupIsVisible = await estimatedCostPopup
      .waitFor({ state: 'visible', timeout: 1000 })
      .then(() => true)
      .catch(() => false);

    if (!popupIsVisible) {
      return;
    }

    const closeButton = estimatedCostPopup
      .getByRole('button', { name: /^(x|close|×)$/i })
      .or(estimatedCostPopup.locator('button, [role="button"]').filter({ hasText: /^(x|×)$/i }))
      .first();

    if (await closeButton.count()) {
      await closeButton.click({ force: true });
      await expect(estimatedCostPopup).toBeHidden({ timeout: 5000 });
    }
  }

  private async hideDebugToolbar(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        #phpdebugbar,
        .phpdebugbar,
        .phpdebugbar-maximize-btn,
        [data-phpdebugbar],
        [class*="phpdebugbar"],
        [id*="phpdebugbar"],
        body > div[data-theme][data-hideemptytabs] {
          display: none !important;
          pointer-events: none !important;
        }
      `
    }).catch(() => undefined);
  }

  protected override async clickStable(locator: Locator): Promise<void> {
    await this.hideDebugToolbar();
    await super.clickStable(locator);
  }

  async openCart(): Promise<void> {
    if (/\/cart(?:[/?#]|$)/.test(this.page.url())) {
      return;
    }

    const reachedCart = await this.page
      .waitForURL(/\/cart(?:[/?#]|$)/, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (reachedCart) {
      return;
    }

    await this.page.goto('/cart');
  }

  private pageTitle() {
    return this.byTestId('products-page-title')
      .or(this.page.getByRole('heading', { name: 'All Products', level: 1 }))
      .first();
  }

  private firstProductCard() {
    return this.byTestId('product-card')
      .or(this.page.locator('main').getByRole('heading', { level: 3 }))
      .first();
  }

  private filtersTab() {
    return this.byTestId('products-filter-tab')
      .or(this.page.getByRole('button', { name: 'Categories' }))
      .first();
  }

  private searchInput() {
    return this.byTestId('product-search-input')
      .or(this.page.getByRole('textbox', { name: /search swagify/i }))
      .first();
  }
}
