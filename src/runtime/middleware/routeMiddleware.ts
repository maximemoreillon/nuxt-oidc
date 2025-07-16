import { useAuth } from "../composables/auth";

import { defineNuxtRouteMiddleware, navigateTo } from "#imports";

export default defineNuxtRouteMiddleware(async (to, from) => {
  // NOTE: do not have this client-only so as to redirect server-side
  const { init } = useAuth();

  // NOTE: navigateTo must be used here for some reason
  const url = await init();
  if (url) return navigateTo(url, { external: true });
});
