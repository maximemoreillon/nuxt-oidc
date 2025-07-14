<template>
  <h2>User</h2>
  <pre>{{ JSON.stringify(auth.user.value, null, 2) }}</pre>
</template>

<script setup lang="ts">
const auth = useAuth();
</script>
