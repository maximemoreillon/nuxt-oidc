import { useAuth } from "../composables/auth";

import { defineNuxtRouteMiddleware, navigateTo } from "#imports";

export default defineNuxtRouteMiddleware(async (to) => {
  // NOTE: does not run for server routes such as /api/oauth/callback
  // NOTE: Must be as server-side as possible to prevent client from seeing anything if unauthorized

  const { init } = useAuth();

  // NOTE: external so that the login server route is requested instead of a client-side navigation
  const url = await init(to.fullPath);
  if (url) return navigateTo(url, { external: true });
});
