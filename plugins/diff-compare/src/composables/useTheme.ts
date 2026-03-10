import { ref, onMounted, onUnmounted } from 'vue'

declare global {
    interface Window {
        ztools?: {
            isDarkColors?: () => boolean
        }
    }
}

export type ThemeMode = 'system' | 'light' | 'dark'

export function useTheme() {
    const themeMode = ref<ThemeMode>('system')
    const isDark = ref(true)
    let mediaQuery: MediaQueryList | null = null

    const getSystemTheme = (): boolean => {
        if (window.ztools?.isDarkColors) {
            return window.ztools.isDarkColors()
        }
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
    }

    const updateTheme = () => {
        let dark: boolean
        if (themeMode.value === 'system') {
            dark = getSystemTheme()
        } else {
            dark = themeMode.value === 'dark'
        }
        isDark.value = dark
        document.documentElement.classList.toggle('dark', dark)
    }

    const setThemeMode = (mode: ThemeMode) => {
        themeMode.value = mode
        if(window.ztools?.dbStorage?.setItem){
            window.ztools.dbStorage.setItem('theme-mode', mode)
        }else{
            localStorage.setItem('theme-mode', mode)
        }
        updateTheme()
    }

    const cycleTheme = () => {
        const modes: ThemeMode[] = ['system', 'light', 'dark']
        const currentIndex = modes.indexOf(themeMode.value)
        const nextIndex = (currentIndex + 1) % modes.length
        setThemeMode(modes[nextIndex])
    }

    const initTheme = () => {
        const saved = window.ztools?.dbStorage?.getItem('theme-mode') as ThemeMode | null ?? localStorage.getItem('theme-mode') as ThemeMode | null
        if (saved && ['system', 'light', 'dark'].includes(saved)) {
            themeMode.value = saved
        }
        updateTheme()
    }

    const handleSystemThemeChange = () => {
        if (themeMode.value === 'system') {
            updateTheme()
        }
    }

    onMounted(() => {
        initTheme()

        mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
        mediaQuery?.addEventListener('change', handleSystemThemeChange)
    })

    onUnmounted(() => {
        mediaQuery?.removeEventListener('change', handleSystemThemeChange)
    })

    return {
        themeMode,
        isDark,
        setThemeMode,
        cycleTheme
    }
}