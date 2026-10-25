export const defaultScope = "openid profile offline_access";
export const defaultCookiePrefix = "nuxt-oidc";
// Single cookie that held all tokens in versions up to 0.6
export const legacyTokensCookieName = "nuxt-oidc-tokens";

// Tokens are stored in one cookie each, to stay under the browser limit of 4 KB per cookie
export const getCookieNames = (prefix: string) => ({
  access: `${prefix}-access`,
  refresh: `${prefix}-refresh`,
  id: `${prefix}-id`,
  verifier: `${prefix}-verifier`,
  state: `${prefix}-state`,
  href: `${prefix}-href`,
});

export const cookieOptions = { maxAge: 31536000 };
// Short-lived cookies only needed between the login and callback routes
export const flowCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  maxAge: 600,
} as const;

export const oauthRoutes = "/api/oauth";
export const loginPath = `${oauthRoutes}/login`;
export const redirectPath = `${oauthRoutes}/callback`;
