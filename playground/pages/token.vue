<template>
  <div>Token</div>
  {{ auth.tokenSet }}
</template>

<script setup lang="ts">
const auth = useAuth();
</script>
