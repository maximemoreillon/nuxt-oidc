<template>
  <h2>Tokens</h2>
  <pre>{{ JSON.stringify(auth.tokenSet.value || "NO TOKEN", null, 2) }}</pre>
</template>

<script setup lang="ts">
const auth = useAuth();
</script>
