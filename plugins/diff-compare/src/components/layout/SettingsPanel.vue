<script setup lang="ts">
/**
 * 设置面板组件
 * 提供语言切换、自动格式化设置和使用说明展示功能
 */

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ZSelect from '@/components/ui/ZSelect.vue'
import ZIcon from '@/components/ui/ZIcon.vue'
import { useAutoFormatSettings } from '@/composables/useAutoFormat'

const { locale, t } = useI18n()
const { autoFormat, setAutoFormat } = useAutoFormatSettings()

/**
 * 关闭面板事件
 */
const emit = defineEmits(['close'])

/**
 * 语言选项列表
 */
const langOptions = ref([
    { label: '中文', value: 'zh' },
    { label: 'English', value: 'en' },
    { label: '日本語', value: 'ja' }
])

const autoFormatValue = computed({
    get: () => autoFormat.value,
    set: (v) => { setAutoFormat(v) }
})

const formatOptions = computed(() => [
    { label: t('autoFormatOff'), value: 'off' },
    { label: t('autoFormatDelayed'), value: 'delayed' },
    { label: t('autoFormatImmediate'), value: 'immediate' }
])
</script>

<template>
    <!-- overlay -->
    <div class="sp-overlay" @mousedown.self="emit('close')">
        <!-- panel -->
        <transition name="sp-slide" appear>
            <aside class="sp-panel">

                <!-- ── Header ── -->
                <header class="sp-header">
                    <div class="sp-header-title">
                        <!-- Settings gear icon -->
                        <ZIcon name="settings" :size="16" class="sp-header-icon" />
                        <span>{{ locale === 'zh' ? '设置' : (locale === 'ja' ? '設定' : 'Settings') }}</span>
                    </div>
                    <button class="sp-close" @click="emit('close')"
                        :title="locale === 'zh' ? '关闭' : (locale === 'ja' ? '閉じる' : 'Close')">
                        <ZIcon name="x" :size="15" />
                    </button>
                </header>

                <!-- ── Scrollable body ── -->
                <div class="sp-body">

                    <!-- Language section -->
                    <section class="sp-section">
                        <p class="sp-section-label">
                            {{ locale === 'zh' ? '显示语言' : (locale === 'ja' ? '表示言語' : 'Display Language') }}
                        </p>
                        <ZSelect v-model="locale" :options="langOptions" />
                    </section>

                    <!-- Auto Format section -->
                    <section class="sp-section">
                        <p class="sp-section-label">
                            {{ t('autoFormat') }}
                        </p>
                        <ZSelect v-model="autoFormatValue" :options="formatOptions" />
                    </section>

                    <div class="sp-divider"></div>

                    <!-- Usage guide section -->
                    <section class="sp-section">
                        <p class="sp-section-label">
                            {{ t('usageGuide') }}
                        </p>
                        <div class="sp-guide-list">

                            <!-- Text Compare -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--blue">
                                    <ZIcon name="text" :size="15" />
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ t('usageTextTitle') }}</p>
                                    <p class="sp-guide-desc">{{ t('usageTextDesc') }}</p>
                                </div>
                            </div>

                            <!-- Image Compare -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--purple">
                                    <ZIcon name="image" :size="15" />
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ t('usageImageTitle') }}</p>
                                    <p class="sp-guide-desc">{{ t('usageImageDesc') }}</p>
                                </div>
                            </div>

                            <!-- Excel Compare -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--green">
                                    <ZIcon name="excel" :size="15" />
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ t('usageExcelTitle') }}</p>
                                    <p class="sp-guide-desc">{{ t('usageExcelDesc') }}</p>
                                </div>
                            </div>

                            <!-- Word Compare -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--blue">
                                    <ZIcon name="word" :size="15" />
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ t('usageWordTitle') }}</p>
                                    <p class="sp-guide-desc">{{ t('usageWordDesc') }}</p>
                                </div>
                            </div>

                            <!-- PDF Compare -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--red">
                                    <ZIcon name="pdf" :size="15" />
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ t('usagePdfTitle') }}</p>
                                    <p class="sp-guide-desc">{{ t('usagePdfDesc') }}</p>
                                </div>
                            </div>

                            <!-- Theme -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--amber">
                                    <ZIcon name="moon" :size="15" />
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ t('usageThemeTitle') }}</p>
                                    <p class="sp-guide-desc">{{ t('usageThemeDesc') }}</p>
                                </div>
                            </div>

                            <!-- Language -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--green">
                                    <ZIcon name="globe" :size="15" />
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ t('usageLanguageTitle') }}</p>
                                    <p class="sp-guide-desc">{{ t('usageLanguageDesc') }}</p>
                                </div>
                            </div>

                            <!-- Auto Format -->
                            <div class="sp-guide-item">
                                <div class="sp-guide-icon-wrap sp-guide-icon-wrap--purple">
                                    <ZIcon name="edit" :size="15" />
                                </div>
                                <div class="sp-guide-text">
                                    <p class="sp-guide-title">{{ t('usageAutoFormatTitle') }}</p>
                                    <p class="sp-guide-desc">{{ t('usageAutoFormatDesc') }}</p>
                                </div>
                            </div>

                        </div>
                    </section>
                </div>

                <!-- ── Footer ── -->
                <footer class="sp-footer">
                    <span>diff-compare</span>
                    <span class="sp-footer-dot">·</span>
                    <span>ZTools Plugin</span>
                </footer>
            </aside>
        </transition>
    </div>
