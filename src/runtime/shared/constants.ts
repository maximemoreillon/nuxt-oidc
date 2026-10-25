export const tokensCookieName = "nuxt-oidc-tokens";
export const verifierCookieName = "nuxt-oidc-verifier";
export const stateCookieName = "nuxt-oidc-state";
export const hrefCookieName = "nuxt-oidc-href";
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
