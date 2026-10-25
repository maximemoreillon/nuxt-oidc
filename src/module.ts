import {
  defineNuxtModule,
  createResolver,
  addServerHandler,
  addRouteMiddleware,
  addImportsDir,
} from "@nuxt/kit";
import { loginPath, redirectPath } from "./runtime/shared/constants";

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "oidc",
    configKey: "oidc",
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);

    // TODO: Ideally, would want to fetch OIDC config here and share it with all components
    // PROBLEM: environment variables are not injected yet!

    // Server middleware protects API routes
    addServerHandler({
      handler: resolve("./runtime/server/middleware/auth"),
    });

    // Login server route, generates the PKCE pair and redirects to the OIDC provider
    addServerHandler({
      route: loginPath,
      handler: resolve("./runtime/server/api/oauth/login"),
    });

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
