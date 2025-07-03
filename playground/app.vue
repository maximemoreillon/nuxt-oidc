<template>
  <header>
    <span>Nuxt + OIDC</span>
    <button @click="() => logout()">Logout</button>
  </header>
  <nav>
    <NuxtLink to="/">Home</NuxtLink>
    <NuxtLink to="/data">Data</NuxtLink>
    <NuxtLink to="/data">Data</NuxtLink>
    <NuxtLink to="/user">User</NuxtLink>
    <NuxtLink to="/token">Token</NuxtLink>
  </nav>
  <main>
    <NuxtPage />
  </main>
</template>

<script setup lang="ts">
const auth = useAuth();
const { logout } = auth;
</script>

<style>
header {
  display: flex;
  justify-content: space-between;
}
nav {
  display: flex;
  gap: 1em;
}
</style>
