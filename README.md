# Nuxt OIDC

A simple module to perform OIDC authentication.

⚠️ This module was created to be used instead of Nuxt OIDC Auth which was causing issues that the time.
However, Nuxt Auth Utils provides all the features of this module so further development on the latter will be stopped.

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

```
npm run release
```
