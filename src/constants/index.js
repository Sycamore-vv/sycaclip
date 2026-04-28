// 收藏数据持久化 key
export const FAVORITE_STORAGE_KEY = 'clipboard_favorites'

// 首次历史拉取上限（用于首屏完整展示，禁用滚动分页）
export const FULL_FETCH_SIZE = 20000

// Tab 基础定义（不含动态 count）
export const TAB_DEFINITIONS = [
  { key: 'all', label: '全部' },
  { key: 'text', label: '文本' },
  { key: 'image', label: '图像' },
  { key: 'file', label: '文件' },
  { key: 'favorite', label: '收藏' },
  { key: 'remote', label: '远程' }
]
