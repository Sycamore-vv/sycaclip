<template>
  <div class="remote-receiver">
    <header class="remote-header">
      <div>
        <h2>远程剪贴板</h2>
        <p>{{ statusText }}</p>
      </div>
      <button class="ghost-btn" @click="checkServerStatus">刷新</button>
    </header>

    <nav class="remote-tabs" aria-label="远程剪贴板标签页">
      <button
        v-for="tab in remoteTabs"
        :key="tab.key"
        class="remote-tab"
        :class="{ active: activeRemoteTab === tab.key }"
        @click="activeRemoteTab = tab.key"
      >
        <span>{{ tab.label }}</span>
        <small v-if="tab.key === 'history'">{{ receivedItems.length }}</small>
      </button>
    </nav>

    <section v-if="activeRemoteTab === 'history'" class="tab-panel history-panel">
      <div class="panel-title-row">
        <div>
          <h3>接收历史</h3>
          <p>手机发送到 SycaTools 的文本会显示在这里。</p>
        </div>
        <button class="ghost-btn danger" :disabled="receivedItems.length === 0" @click="clearHistory">清空</button>
      </div>

      <div v-if="receivedItems.length" class="history-list">
        <article v-for="item in receivedItems" :key="item.id" class="history-item">
          <div class="history-main">
            <div class="history-meta">
              <strong>{{ formatTime(item.receivedAt) }}</strong>
              <span>{{ item.length }} 字</span>
            </div>
            <p>{{ item.text }}</p>
          </div>
          <div class="history-actions">
            <button class="ghost-btn" @click="copyText(item.text)">复制</button>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">T</div>
        <strong>还没有远程接收记录</strong>
        <p>打开“访问地址”，用手机访问页面并发送文本后，这里会自动出现记录。</p>
      </div>
    </section>

    <section v-else class="tab-panel address-panel">
      <div v-if="!serverInfo.running" class="service-card disabled">
        <div class="service-status">
          <span class="status-dot off"></span>
          <div>
            <h3>HTTP 服务未启动</h3>
            <p>请先在 SycaTools 设置中开启 HTTP 服务。</p>
          </div>
        </div>
      </div>

      <template v-else>
        <div class="address-layout">
          <section class="service-card primary-card">
            <div class="service-status">
              <span class="status-dot on"></span>
              <div>
                <h3>访问地址</h3>
                <p>{{ serverInfo.allowLAN ? '手机和电脑需在同一局域网。' : '当前仅允许本机访问。' }}</p>
              </div>
            </div>

            <div class="url-box">
              <input ref="urlInput" type="text" :value="remoteUrl" readonly @click="selectAll" />
              <button class="primary-btn" @click="copyUrl">{{ copied ? '已复制' : '复制地址' }}</button>
            </div>

            <div class="quick-actions">
              <button class="ghost-btn" :disabled="!serverInfo.allowLAN" @click="showQRCode = true">
                显示二维码
              </button>
              <button class="ghost-btn" @click="copyText(remoteUrl)">复制完整链接</button>
            </div>
          </section>

          <section class="service-card">
            <h3>服务信息</h3>
            <dl class="info-grid">
              <div>
                <dt>访问模式</dt>
                <dd>{{ serverInfo.allowLAN ? '局域网' : '本机' }}</dd>
              </div>
              <div>
                <dt>主机地址</dt>
                <dd>{{ serverInfo.hostLabel }}</dd>
              </div>
              <div>
                <dt>端口</dt>
                <dd>{{ serverInfo.port || '-' }}</dd>
              </div>
              <div>
                <dt>页面路径</dt>
                <dd>/remote</dd>
              </div>
            </dl>
          </section>
        </div>
      </template>
    </section>

    <div v-if="showQRCode" class="qrcode-modal" @click="showQRCode = false">
      <div class="qrcode-content" @click.stop>
        <div class="qrcode-header">
          <h3>扫描访问</h3>
          <button class="close-btn" @click="showQRCode = false">×</button>
        </div>
        <div class="qrcode-body">
          <img v-if="qrcodeDataUrl" :src="qrcodeDataUrl" alt="远程剪贴板二维码" class="qrcode-img" />
          <p class="qrcode-url">{{ remoteUrl }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import QRCode from 'qrcode'

const HISTORY_STORAGE_KEY = 'sycaclip_remote_received_history_v1'
const MAX_HISTORY = 80

const remoteTabs = [
  { key: 'history', label: '接收历史' },
  { key: 'address', label: '访问地址' }
]

const activeRemoteTab = ref('history')
const serverInfo = ref({
  running: false,
  allowLAN: false,
  hostLabel: '127.0.0.1',
  localIP: '127.0.0.1',
  port: 0
})
const remoteUrl = ref('')
const qrcodeDataUrl = ref('')
const showQRCode = ref(false)
const copied = ref(false)
const urlInput = ref(null)
const receivedItems = ref([])
let refreshTimer = null
let removeReceivedListener = null

const statusText = computed(() => {
  if (!serverInfo.value.running) {
    return '等待 HTTP 服务启动'
  }
  return serverInfo.value.allowLAN ? `局域网可访问：${serverInfo.value.hostLabel}` : '本机访问模式'
})

function loadHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    receivedItems.value = Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : []
  } catch {
    receivedItems.value = []
  }
}

function saveHistory() {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(receivedItems.value.slice(0, MAX_HISTORY)))
}

