import {
  defineNuxtModule,
  createResolver,
  addServerHandler,
  addRouteMiddleware,
  addImports,
  addImportsDir,
} from "nuxt/kit";
import { defu } from "defu";

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

    // Runtime Config
    // nuxt.options.runtimeConfig.oidc = defu(nuxt.options.runtimeConfig.oidc, {
    //   ...options,
    // });

    addServerHandler({
      handler: resolve("./runtime/server/middleware"),
    });

    addRouteMiddleware({
      name: "auth",
      path: resolve("./runtime/middleware/routeMiddleware"),
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
