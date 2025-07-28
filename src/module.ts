import {
  defineNuxtModule,
  createResolver,
  addServerHandler,
  addRouteMiddleware,
  addImportsDir,
} from "@nuxt/kit";

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "oidc",
    configKey: "oidc",
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    // Server middleware protects API routes
    // addServerHandler({
    //   handler: resolve("./runtime/server/middleware/auth"),
    // });

    addServerHandler({
      route: "/api/oauth/callback",
      handler: resolve("./runtime/server/api/oauth/callback"),
    });

    // Route middleware used to protect every page and handle redirects from OIDC provider
    // addRouteMiddleware({
    //   name: "auth",
    //   path: resolve("./runtime/middleware/routeMiddleware"),
    //   global: true,
    // });

    // addImports({
    //   name: "useAuth",
    //   as: "useAuth",
    //   from: resolve("runtime/composables/useAuth"),
    // });

    addImportsDir(resolve("runtime/composables"));
  },
});
