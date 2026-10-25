# Nuxt OIDC

A simple module to perform OIDC authentication. Only PKCE is supported.
Tested with Auth0 and Keycloak.

## Install

Via NPM:

```
npm i @moreillon/nuxt-oidc
```

## Setup

Configure the `oidcClientId` and `oidcAuthority` public `runtimeConfig` variables:

```ts
export default defineNuxtConfig({
  // ...

  modules: ["@moreillon/nuxt-oidc"],

  runtimeConfig: {
    public: {
      oidcClientId: "",
      oidcAuthority: "",
      // ...
    },
  },
});
```

## Dev

### Publishing

Pushing a tag publishes the package to NPM via GitHub Actions:

```
npm version patch
git push --follow-tags
```
