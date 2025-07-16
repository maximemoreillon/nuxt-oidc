import { useAuth } from "../composables/auth";

import { defineNuxtRouteMiddleware } from "#imports";

export default defineNuxtRouteMiddleware(async (to, from) => {
  // NOTE: if client only: "Cannot destructure property 'access_token' of 'auth.tokenSet.value' as it is undefined.""

  const { init } = useAuth();

  // NOTE: navigateTo must be used here for some reason
  const url = await init();
  if (url) return navigateTo(url, { external: true });
});
