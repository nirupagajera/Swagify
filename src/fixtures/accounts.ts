export type TestAccount = {
  email: string;
  password: string;
};

const fallbackPassword = 'Nirupa@1234';
const placeholderStrings = new Set([
  'replace-me',
  'CHANGE_ME',
  'change-me',
  '',
  'nirupa@krishaweb.com'
]);
const placeholderEmails = new Set([
  'prod.smoke@example.com'
]);

function isValidValue(raw?: string): raw is string {
  const trimmed = raw?.trim();
  return !!trimmed && !placeholderStrings.has(trimmed);
}

function isInvalidEmail(raw?: string): boolean {
  const trimmed = raw?.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    placeholderEmails.has(trimmed) ||
    trimmed.endsWith('@example.com') ||
    placeholderStrings.has(trimmed)
  );
}

function getEnvValue(key: string): string | undefined {
  const raw = process.env[key]?.trim();
  return isValidValue(raw) && !isInvalidEmail(raw) ? raw : undefined;
}

export function customerAccount(): TestAccount {
  return {
    email: getEnvValue('PRODUCTION_CUSTOMER_EMAIL') ?? 'nirupa@krishaweb.com',
    password: getEnvValue('PRODUCTION_CUSTOMER_PASSWORD') ?? fallbackPassword
  };
}

export function invalidCustomerAccount(): TestAccount {
  return {
    email: process.env.INVALID_CUSTOMER_EMAIL?.trim() || 'invalid.customer@example.com',
    password: process.env.INVALID_CUSTOMER_PASSWORD?.trim() || 'Invalid@1234'
  };
}
