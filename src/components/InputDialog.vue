<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '输入' },
  placeholder: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  initialValue: { type: String, default: '' },
  multiline: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])
const value = ref('')

watch(
  () => props.show,
  visible => {
    if (visible) {
      value.value = props.initialValue
    }
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="show" class="dialog-overlay" @click="emit('cancel')">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <button class="dialog-close" @click="emit('cancel')">✕</button>
      </div>
      <div class="dialog-body">
        <textarea
          v-if="multiline"
          v-model="value"
          class="dialog-input dialog-textarea"
          :placeholder="placeholder"
          @keydown.stop
        />
        <input
          v-else
          v-model="value"
          class="dialog-input"
          type="text"
          :placeholder="placeholder"
          @keydown.stop
          @keydown.enter.prevent="emit('confirm', value)"
        />
      </div>
      <div class="dialog-footer">
        <button class="btn-cancel" @click="emit('cancel')">取消</button>
        <button class="btn-confirm" @click="emit('confirm', value)">{{ confirmText }}</button>
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
  width: min(380px, calc(100vw - 32px));
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 14px;
  border: 1px solid var(--border-color);
}

@media (prefers-color-scheme: dark) {
  .dialog-content {
    background: rgba(30, 30, 50, 0.96);
  }
}

.dialog-header,
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
}

.dialog-header {
  border-bottom: 1px solid var(--border-color);
}

.dialog-footer {
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--border-color);
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
  padding: 18px;
}

.dialog-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-primary);
  outline: none;
}

.dialog-input:focus {
  border-color: var(--primary-color);
}

.dialog-textarea {
  min-height: 220px;
  resize: vertical;
  line-height: 1.5;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  cursor: pointer;
}

.btn-cancel {
  background: var(--bg-app);
  color: var(--text-secondary);
}

.btn-confirm {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}
</style>
