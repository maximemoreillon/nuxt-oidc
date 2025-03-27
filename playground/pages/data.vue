<template>
  <div>Data</div>
  <div>{{ data }}</div>
</template>

<script setup lang="ts">
const auth = useAuth();
const { access_token } = auth.tokenSet.value;
const { data } = useFetch("/api/data", {
  headers: { Authorization: `Bearer ${access_token}` },
});
</script>
