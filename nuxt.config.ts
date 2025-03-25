// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      oidcAuthority: "",
      oidcClientId: "",
    },
  },
  modules: ["./modules/auth"],
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
});
