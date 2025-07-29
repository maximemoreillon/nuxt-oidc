import { useAuth } from "../composables/auth";

import { defineNuxtRouteMiddleware, navigateTo } from "#imports";

export default defineNuxtRouteMiddleware(async (to, from) => {
  // NOTE: does not run for server routes such as /api/oauth/callback
  // NOTE: Must be as server-side as possible to prevent client from seeing anything if unauthorized

  const { init } = useAuth();

  // // NOTE: navigateTo must be used here for some reason
  const url = await init();
  if (url) return navigateTo(url, { external: true });
});
