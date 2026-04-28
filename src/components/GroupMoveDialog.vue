<script setup>
defineProps({
  show: { type: Boolean, default: false },
  groups: { type: Array, default: () => [] },
  assignedGroupId: { type: String, default: '' },
  selectedCount: { type: Number, default: 1 }
})

const emit = defineEmits(['select-group', 'remove-from-group', 'close'])
</script>

<template>
  <div v-if="show" class="dialog-overlay" @click="emit('close')">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header">
        <h3>移动到分组</h3>
        <button class="dialog-close" @click="emit('close')">✕</button>
      </div>
      <div class="dialog-body">
        <div class="dialog-tip">将 {{ selectedCount }} 条记录移动到目标分组</div>
        <button
          v-for="group in groups"
          :key="group.id"
          class="group-option"
          :class="{ active: assignedGroupId === group.id }"
          @click="emit('select-group', group.id)"
        >
          <span>{{ group.name }}</span>
          <span v-if="assignedGroupId === group.id">当前</span>
        </button>
        <button
          v-if="assignedGroupId"
          class="group-option remove"
          @click="emit('remove-from-group')"
        >
          移出分组
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-color);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3100;
}

.dialog-content {
  width: min(420px, calc(100vw - 32px));
  max-height: min(520px, calc(100vh - 40px));
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  border: 1px solid var(--border-color);
}

@media (prefers-color-scheme: dark) {
  .dialog-content {
    background: rgba(30, 30, 50, 0.96);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
}

.dialog-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 18px;
  cursor: pointer;
}

.dialog-body {
  padding: 12px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-tip {
  color: var(--text-tertiary);
  font-size: 12px;
  padding: 2px 2px 8px;
}

.group-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-primary);
  cursor: pointer;
}

.group-option.active {
  border-color: var(--primary-color);
  background: var(--bg-accent-light);
  color: var(--primary-color);
}

.group-option.remove {
  color: var(--text-danger);
}
</style>
