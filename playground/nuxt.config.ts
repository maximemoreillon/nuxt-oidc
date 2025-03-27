export default defineNuxtConfig({
  modules: ["../src/module"],
  oidc: {},
  devtools: { enabled: true },
  compatibilityDate: "2025-03-27",
  runtimeConfig: {
    public: {
      oidcAuthority: "",
      oidcClientId: "",
    },
  },
});
