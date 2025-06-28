<template>
  <h2>Token</h2>
  {{ auth.tokenSet }}
</template>

<script setup lang="ts">
const auth = useAuth();
</script>
