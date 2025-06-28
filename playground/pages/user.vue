<template>
  <h2>User</h2>
  {{ auth.user }}
</template>

<script setup lang="ts">
const auth = useAuth();
</script>
