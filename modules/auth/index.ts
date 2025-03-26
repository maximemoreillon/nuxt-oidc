// `nuxt/kit` is a helper subpath import you can use when defining local modules
// that means you do not need to add `@nuxt/kit` to your project's dependencies
import {
  createResolver,
  defineNuxtModule,
  addServerHandler,
  addRouteMiddleware,
} from "nuxt/kit";
// import routeMiddleware from "./routeMiddleware";

export default defineNuxtModule({
  meta: {
    name: "auth",
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);

    console.log("Hi module!");

    addServerHandler({
      handler: resolve("./runtime/serverMiddleware"),
    });

    addRouteMiddleware({
      name: "auth",
      path: resolve("./runtime/routeMiddleware"),
      global: true,
    });
  },
});
