<template>
  <div>User</div>
  {{ auth.user }}
</template>

<script setup lang="ts">
const auth = useAuth();
</script>
