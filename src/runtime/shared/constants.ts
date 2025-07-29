export const tokensCookieName = "nuxt-oidc-tokens";
export const verifierCookieName = "nuxt-oidc-verifier";
export const hrefCookieName = "nuxt-oidc-href";
export const cookieOptions = { maxAge: 31536000 };

export const oauthRoutes = "/api/oauth";
export const redirectPath = `${oauthRoutes}/callback`;
