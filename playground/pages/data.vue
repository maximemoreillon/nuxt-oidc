<template>
  <h2>Data</h2>
  <h3>With bearer token</h3>
  <p v-if="bearerTokenDataError" style="color: red">
    {{ bearerTokenDataError }}
  </p>
  <p v-else>{{ bearerTokenData }}</p>
  <h3>With cookie</h3>
  <p v-if="cookieDataError" style="color: red">
    {{ cookieDataError }}
  </p>
  <p v-else>{{ cookieData }}</p>
</template>

<script setup lang="ts">
const auth = useAuth();
const { data: bearerTokenData, error: bearerTokenDataError } = useFetch(
  "/api/data",
  {
    headers: { Authorization: `Bearer ${auth.tokenSet.value?.access_token}` },
  }
);

const { data: cookieData, error: cookieDataError } = useFetch("/api/data");
</script>
