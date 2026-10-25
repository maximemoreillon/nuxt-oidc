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
    },
  },
});
```

| Variable        | Environment variable          | Description                                                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `oidcAuthority` | `NUXT_PUBLIC_OIDC_AUTHORITY`  | URL of the OIDC provider, where `/.well-known/openid-configuration` is served (required)  |
| `oidcClientId`  | `NUXT_PUBLIC_OIDC_CLIENT_ID`  | OIDC client ID (required)                                                                  |
| `oidcAudience`  | `NUXT_PUBLIC_OIDC_AUDIENCE`   | Sent as the `audience` parameter (Auth0) and checked in the access token's `aud` claim     |

At the provider, register a public client (no client secret) with `<your app origin>/api/oauth/callback` as redirect URI.

## How it works

- **Pages:** a global route middleware sends users who are not logged in to the provider, then back to the page they asked for
- **API routes:** a server middleware protects every `/api/**` route. It reads the access token from the module's cookie or from an `Authorization: Bearer` header, and verifies its signature, issuer and (if `oidcAudience` is set) audience. Requests without a valid token get a 401
- **Tokens** are stored in a cookie, so they are available during server-side rendering, and refreshed automatically when they expire

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
- The scope is fixed to `openid profile offline_access`
- Requires Node.js 20 or later on the server

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