</template>

<style scoped lang="scss">
/* ── Overlay ──────────────────────────────────────────── */
.sp-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(3px);
    display: flex;
    justify-content: flex-end;
}

/* ── Panel ────────────────────────────────────────────── */
.sp-panel {
    width: 320px;
    height: 100%;
    background: var(--color-background);
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
    overflow: hidden;
}

/* ── Header ───────────────────────────────────────────── */
.sp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
}

.sp-header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
}

.sp-header-icon {
    color: var(--color-secondary);
}

.sp-close {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--color-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;

    &:hover {
        background: var(--color-border);
        color: var(--color-text);
    }
}

.sp-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 18px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 4px;
    }
}

/* ── Section ──────────────────────────────────────────── */
.sp-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.sp-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-secondary);
    margin: 0;
}

.sp-divider {
    height: 1px;
    background: var(--color-border);
}

/* ── Guide List ───────────────────────────────────────── */
.sp-guide-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.sp-guide-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 10px;
    transition: background 150ms ease;

    &:hover {
        background: color-mix(in srgb, var(--color-border) 50%, transparent);
    }
}

/* ── Icon wrap (colored badge) ────────────────────────── */
.sp-guide-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;

    &--blue {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
    }

    &--purple {
        background: rgba(139, 92, 246, 0.15);
        color: #8b5cf6;
    }

    &--amber {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
    }

    &--green {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
    }

    &--red {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
    }
}

/* ── Guide Text ───────────────────────────────────────── */
.sp-guide-text {
    flex: 1;
}

.sp-guide-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 3px;
    line-height: 1.4;
}

.sp-guide-desc {
    font-size: 12px;
    color: var(--color-secondary);
    margin: 0;
    line-height: 1.55;
}

/* ── Footer ───────────────────────────────────────────── */
.sp-footer {
    padding: 10px 18px;
    border-top: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--color-secondary);
    flex-shrink: 0;
    opacity: 0.6;
}

.sp-footer-dot {
    opacity: 0.5;
}

/* ── Slide transition ─────────────────────────────────── */
.sp-slide-enter-active {
    transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease;
}

.sp-slide-leave-active {
    transition: transform 200ms ease, opacity 160ms ease;
}

.sp-slide-enter-from {
    transform: translateX(100%);
    opacity: 0;
}

.sp-slide-leave-to {
    transform: translateX(100%);
    opacity: 0;
}
</style>
