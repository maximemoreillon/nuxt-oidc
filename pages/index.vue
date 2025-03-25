<template>
  <div>Home</div>
  <div>
    {{ data }}
  </div>
</template>

<script setup lang="ts">
const { data } = useFetch("/api/data");
</script>
