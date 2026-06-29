export type TestEnvironment = 'production';

export type EnvironmentConfig = {
  name: TestEnvironment;
  baseURL: string;
  websiteAccessPassword?: string;
};

export function getTestEnvironment(): TestEnvironment {
  return 'production';
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getTestEnvironment();
  const productionBaseUrl = process.env.PRODUCTION_BASE_URL?.trim();
  const websiteAccessPassword = process.env.WEBSITE_ACCESS_PASSWORD?.trim();
  const config: EnvironmentConfig = {
    name: env,
    baseURL: productionBaseUrl || 'https://www.swagify.com/',
    websiteAccessPassword:
      websiteAccessPassword && websiteAccessPassword !== 'replace-me' ? websiteAccessPassword : undefined
  };

  if (!config.baseURL || config.baseURL.includes('.example')) {
    throw new Error(`Missing real ${config.name} base URL. Create a .env file and set PRODUCTION_BASE_URL.`);
  }

  return config;
}
