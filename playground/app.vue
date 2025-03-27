<template>
  <nav>
    <NuxtLink to="/">Home</NuxtLink>
    <NuxtLink to="/data">Data</NuxtLink>
    <NuxtLink to="/user">User</NuxtLink>
  </nav>
  <main>
    <NuxtPage />
  </main>
</template>

<style>
nav {
  display: flex;
  gap: 1em;
}
</style>
