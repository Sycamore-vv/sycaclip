<script setup>
defineProps({
  show: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  canFavorite: { type: Boolean, default: false },
  hasGroups: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false }
})

const emit = defineEmits(['favorite', 'edit', 'open-group-picker', 'delete'])
</script>

<template>
  <div
    v-if="show"
    class="context-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <div v-if="canFavorite" class="context-menu-item" @click="emit('favorite')">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"/>
      </svg>
      <span>收藏</span>
    </div>
    <div v-if="canEdit" class="context-menu-item" @click="emit('edit')">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 20h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"/>
      </svg>
      <span>编辑文本</span>
    </div>
    <div v-if="hasGroups" class="context-menu-section">
      <div class="context-menu-item" @click="emit('open-group-picker')">
        <span>移动到分组...</span>
      </div>
    </div>
    <div class="context-menu-item context-menu-item--danger" @click="emit('delete')">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6h18M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2m3 0v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6h14z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"/>
        <path d="M10 11v6M14 11v6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"/>
      </svg>
      <span>删除</span>
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 120px;
  z-index: 2000;
  border: 1px solid var(--border-color);
}

@media (prefers-color-scheme: dark) {
  .context-menu {
    background: rgba(30, 30, 50, 0.95);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  color: var(--text-primary);
  font-size: 14px;
}

.context-menu-item:hover {
  background: var(--bg-hover);
}

.context-menu-item svg {
  width: 16px;
  height: 16px;
  color: var(--icon-warning);
}

.context-menu-section {
  margin: 4px 0;
  padding-top: 4px;
  border-top: 1px solid var(--border-color);
}

.context-menu-item--danger svg {
  color: var(--text-danger);
}

.context-menu-item--danger:hover {
  background: var(--bg-danger-light);
}
</style>
