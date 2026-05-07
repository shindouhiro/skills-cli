<script setup lang="ts">
defineProps<{
  icon?: string
  className?: string
}>()
</script>

<template>
  <img
    v-if="icon?.startsWith('http')"
    :src="icon"
    :class="className || 'h-6 w-6 object-contain'"
    alt=""
  >
  <iconify-icon
    v-else-if="icon"
    :icon="icon"
    :class="className || 'text-2xl'"
  />
</template>
