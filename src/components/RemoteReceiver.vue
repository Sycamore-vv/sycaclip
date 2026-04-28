<template>
  <div class="remote-receiver">
    <div class="remote-header">
      <h3>📱 手机发送到剪贴板</h3>
      <p class="remote-desc">在手机浏览器中访问下方地址即可发送文本到电脑</p>
    </div>

    <div v-if="!serverInfo.running" class="remote-disabled">
      <div class="icon">⚠️</div>
      <p>HTTP 服务未启动或未开启局域网访问</p>
      <p class="hint">请在 ZTools 设置中：</p>
      <ol class="steps">
        <li>开启「HTTP 服务」</li>
        <li>开启「允许局域网访问」</li>
      </ol>
    </div>

    <div v-else class="remote-enabled">
      <div class="url-section">
        <label>访问地址</label>
        <div class="url-box">
          <input
            type="text"
            :value="remoteUrl"
            readonly
            @click="selectAll"
            ref="urlInput"
          />
          <button @click="copyUrl" class="btn-copy">
            {{ copied ? '✓ 已复制' : '复制' }}
          </button>
        </div>
      </div>

      <div class="qrcode-section">
        <label>扫描二维码</label>
        <div class="qrcode-box">
          <img v-if="qrcodeDataUrl" :src="qrcodeDataUrl" alt="二维码" class="qrcode-img" />
          <div v-else class="qrcode-loading">生成二维码中...</div>
        </div>
        <p class="qr-hint">使用手机扫描二维码快速访问</p>
      </div>

      <div class="info-section">
        <div class="info-item">
          <span class="label">本机 IP</span>
          <span class="value">{{ serverInfo.localIP }}</span>
        </div>
        <div class="info-item">
          <span class="label">端口</span>
          <span class="value">{{ serverInfo.port }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import QRCode from 'qrcode'

const serverInfo = ref({
  running: false,
  localIP: '',
  port: 0,
  url: ''
})

const urlInput = ref(null)
const qrcodeDataUrl = ref('')
const copied = ref(false)

const remoteUrl = computed(() => {
  if (!serverInfo.value.running || !serverInfo.value.localIP) {
    return ''
  }
  return `http://${serverInfo.value.localIP}:${serverInfo.value.port}/remote`
})

async function checkServerStatus() {
  try {
    // 通过插件 API 获取 HTTP 服务器信息
    const config = await window.ztools.remote.getHttpConfig()
    const info = await window.ztools.remote.getHttpServerInfo()

    serverInfo.value = {
      running: config.enabled && config.allowLAN && info.running,
      localIP: info.localIP || '',
      port: info.port || 0,
      url: info.url || ''
    }

    if (serverInfo.value.running && remoteUrl.value) {
      await generateQRCode(remoteUrl.value)
    }
  } catch (error) {
    console.error('获取服务器信息失败:', error)
    serverInfo.value.running = false
  }
}

function selectAll(event) {
  event.target.select()
}

async function copyUrl() {
  if (!remoteUrl.value) return

  try {
    await navigator.clipboard.writeText(remoteUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    // 降级方案
    urlInput.value?.select()
    document.execCommand('copy')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

async function generateQRCode(text) {
  try {
    qrcodeDataUrl.value = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('生成二维码失败:', error)
  }
}

onMounted(() => {
  checkServerStatus()
  // 每 5 秒检查一次服务器状态
  setInterval(checkServerStatus, 5000)
})
</script>

<style scoped>
.remote-receiver {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  min-height: 100%;
}

.remote-header {
  text-align: center;
  margin-bottom: 30px;
}

.remote-header h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.remote-desc {
  font-size: 14px;
  color: #666666;
  line-height: 1.6;
}

.remote-disabled {
  text-align: center;
  padding: 40px 20px;
  background: #fff3cd;
  border-radius: 12px;
  border: 1px solid #ffc107;
}

.remote-disabled .icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.remote-disabled p {
  font-size: 14px;
  color: #856404;
  margin-bottom: 8px;
}

.remote-disabled .hint {
  margin-top: 16px;
  font-weight: 600;
}

.remote-disabled .steps {
  text-align: left;
  display: inline-block;
  margin-top: 8px;
  padding-left: 20px;
}

.remote-disabled .steps li {
  margin: 4px 0;
  color: #856404;
}

.remote-enabled {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.url-section label,
.qrcode-section label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.url-box {
  display: flex;
  gap: 8px;
}

.url-box input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  background: #f8f9fa;
  color: #1a1a1a;
  transition: all 0.3s;
}

.url-box input:focus {
  outline: none;
  border-color: #667eea;
  background: #ffffff;
}

.btn-copy {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-copy:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-copy:active {
  transform: translateY(0);
}

.qrcode-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: #ffffff;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  min-height: 240px;
}

.qrcode-img {
  width: 200px;
  height: 200px;
  border-radius: 8px;
}

.qrcode-loading {
  font-size: 14px;
  color: #999999;
}

.qr-hint {
  text-align: center;
  font-size: 12px;
  color: #999999;
  margin-top: 8px;
}

.info-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.info-item .label {
  font-size: 12px;
  color: #666666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item .value {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
}
</style>
