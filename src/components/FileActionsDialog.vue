<script setup>
defineProps({
  show: { type: Boolean, default: false },
  item: { type: Object, default: null }
})

const emit = defineEmits(['close', 'open-path', 'reveal-path', 'copy-path'])
</script>

<template>
  <div v-if="show" class="dialog-overlay" @click="emit('close')">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header">
        <div class="dialog-title">
          <h3>文件操作</h3>
          <span class="dialog-subtitle">对当前记录中的文件或文件夹执行操作</span>
        </div>
        <button class="dialog-close" @click="emit('close')">✕</button>
      </div>
      <div class="dialog-body">
        <div
          v-for="file in item?.files || []"
          :key="file.path"
          class="file-card"
          :class="{ missing: file.exists === false }"
        >
          <div class="file-main">
            <div class="file-name-row">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-kind">{{ file.isDirectory ? '文件夹' : '文件' }}</span>
              <span v-if="file.exists === false" class="file-missing">已不存在</span>
            </div>
            <div class="file-path">{{ file.path }}</div>
          </div>
          <div class="file-actions">
            <button class="action-btn" :disabled="file.exists === false" @click="emit('open-path', file)">
              打开
            </button>
            <button class="action-btn" @click="emit('reveal-path', file)">
              定位
            </button>
            <button class="action-btn" @click="emit('copy-path', file)">
              复制路径
            </button>
          </div>
        </div>
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
  z-index: 3200;
}

.dialog-content {
  width: min(760px, calc(100vw - 32px));
  max-height: min(82vh, calc(100vh - 32px));
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
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
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.dialog-title h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.dialog-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
}

.dialog-close {
  border: none;
  background: none;
  color: var(--text-tertiary);
  font-size: 20px;
  cursor: pointer;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  overflow: auto;
}

.file-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-app);
}

.file-card.missing {
  opacity: 0.7;
}

.file-main {
  min-width: 0;
  flex: 1;
}

.file-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.file-name {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.file-kind,
.file-missing {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.file-kind {
  background: var(--bg-accent-light);
  color: var(--primary-color);
}

.file-missing {
  background: var(--bg-danger-light);
  color: var(--text-danger);
}

.file-path {
  margin-top: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}

.file-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .file-card {
    flex-direction: column;
  }

  .file-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
