# Swagify Automation

Playwright TypeScript automation framework for Swagify ecommerce testing.

## What is included

- Reusable page objects in `src/pages`
- Shared fixtures in `src/fixtures`
- Production environment support
- `data-testid` selector conventions for stable automation
- Playwright HTML, JSON, trace, screenshot, and video reporting
- Custom dashboard at `reports/dashboard/index.html`
- GitHub Actions workflow in `.github/workflows/playwright.yml`

## Setup

```bash
npm install
npx playwright install
cp .env.example .env
```

Update `.env` with production credentials, URLs, and `WEBSITE_ACCESS_PASSWORD` if the site is protected by a password gate.

## Run tests

```bash
npm test
npm run test:production
npm run test:ci
npm run report
npm run dashboard
```

`npm run test:production` runs tests tagged `@smoke`. `npm test` runs the full suite, including checkout.
`npm run test:ci` runs smoke tests in headless CI mode.

## Jenkins

This repo includes a declarative [Jenkinsfile](Jenkinsfile) for Playwright CI.

For a Jenkins freestyle job, use [run.bat](run.bat) in an **Execute Windows batch command** step.

```bat
cd /d C:\Swagify\Swagify_Automation
set TEST_SUITE=checkout
call run.bat
```

Supported `TEST_SUITE` values:

- `checkout`: cart and checkout tests. This may place a production order.
- `smoke`: login and product smoke tests.
- `full`: all tests. This may place a production order.

### Jenkins prerequisites

- Node.js available on the Jenkins agent
- Jenkins plugins:
  - Pipeline
  - Credentials Binding
  - HTML Publisher
  - JUnit

### Jenkins credentials

Create these credentials in Jenkins before running the job:

- `swagify-production-base-url`: Secret text containing the production base URL
- `swagify-website-access-password`: Secret text containing the website access password, or an empty value if not needed
- `swagify-production-customer`: Username with password credential
  - Username: production customer email
  - Password: production customer password

### Jenkins job setup

1. Create a Pipeline job.
2. Set Pipeline definition to `Pipeline script from SCM`.
3. Select this repository and set Script Path to `Jenkinsfile`.
4. Build with the default `TEST_SUITE=smoke` parameter for safe CI coverage.
5. Use `TEST_SUITE=full` only when you intentionally want to run the full suite, because it includes the checkout order-placement flow.

The Jenkins build publishes:

- JUnit results from `reports/junit/results.xml`
- Playwright HTML report from `playwright-report/index.html`
- Custom dashboard from `reports/dashboard/index.html`
- Archived artifacts from `playwright-report`, `reports`, and `test-results`

## Required app test IDs

Add these `data-testid` attributes in the Swagify application wherever possible:

- Login: `login-email-input`, `login-password-input`, `login-submit-button`, `account-status-label`
- Website access gate: `website-password-input`, `website-access-submit-button`
- Product catalog: `products-page-title`, `product-card`, `products-filter-tab`, `product-search-input`, `add-to-cart-{productSlug}-button`
- Navigation/cart: `cart-tab`, `cart-item-{productSlug}`, `checkout-button`
- Checkout: `shipping-first-name-input`, `shipping-last-name-input`, `shipping-address-line-1-input`, `shipping-city-input`, `shipping-state-input`, `shipping-postal-code-input`, `shipping-country-select`, `place-order-button`, `order-status-label`
- Dashboard: `dashboard-title`, `dashboard-total-count`, `dashboard-passed-count`, `dashboard-failed-count`, `dashboard-skipped-count`, `dashboard-pass-rate`, `dashboard-results-table`

## GitHub Actions secrets

Create these repository secrets before enabling CI:

- `PRODUCTION_BASE_URL`
- `WEBSITE_ACCESS_PASSWORD`
- `PRODUCTION_CUSTOMER_EMAIL`
- `PRODUCTION_CUSTOMER_PASSWORD`
