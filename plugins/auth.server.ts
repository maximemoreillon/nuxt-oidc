export default defineNuxtPlugin({
  name: "oidc-auth",
  enforce: "pre", // or 'post'
  async setup(nuxtApp) {
    // Might need to check if api is requested or not
  },
  hooks: {
    // You can directly register Nuxt app runtime hooks here
    "app:created"() {
      const nuxtApp = useNuxtApp();
      // do something in the hook
    },
  },
  env: {
    // Set this value to `false` if you don't want the plugin to run when rendering server-only or island components.
    islands: true,
  },
});
