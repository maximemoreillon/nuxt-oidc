<template>
  <div>Home</div>
  <div>{{ data }}</div>
</template>

<script setup lang="ts">
const oidcCookie = useCookie("oidc");
const { access_token } = oidcCookie.value;
const { data } = useFetch("/api/data", {
  headers: { Authorization: `Bearer ${access_token}` },
});
</script>
