# Nuxt OIDC

A Nuxt module for OpenID Connect authentication (authorization code flow with PKCE). Tested with Auth0 and Keycloak.

## Why this module exists

This module exists to cover Nuxt apps **served over plain HTTP**, for example on a local network or behind a reverse proxy that doesn't terminate TLS. Mainstream solutions don't work in that case:

- Browsers only expose `crypto.subtle` (needed to compute the PKCE challenge) on HTTPS pages and `localhost`
- Modules such as [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) set their login cookies with the `Secure` flag in production, which browsers drop over HTTP

To work around this, PKCE is done server-side and no cookie is marked `Secure`. If your app is served over HTTPS, a well-established module such as nuxt-auth-utils is a better fit.

## Related packages

| Package                                                                    | For                                     |
| -------------------------------------------------------------------------- | --------------------------------------- |
| [@moreillon/nuxt-oidc](https://www.npmjs.com/package/@moreillon/nuxt-oidc) | Nuxt apps (this package)                |
| [@moreillon/vue-oidc](https://www.npmjs.com/package/@moreillon/vue-oidc)   | Vue 3 single-page apps                  |
| [@moreillon/oidc-auth](https://www.npmjs.com/package/@moreillon/oidc-auth) | Any browser app, framework-agnostic     |

## Installation

```bash
npm install @moreillon/nuxt-oidc
```

## Setup

Add the module and declare its public `runtimeConfig` variables:

```ts
export default defineNuxtConfig({
  modules: ["@moreillon/nuxt-oidc"],

  runtimeConfig: {
    public: {
      oidcAuthority: "",
      oidcClientId: "",
      oidcAudience: "",
      oidcScope: "",
      oidcCookiePrefix: "",
    },
  },
});
```

| Variable        | Environment variable          | Description                                                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `oidcAuthority` | `NUXT_PUBLIC_OIDC_AUTHORITY`  | URL of the OIDC provider, where `/.well-known/openid-configuration` is served (required)  |
| `oidcClientId`  | `NUXT_PUBLIC_OIDC_CLIENT_ID`  | OIDC client ID (required)                                                                  |
| `oidcAudience`  | `NUXT_PUBLIC_OIDC_AUDIENCE`   | Sent as the `audience` parameter (Auth0) and checked in the access token's `aud` claim     |
| `oidcScope`     | `NUXT_PUBLIC_OIDC_SCOPE`      | Requested scopes. Defaults to `openid profile offline_access` (`offline_access` is needed for token refresh) |
| `oidcCookiePrefix` | `NUXT_PUBLIC_OIDC_COOKIE_PREFIX` | Prefix of the module's cookie names, to run several apps on the same host. Defaults to `nuxt-oidc` |

At the provider, register a public client (no client secret) with `<your app origin>/api/oauth/callback` as redirect URI.

## How it works

- **Pages:** a global route middleware sends users who are not logged in to the provider, then back to the page they asked for
- **API routes:** a server middleware protects every `/api/**` route. It reads the access token from the module's cookie or from an `Authorization: Bearer` header, and verifies its signature, issuer and (if `oidcAudience` is set) audience. Requests without a valid token get a 401
- **Tokens** are stored in cookies, one per token to stay under the 4 KB limit per cookie, so they are available during server-side rendering. The browser refreshes them shortly before they expire, and only logs the user out when the provider rejects the refresh token

The module adds two server routes: `/api/oauth/login` and `/api/oauth/callback`.

## Usage

### `useAuth()`

Auto-imported composable:

```vue
<script setup lang="ts">
const { user, logout } = useAuth();
</script>

<template>
  <p>Hello {{ user.name }}</p>
  <button @click="logout()">Log out</button>
</template>
```

| Property               | Type                            | Description                                                         |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------- |
| `user`                 | `Ref<User>`                     | User info from the provider's userinfo endpoint                     |
| `tokenSet`             | `Ref<TokenSet \| undefined>`    | Access, refresh and ID tokens, with their expiry date               |
| `oidcConfig`           | `Ref<OidcConfig>`               | The provider's OpenID configuration                                 |
| `login(redirect?)`     | `(redirect = "/") => void`      | Send the user to the provider, then back to `redirect`              |
| `logout()`             | `() => void`                    | Clear the tokens and log out at the provider                        |
| `refreshAccessToken()` | `() => Promise<TokenSet>`       | Refresh the tokens now                                              |

### In server routes

The verified access token payload is available as `event.context.user`:

```ts
export default defineEventHandler((event) => {
  return { sub: event.context.user.sub };
});
```

## Limitations

- Login is enforced on every page and every `/api/**` route, with no opt-out yet
- Requires Node.js 20 or later on the server
- Each tab refreshes tokens on its own, so refresh token rotation at the provider can log users with several tabs open out
- API routes do not refresh tokens: requests made with an expired access token get a 401

## Upgrading from 0.6

Tokens used to be stored in a single `nuxt-oidc-tokens` cookie, which is no longer read: users have to log in again once.

## Development

```bash
npm install
npm run dev:prepare
npm run dev
```

### Publishing

Pushing a tag publishes the package to NPM via GitHub Actions:

```bash
npm version patch
git push --follow-tags
```
