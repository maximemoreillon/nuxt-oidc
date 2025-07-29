import {
  defineNuxtModule,
  createResolver,
  addServerHandler,
  addRouteMiddleware,
  addImportsDir,
} from "@nuxt/kit";
import { oauthRoutes, redirectPath } from "./runtime/shared/constants";
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
  // Apparently, setup can be async
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    // TODO: Ideally, would want to fetch OIDC config here and share it with all components
    // Could use "Exposing Options to Runtime" from https://nuxt.com/docs/4.x/guide/going-further/modules#exposing-options-to-runtime
    // PROBLEM: environment variables are not injected yet!
    // const { oidcAuthority } = nuxt.options.runtimeConfig.public

    // Server middleware protects API routes
    addServerHandler({
      handler: resolve("./runtime/server/middleware/auth"),
    });

    // Login server route
    // addServerHandler({
    //   route: `${oauthRoutes}/login`,
    //   handler: resolve("./runtime/server/api/oauth/login"),
    // });

    // Callback server route
    addServerHandler({
      route: redirectPath,
      handler: resolve("./runtime/server/api/oauth/callback"),
    });

    // Route middleware used to protect every page and handle redirects from OIDC provider
    addRouteMiddleware({
      name: "auth",
      path: resolve("./runtime/middleware/routeMiddleware"),
      global: true,
    });

    // Injecting all composables
    addImportsDir(resolve("runtime/composables"));
  },
});
