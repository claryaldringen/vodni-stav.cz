const OAUTH_PROVIDERS = [
  { id: 'google', envId: 'AUTH_GOOGLE_ID', envSecret: 'AUTH_GOOGLE_SECRET' },
  { id: 'github', envId: 'AUTH_GITHUB_ID', envSecret: 'AUTH_GITHUB_SECRET' },
  { id: 'facebook', envId: 'AUTH_FACEBOOK_ID', envSecret: 'AUTH_FACEBOOK_SECRET' },
  { id: 'apple', envId: 'AUTH_APPLE_ID', envSecret: 'AUTH_APPLE_SECRET' },
] as const;

export const getEnabledOAuthProviders = (): string[] =>
  OAUTH_PROVIDERS.filter((p) => process.env[p.envId] && process.env[p.envSecret]).map((p) => p.id);
