<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

const mode = ref('manual')
const name = ref('')
const keyword = ref('')

watch(
  () => props.show,
  visible => {
    if (!visible) return
    mode.value = 'manual'
    name.value = ''
    keyword.value = ''
  }
)

const handleConfirm = () => {
  emit('confirm', {
    mode: mode.value,
    name: name.value,
    keyword: keyword.value
  })
}
</script>

<template>
  <div v-if="show" class="dialog-overlay" @click="emit('cancel')">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header">
        <h3>新建分组</h3>
        <button class="dialog-close" @click="emit('cancel')">✕</button>
      </div>
      <div class="dialog-body">
        <div class="mode-row">
          <button
            class="mode-chip"
            :class="{ active: mode === 'manual' }"
            @click="mode = 'manual'"
          >
            普通分组
          </button>
          <button
            class="mode-chip"
            :class="{ active: mode === 'keyword' }"
            @click="mode = 'keyword'"
          >
            关键词分组
          </button>
        </div>

        <div class="dialog-field">
          <label>分组名称</label>
          <input
            v-model="name"
            class="dialog-input"
            type="text"
            placeholder="输入分组名称"
          />
        </div>

        <div v-if="mode === 'keyword'" class="dialog-field">
          <label>关键词</label>
          <input
            v-model="keyword"
            class="dialog-input"
            type="text"
            placeholder="命中内容中包含该关键词的记录"
            @keydown.enter.prevent="handleConfirm"
          />
        </div>

        <p v-if="mode === 'keyword'" class="dialog-tip">
          关键词分组会自动收纳内容中包含该词的记录，不需要手动移入。
        </p>
      </div>
      <div class="dialog-footer">
        <button class="btn-cancel" @click="emit('cancel')">取消</button>
        <button class="btn-confirm" @click="handleConfirm">创建</button>
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
  width: min(420px, calc(100vw - 32px));
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
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mode-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-chip {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-secondary);
  cursor: pointer;
}

.mode-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-field label {
  color: var(--text-secondary);
  font-size: 13px;
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

.dialog-tip {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12px;
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
