import {
  createResolver,
  defineNuxtModule,
  addServerHandler,
  addRouteMiddleware,
  addImports,
  addImportsDir,
} from "nuxt/kit";

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "oidc",
    configKey: "oidc",
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url);

    addServerHandler({
      handler: resolve("./runtime/server/middleware"),
    });

    addRouteMiddleware({
      name: "auth",
      path: resolve("./runtime/routeMiddleware"),
      global: true,
    });

    // addImports({
    //   name: "useAuth",
    //   as: "useAuth",
    //   from: resolve("runtime/composables/useAuth"),
    // });

    addImportsDir(resolve("runtime/composables"));
  },
});
