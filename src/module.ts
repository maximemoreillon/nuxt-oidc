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
    const resolver = createResolver(import.meta.url);

    addServerHandler({
      handler: resolver.resolve("./runtime/server/middleware"),
    });

    addRouteMiddleware({
      name: "auth",
      path: resolver.resolve("./runtime/middleware/routeMiddleware"),
      global: true,
    });

    // addImports({
    //   name: "useAuth",
    //   as: "useAuth",
    //   from: resolve("runtime/composables/useAuth"),
    // });

    addImportsDir(resolver.resolve("runtime/composables"));
  },
});
