<template>
  <div>Home</div>
  {{ authInfo.oidcAuthData }}
</template>

<script setup lang="ts">
const authInfo = useAuth();
</script>
