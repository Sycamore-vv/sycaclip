<script setup lang="ts">
defineProps<{
  name: string
  size?: number
}>()
</script>

<template>
  <svg
    :width="size || 16"
    :height="size || 16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <use :xlink:href="`#icon-${name}`" />
  </svg>
</template>