function normalizeReceivedItem(payload) {
  const text = String(payload?.text || payload?.content || '')
  if (!text) return null
  return {
    id: payload?.id || `remote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'text',
    text,
    length: Number(payload?.length) || text.length,
    receivedAt: Number(payload?.receivedAt) || Date.now()
  }
}

function handleReceived(payload) {
  const item = normalizeReceivedItem(payload)
  if (!item) return
  receivedItems.value = [item, ...receivedItems.value.filter(entry => entry.id !== item.id)].slice(0, MAX_HISTORY)
  activeRemoteTab.value = 'history'
  saveHistory()
}

async function checkServerStatus() {
  try {
    const config = await window.ztools.remote.getHttpConfig()
    const info = await window.ztools.remote.getHttpServerInfo()
    const host = config.allowLAN ? info.localIP || info.host || '127.0.0.1' : '127.0.0.1'

    serverInfo.value = {
      running: !!info.running,
      allowLAN: !!config.allowLAN,
      hostLabel: host,
      localIP: info.localIP || '127.0.0.1',
      port: info.port || config.port
    }

    remoteUrl.value = serverInfo.value.running ? `http://${host}:${serverInfo.value.port}/remote` : ''

    if (serverInfo.value.running && serverInfo.value.allowLAN) {
      await generateQRCode(remoteUrl.value)
    } else {
      qrcodeDataUrl.value = ''
      showQRCode.value = false
    }
  } catch (error) {
    console.error('获取服务器状态失败:', error)
    serverInfo.value.running = false
    remoteUrl.value = ''
    qrcodeDataUrl.value = ''
    showQRCode.value = false
  }
}

function selectAll(event) {
  event.target.select()
}

async function copyUrl() {
  await copyText(remoteUrl.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1600)
}

async function copyText(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    window.ztools.copyText?.(text)
  }
}

function clearHistory() {
  receivedItems.value = []
  saveHistory()
}

function formatTime(time) {
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function generateQRCode(text) {
  try {
    qrcodeDataUrl.value = await QRCode.toDataURL(text, {
      width: 280,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('生成二维码失败:', error)
  }
}

onMounted(() => {
  loadHistory()
  checkServerStatus()
  removeReceivedListener = window.ztools.remote.onReceived(handleReceived)
  refreshTimer = window.setInterval(checkServerStatus, 5000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (typeof removeReceivedListener === 'function') {
    removeReceivedListener()
    removeReceivedListener = null
  }
})
</script>

<style scoped>
.remote-receiver {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  color: var(--text-primary);
  overflow: hidden;
}

.remote-header,
.panel-title-row,
.service-status,
.history-item,
.url-box,
.quick-actions,
.qrcode-header {
  display: flex;
  align-items: center;
}

.remote-header {
  justify-content: space-between;
  gap: 16px;
}

h2,
h3,
p,
dl {
  margin: 0;
}

.remote-header h2 {
  font-size: 20px;
  font-weight: 700;
}

.remote-header p,
.panel-title-row p,
.service-card p,
.history-meta span,
.empty-state p,
dt {
  color: var(--text-secondary);
}

.remote-tabs {
  display: inline-flex;
  width: fit-content;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-surface);
}

.remote-tab {
  min-width: 104px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.remote-tab.active {
  color: var(--primary-color);
  background: var(--bg-accent-light);
}

.remote-tab small {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgb(0 0 0 / 8%);
  color: inherit;
}

.tab-panel {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.history-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-title-row {
  justify-content: space-between;
  gap: 12px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item,
.service-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-surface);
}

.history-item {
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
}

.history-main {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.history-main p {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-primary);
  line-height: 1.55;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.history-actions {
  flex-shrink: 0;
}

.empty-state {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  text-align: center;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background: var(--bg-hover-light);
}

.empty-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--bg-accent-light);
  color: var(--primary-color);
  font-weight: 700;
}

.address-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
  gap: 12px;
}

.service-card {
  padding: 16px;
}

.service-card.disabled {
  max-width: 520px;
}

.primary-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.service-status {
  gap: 10px;
}

.status-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
}

.status-dot.on {
  background: #22c55e;
}

.status-dot.off {
  background: var(--text-danger);
}

.url-box {
  gap: 8px;
}

.url-box input {
  min-width: 0;
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
}

.url-box input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.quick-actions {
  gap: 8px;
  flex-wrap: wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 14px;
}

.info-grid div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.info-grid div:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

dd {
  margin: 0;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.primary-btn,
.ghost-btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.primary-btn {
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: var(--text-white);
}

.ghost-btn {
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-secondary);
}

.ghost-btn:hover,
.primary-btn:hover {
  opacity: 0.9;
}

.ghost-btn.danger {
  color: var(--text-danger);
}

.ghost-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.qrcode-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--overlay-color);
}

.qrcode-content {
  width: min(380px, 100%);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-surface);
  padding: 18px;
}

.qrcode-header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-app);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 20px;
}

.qrcode-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qrcode-img {
  width: 280px;
  height: 280px;
  border-radius: 8px;
  background: #fff;
}

.qrcode-url {
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  text-align: center;
  word-break: break-all;
}

@media (max-width: 760px) {
  .remote-header,
  .panel-title-row,
  .history-item,
  .url-box {
    align-items: stretch;
    flex-direction: column;
  }

  .address-layout {
    grid-template-columns: 1fr;
  }

  .remote-tabs {
    width: 100%;
  }

  .remote-tab {
    flex: 1;
  }
}
</style>
