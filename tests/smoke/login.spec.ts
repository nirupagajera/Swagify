import { customerAccount, invalidCustomerAccount } from '../../src/fixtures/accounts';
import { test } from '../../src/fixtures/test';

test.describe('Login @smoke', () => {
  test('registered customer can sign in with valid credentials', async ({ loginPage }) => {
    const account = customerAccount();

    await loginPage.goto();
    await loginPage.login(account);

    await loginPage.expectSignedIn();
  });

  test('customer cannot sign in with invalid credentials', async ({ loginPage }) => {
    const account = invalidCustomerAccount();

    await loginPage.goto();
    await loginPage.login(account);

    await loginPage.expectLoginError();
  });
});
