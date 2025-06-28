<template>
  <h2>Data</h2>
  <div v-if="error" style="color: red">{{ error }}</div>
  <div v-else>{{ data }}</div>
</template>

<script setup lang="ts">
const auth = useAuth();
const { access_token } = auth.tokenSet.value;
const { data, error } = useFetch("/api/data", {
  headers: { Authorization: `Bearer ${access_token}` },
});
</script>
