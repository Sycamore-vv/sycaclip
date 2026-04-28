<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { TAB_DEFINITIONS } from '@/constants'
import { useFavorites } from '@/composables/useFavorites'
import { useClipboardData } from '@/composables/useClipboardData'
import { useSelection } from '@/composables/useSelection'
import { useContextMenu } from '@/composables/useContextMenu'
import { useFavoriteDialog } from '@/composables/useFavoriteDialog'
import TabBar from '@/components/TabBar.vue'
import ClipboardList from '@/components/ClipboardList.vue'
import SideBar from '@/components/SideBar.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import FavoriteDialog from '@/components/FavoriteDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GroupMoveDialog from '@/components/GroupMoveDialog.vue'
import InputDialog from '@/components/InputDialog.vue'
import FileActionsDialog from '@/components/FileActionsDialog.vue'
import CreateGroupDialog from '@/components/CreateGroupDialog.vue'
import RemoteReceiver from '@/components/RemoteReceiver.vue'

// ---- 状态 ----
const activeTab = ref('all')
const searchText = ref('')
const GROUP_STORAGE_KEY = 'clipboard_groups'
const GROUP_ARCHIVE_KEY = 'clipboard_group_archive_v1'
const groups = ref([])
const groupAssignments = ref({})
const groupArchive = ref({})
const filterGroup = ref('all')
const filterSource = ref('all')
const targetGroup = ref('')
const newGroupName = ref('')
const selectedIds = ref([])
const showGroupTools = ref(false)
const showSourceTools = ref(false)
const showCreateGroupDialog = ref(false)
const moveGroupDialog = ref({
  show: false,
  items: []
})
const renameDialog = ref({
  show: false,
  value: ''
})
const editDialog = ref({
  show: false,
  value: ''
})
const showDeleteGroupConfirm = ref(false)
const fileActionsDialog = ref({
  show: false,
  item: null
})
const editTargetItem = ref(null)

// ---- Composables ----
const { favorites, loadFavorites, addFavorite, deleteFavorite } = useFavorites()

const {
  clipboardData, loading, loadingMore, hasMore, needsExpand, expandedItems,
  filteredData: tabFilteredData, toggleExpand, isExpanded,
  fetchClipboardHistory, loadMore, reload, checkTextOverflow
} = useClipboardData(activeTab, searchText, favorites)

// tabs 计算属性（带收藏数量）
const tabs = computed(() =>
  TAB_DEFINITIONS.map(tab =>
    tab.key === 'favorite' ? { ...tab, count: favorites.value.length } : tab
  )
)

const sourceOptions = computed(() => {
  const sources = new Map()
  tabFilteredData.value.forEach(item => {
    const sourceId = item.appName?.trim() || '__unknown__'
    if (!sources.has(sourceId)) {
      sources.set(sourceId, {
        id: sourceId,
        name: item.appName?.trim() || '未知来源'
      })
    }
  })
  return [
    { id: 'all', name: '全部来源' },
    ...Array.from(sources.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  ]
})

const sourceFilteredData = computed(() => {
  if (filterSource.value === 'all') {
    return tabFilteredData.value
  }

  return tabFilteredData.value.filter(item => {
    const sourceId = item.appName?.trim() || '__unknown__'
    return sourceId === filterSource.value
  })
})

const normalizeGroup = (group) => {
  if (!group || typeof group !== 'object') return null
  const normalized = {
    id: group.id,
    name: String(group.name || '').trim(),
    mode: group.mode === 'keyword' ? 'keyword' : 'manual'
  }

  if (!normalized.id || !normalized.name) return null

  if (normalized.mode === 'keyword') {
    const keyword = String(group.rule?.keyword || group.keyword || '').trim()
    if (!keyword) return null
    normalized.rule = {
      type: 'keyword',
      keyword
    }
  }

  return normalized
}

const cloneArchive = () => JSON.parse(JSON.stringify(groupArchive.value || {}))

const toArchivedSnapshot = (item) => ({
  id: item.id,
  type: item.type,
  time: item.time,
  timestamp: item.timestamp,
  appName: item.appName || null,
  content: item.content || '',
  imagePath: item.imagePath || '',
  preview: item.preview || '',
  charCount: item.charCount || 0,
  size: item.size || '',
  fileCount: item.fileCount || 0,
  files: Array.isArray(item.files)
    ? item.files.map(file => ({
      name: file.name,
      path: file.path,
      isDirectory: !!file.isDirectory,
      exists: file.exists !== false
    }))
    : [],
  archivedAt: Date.now()
})

const fromArchivedSnapshot = (snapshot) => ({
  id: snapshot.id,
  type: snapshot.type,
  time: snapshot.time,
  timestamp: snapshot.timestamp || snapshot.archivedAt || Date.now(),
  appName: snapshot.appName || null,
  content: snapshot.content || '',
  imagePath: snapshot.imagePath || '',
  preview: snapshot.preview || '',
  charCount: snapshot.charCount || 0,
  size: snapshot.size || '',
  fileCount: snapshot.fileCount || (Array.isArray(snapshot.files) ? snapshot.files.length : 0),
  files: Array.isArray(snapshot.files) ? snapshot.files : [],
  __archived: true
})

const isManualGroupId = (groupId) => {
  if (!groupId || groupId === 'all' || groupId === 'ungrouped') return false
  const group = groups.value.find(entry => entry.id === groupId)
  return group?.mode !== 'keyword'
}

const getKeywordTargetText = (item) => {
  if (!item) return ''

  if (item.type === 'text') {
    return String(item.content || '')
  }

  if (item.type === 'file') {
    const fileNames = Array.isArray(item.files)
      ? item.files.map(file => file.name).filter(Boolean).join(' ')
      : ''
    return `${item.preview || ''} ${item.content || ''} ${fileNames}`.trim()
  }

  return String(item.preview || item.content || '')
}

const isItemInGroup = (item, groupId) => {
  const assignedGroupId = groupAssignments.value[item.id]
  if (groupId === 'all') return true
  if (groupId === 'ungrouped') return !assignedGroupId

  const group = groups.value.find(entry => entry.id === groupId)
  if (!group) return false

  if (group.mode === 'keyword') {
    const keyword = group.rule?.keyword?.trim()
    if (!keyword) return false
    return getKeywordTargetText(item).toLowerCase().includes(keyword.toLowerCase())
  }

  return assignedGroupId === groupId
}

const getArchivedItemsForGroup = (groupId, sourceId = 'all') => {
  if (!isManualGroupId(groupId)) return []
  const bucket = groupArchive.value[groupId]
  if (!bucket || typeof bucket !== 'object') return []

  const liveIdSet = new Set(tabFilteredData.value.map(item => item.id))
  const items = Object.values(bucket)
    .filter(snapshot => snapshot?.id && !liveIdSet.has(snapshot.id))
    .map(fromArchivedSnapshot)

  if (sourceId === 'all') {
    return items
  }

  return items.filter(item => {
    const itemSourceId = item.appName?.trim() || '__unknown__'
    return itemSourceId === sourceId
  })
}

const filteredData = computed(() => {
  const items = sourceFilteredData.value
  if (filterGroup.value === 'all') {
    return items
  }
  const liveItems = items.filter(item => isItemInGroup(item, filterGroup.value))
  if (!isManualGroupId(filterGroup.value)) {
    return liveItems
  }
  const archivedItems = getArchivedItemsForGroup(filterGroup.value, filterSource.value)
  return [...archivedItems, ...liveItems]
})

const selectedItems = computed(() => {
  const selectedSet = new Set(selectedIds.value)
  return filteredData.value.filter(item => selectedSet.has(item.id))
})
const selectedActionItem = computed(() => {
  return selectedItems.value.length === 1 ? selectedItems.value[0] : null
})
const selectedFileEntries = computed(() => {
  if (selectedActionItem.value?.type !== 'file') return []
  return Array.isArray(selectedActionItem.value.files) ? selectedActionItem.value.files : []
})
const selectedPrimaryFile = computed(() => {
  return selectedFileEntries.value.length === 1 ? selectedFileEntries.value[0] : null
})
const canAssignToActiveGroup = computed(() => {
  return selectedItems.value.length > 0 && !!targetGroup.value
})
const canRemoveFromGroup = computed(() => {
  return selectedItems.value.some(item => !!groupAssignments.value[item.id])
})
const filterGroupName = computed(() => {
  if (filterGroup.value === 'all') return '全部'
  if (filterGroup.value === 'ungrouped') return '未分组'
  return groups.value.find(group => group.id === filterGroup.value)?.name || '当前分组'
})
const filterSourceName = computed(() => {
  return sourceOptions.value.find(source => source.id === filterSource.value)?.name || '全部来源'
})
const groupChips = computed(() => [
  { id: 'all', name: '全部' },
  { id: 'ungrouped', name: '未分组' },
  ...groups.value
])
const movableGroups = computed(() => groups.value.filter(group => group.mode !== 'keyword'))
const targetGroupName = computed(() => {
  if (!targetGroup.value) return '未选择'
  return groups.value.find(group => group.id === targetGroup.value)?.name || '未选择'
})
const currentEditableGroup = computed(() => {
  if (filterGroup.value === 'all' || filterGroup.value === 'ungrouped') return null
  return groups.value.find(group => group.id === filterGroup.value) || null
})
const topQuickActions = computed(() => {
  const actions = []

  if (sourceOptions.value.length > 1) {
    actions.push({
      key: 'toggle-source',
      label: showSourceTools.value ? '收起来源筛选' : '筛选来源应用',
      active: showSourceTools.value,
      onClick: () => {
        showSourceTools.value = !showSourceTools.value
      }
    })
  }

  const item = selectedActionItem.value
  if (!item) {
    return actions
  }

  if (item.type === 'image' && item.imagePath) {
    actions.push({
      key: 'open-image',
      label: '打开图片',
      onClick: () => openImagePath(item.imagePath)
    })
    return actions
  }

  if (item.type === 'file') {
    if (selectedPrimaryFile.value?.path) {
      actions.push({
        key: 'open-path',
        label: '打开',
        onClick: () => openPathItem(selectedPrimaryFile.value)
      })
      actions.push({
        key: 'reveal-path',
        label: '定位',
        onClick: () => revealPathItem(selectedPrimaryFile.value)
      })
      actions.push({
        key: 'copy-path',
        label: '复制路径',
        onClick: () => copyPathText(selectedPrimaryFile.value.path)
      })
    } else if (selectedFileEntries.value.length > 1) {
      actions.push({
        key: 'file-actions',
        label: '文件操作',
        onClick: () => {
          fileActionsDialog.value = {
            show: true,
            item
          }
        }
      })
    }
  }

  return actions
})

const loadGroupState = async () => {
  try {
    const data = await window.ztools.db.promises.get(GROUP_STORAGE_KEY)
    if (!data) return
    groups.value = Array.isArray(data.groups)
      ? data.groups.map(normalizeGroup).filter(Boolean)
      : []
    groupAssignments.value =
      data.assignments && typeof data.assignments === 'object' ? data.assignments : {}
    if (typeof data.activeGroup === 'string') {
      filterGroup.value = data.activeGroup
    }
    if (typeof data.targetGroup === 'string') {
      targetGroup.value = data.targetGroup
    }
  } catch (error) {
    console.error('加载分组失败:', error)
  }
}

const loadArchiveState = async () => {
  try {
    const data = await window.ztools.db.promises.get(GROUP_ARCHIVE_KEY)
    groupArchive.value =
      data?.groups && typeof data.groups === 'object' ? data.groups : {}
  } catch (error) {
    console.error('加载分组归档失败:', error)
    groupArchive.value = {}
  }
}

const saveGroupState = async () => {
  try {
    const record = await window.ztools.db.promises.get(GROUP_STORAGE_KEY)
    await window.ztools.db.promises.put({
      _id: GROUP_STORAGE_KEY,
      _rev: record?._rev,
      groups: JSON.parse(JSON.stringify(groups.value)),
      assignments: JSON.parse(JSON.stringify(groupAssignments.value)),
      activeGroup: filterGroup.value,
      targetGroup: targetGroup.value
    })
  } catch (error) {
    console.error('保存分组失败:', error)
  }
}

const saveArchiveState = async () => {
  try {
    const record = await window.ztools.db.promises.get(GROUP_ARCHIVE_KEY)
    await window.ztools.db.promises.put({
      _id: GROUP_ARCHIVE_KEY,
      _rev: record?._rev,
      groups: cloneArchive()
    })
  } catch (error) {
    console.error('保存分组归档失败:', error)
  }
}

const createGroup = async ({ mode, name, keyword }) => {
  name = String(name || '').trim()
  if (!name) return
  if (groups.value.some(group => group.name === name)) {
    return
  }

  const nextGroup = {
    id: `group_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    mode: mode === 'keyword' ? 'keyword' : 'manual'
  }

  if (nextGroup.mode === 'keyword') {
    const normalizedKeyword = String(keyword || '').trim()
    if (!normalizedKeyword) return
    nextGroup.rule = {
      type: 'keyword',
      keyword: normalizedKeyword
    }
  }

  groups.value.push(nextGroup)
  if (nextGroup.mode === 'manual' && !targetGroup.value) {
    targetGroup.value = nextGroup.id
  }
  showCreateGroupDialog.value = false
  await saveGroupState()
}

const renameCurrentGroup = async () => {
  if (!currentEditableGroup.value) return
  renameDialog.value = {
    show: true,
    value: currentEditableGroup.value.name
  }
}

const handleRenameConfirm = async (nextName) => {
  nextName = nextName.trim()
  renameDialog.value.show = false
  if (!nextName || nextName === currentEditableGroup.value.name) return
  if (groups.value.some(group => group.id !== currentEditableGroup.value.id && group.name === nextName)) {
    return
  }
  groups.value = groups.value.map(group =>
    group.id === currentEditableGroup.value.id ? { ...group, name: nextName } : group
  )
  await saveGroupState()
}

const deleteCurrentGroup = async () => {
  if (!currentEditableGroup.value) return
  showDeleteGroupConfirm.value = true
}

const handleDeleteGroupConfirm = async () => {
  showDeleteGroupConfirm.value = false
  if (!currentEditableGroup.value) return
  const deleteId = currentEditableGroup.value.id
  groups.value = groups.value.filter(group => group.id !== deleteId)
  const nextAssignments = { ...groupAssignments.value }
  Object.keys(nextAssignments).forEach(itemId => {
    if (nextAssignments[itemId] === deleteId) {
      delete nextAssignments[itemId]
    }
  })
  groupAssignments.value = nextAssignments
  if (filterGroup.value === deleteId) {
    filterGroup.value = 'all'
  }
  if (targetGroup.value === deleteId) {
    targetGroup.value = ''
  }
  const nextArchive = cloneArchive()
  delete nextArchive[deleteId]
  groupArchive.value = nextArchive
  await saveGroupState()
  await saveArchiveState()
}

const assignSelectedToGroup = async () => {
  if (!canAssignToActiveGroup.value) return
  const nextAssignments = { ...groupAssignments.value }
  selectedItems.value.forEach(item => {
    nextAssignments[item.id] = targetGroup.value
  })
  groupAssignments.value = nextAssignments
  await saveGroupState()
}

const removeSelectedFromGroup = async () => {
  if (!canRemoveFromGroup.value) return
  const nextAssignments = { ...groupAssignments.value }
  const nextArchive = cloneArchive()
  selectedItems.value.forEach(item => {
    const assignedGroupId = nextAssignments[item.id]
    delete nextAssignments[item.id]
    if (isManualGroupId(assignedGroupId) && nextArchive[assignedGroupId]) {
      delete nextArchive[assignedGroupId][item.id]
      if (Object.keys(nextArchive[assignedGroupId]).length === 0) {
        delete nextArchive[assignedGroupId]
      }
    }
  })
  groupAssignments.value = nextAssignments
  groupArchive.value = nextArchive
  await saveGroupState()
  await saveArchiveState()
}

const clearSelection = () => {
  selectedIds.value = []
}

const isInteractiveTarget = (target) => {
  return target instanceof Element &&
    !!target.closest('input, textarea, button, select, a, [contenteditable="true"], [contenteditable=""]')
}

const hasSelectionInsideElement = (element) => {
  if (!(element instanceof Element)) return false

  const selection = window.getSelection?.()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false
  }

  const range = selection.getRangeAt(0)
  const commonAncestor = range.commonAncestorContainer
  const commonElement = commonAncestor instanceof Element ? commonAncestor : commonAncestor?.parentElement
  return !!commonElement && element.contains(commonElement)
}

const handleItemSelect = ({ index, event }) => {
  const item = filteredData.value[index]
  if (!item) return

  if (isInteractiveTarget(event?.target) || hasSelectionInsideElement(event?.currentTarget)) {
    return
  }

  selectedIndex.value = index

  if (event?.ctrlKey || event?.metaKey) {
    if (selectedIds.value.includes(item.id)) {
      selectedIds.value = selectedIds.value.filter(itemId => itemId !== item.id)
    } else {
      selectedIds.value = [...selectedIds.value, item.id]
    }
    return
  }

  selectedIds.value = [item.id]
}

const countGroupItems = (groupId) => {
  const liveCount = sourceFilteredData.value.filter(item => isItemInGroup(item, groupId)).length
  if (!isManualGroupId(groupId)) {
    return liveCount
  }
  return liveCount + getArchivedItemsForGroup(groupId, filterSource.value).length
}

const countSourceItems = (sourceId) => {
  if (sourceId === 'all') {
    return tabFilteredData.value.length
  }

  return tabFilteredData.value.filter(item => {
    const itemSourceId = item.appName?.trim() || '__unknown__'
    return itemSourceId === sourceId
  }).length
}

const transferGroupAssignment = async (sourceItem, matcher) => {
  if (!sourceItem) return

  const groupId = groupAssignments.value[sourceItem.id]
  if (!groupId || typeof matcher !== 'function') return

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 120 * (attempt + 1)))
    const result = await window.ztools.clipboard.getHistory(1, 60)
    const replacement = (result.items || []).find(item => item.id !== sourceItem.id && matcher(item))
    if (!replacement) continue

    const nextAssignments = { ...groupAssignments.value }
    nextAssignments[replacement.id] = groupId
    if (!(result.items || []).some(item => item.id === sourceItem.id)) {
      delete nextAssignments[sourceItem.id]
    }
    groupAssignments.value = nextAssignments
    await saveGroupState()
    return
  }
}

// 复制到剪贴板
const copyToClipboard = async (id, shouldPaste = true) => {
  try {
    if (activeTab.value === 'favorite') {
      const item = favorites.value.find(i => i.id === id)
      if (!item) return
      let content = item.content
      if (item.type === 'image') {
        content = item.imagePath || item.content.replace('file://', '')
      }
      await window.ztools.clipboard.writeContent({ type: item.type, content }, shouldPaste)
      return
    }
    const sourceItem = tabFilteredData.value.find(item => item.id === id) || filteredData.value.find(item => item.id === id)
    if (sourceItem?.__archived) {
      if (sourceItem.type === 'image') {
        await window.ztools.clipboard.writeContent(
          { type: 'image', content: sourceItem.imagePath || '' },
          shouldPaste
        )
        return
      }
      if (sourceItem.type === 'file') {
        await window.ztools.clipboard.writeContent(
          {
            type: 'files',
            content: Array.isArray(sourceItem.files) ? sourceItem.files.map(file => file.path).filter(Boolean) : []
          },
          shouldPaste
        )
        return
      }
      await window.ztools.clipboard.writeContent(
        { type: 'text', content: sourceItem.content || '' },
        shouldPaste
      )
      return
    }
    await window.ztools.clipboard.write(id, shouldPaste)

    if (sourceItem?.type === 'text') {
      const sourceContent = String(sourceItem.content || '')
      transferGroupAssignment(sourceItem, item =>
        item.type === 'text' && String(item.content || '') === sourceContent
      )
    } else if (sourceItem?.type === 'image') {
      const sourcePath = sourceItem.imagePath
      transferGroupAssignment(sourceItem, item =>
        item.type === 'image' && item.imagePath === sourcePath
      )
    } else if (sourceItem?.type === 'file') {
      const sourcePaths = Array.isArray(sourceItem.files)
        ? sourceItem.files.map(file => file.path).join('|')
        : ''
      transferGroupAssignment(sourceItem, item =>
        item.type === 'file' &&
        Array.isArray(item.files) &&
        item.files.map(file => file.path).join('|') === sourcePaths
      )
    }
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const {
  selectedIndex, clipboardListRef, resetSelection,
  handleKeydown, copySelected, pasteSelected
} = useSelection(filteredData, tabs, activeTab, copyToClipboard)

const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu()
const { favoriteDialog, openFavoriteDialog, confirmFavorite, cancelFavoriteDialog } = useFavoriteDialog()

// ---- 事件处理 ----
const handleContextMenu = (event, item) => {
  if (!selectedIds.value.includes(item.id)) {
    selectedIds.value = [item.id]
  }
  showContextMenu(event, item, activeTab.value)
}

const moveItemToGroup = async (itemId, groupId) => {
  const nextAssignments = { ...groupAssignments.value }
  nextAssignments[itemId] = groupId
  groupAssignments.value = nextAssignments
  await saveGroupState()
}

const removeItemFromGroup = async (itemId) => {
  const nextAssignments = { ...groupAssignments.value }
  const assignedGroupId = nextAssignments[itemId]
  delete nextAssignments[itemId]
  groupAssignments.value = nextAssignments
  if (isManualGroupId(assignedGroupId) && groupArchive.value[assignedGroupId]) {
    const nextArchive = cloneArchive()
    delete nextArchive[assignedGroupId][itemId]
    if (Object.keys(nextArchive[assignedGroupId]).length === 0) {
      delete nextArchive[assignedGroupId]
    }
    groupArchive.value = nextArchive
    await saveArchiveState()
  }
  await saveGroupState()
}

const handleMoveContextItem = async (groupId) => {
  const items = moveGroupDialog.value.items
  moveGroupDialog.value = { show: false, items: [] }
  hideContextMenu()
  for (const item of items) {
    await moveItemToGroup(item.id, groupId)
  }
}

const handleRemoveContextItem = async () => {
  const items = moveGroupDialog.value.items
  moveGroupDialog.value = { show: false, items: [] }
  hideContextMenu()
  for (const item of items) {
    await removeItemFromGroup(item.id)
  }
}

const openImagePath = (imagePath) => {
  if (!imagePath) return
  try {
    const result = window.ztools.shellOpenPath(imagePath)
    if (result?.success === false) {
      console.error('打开图片失败:', result.error)
    }
  } catch (error) {
    console.error('打开图片失败:', error)
  }
}

const openImageItem = () => {
  const item = contextMenu.value.item
  hideContextMenu()
  if (item?.type !== 'image' || !item.imagePath) return
  openImagePath(item.imagePath)
}

const openFileActions = () => {
  if (contextMenu.value.item?.type !== 'file') return
  fileActionsDialog.value = {
    show: true,
    item: contextMenu.value.item
  }
  hideContextMenu()
}

const closeFileActions = () => {
  fileActionsDialog.value = {
    show: false,
    item: null
  }
}

const copyPathText = async (path) => {
  if (!path) return
  try {
    window.ztools.copyText(path)
    window.ztools.showNotification?.('路径已复制')
  } catch (error) {
    console.error('复制路径失败:', error)
  }
}

const openPathItem = async (file) => {
  if (!file?.path) return
  try {
    const result = window.ztools.shellOpenPath(file.path)
    if (result?.success === false) {
      console.error('打开路径失败:', result.error)
    }
  } catch (error) {
    console.error('打开路径失败:', error)
  }
}

const revealPathItem = async (file) => {
  if (!file?.path) return
  try {
    window.ztools.shellShowItemInFolder(file.path)
  } catch (error) {
    console.error('定位路径失败:', error)
  }
}

const openGroupPicker = () => {
  const contextItem = contextMenu.value.item
  const batchItems =
    contextItem && selectedIds.value.includes(contextItem.id) && selectedItems.value.length > 1
      ? selectedItems.value
      : contextItem
        ? [contextItem]
        : []
  moveGroupDialog.value = {
    show: true,
    items: batchItems
  }
  hideContextMenu()
}

const openGroupPickerForSelection = () => {
  if (selectedItems.value.length === 0) return
  moveGroupDialog.value = {
    show: true,
    items: [...selectedItems.value]
  }
}

const closeGroupPicker = () => {
  moveGroupDialog.value = { show: false, items: [] }
}

const handleFavoriteConfirm = async (remark) => {
  await confirmFavorite(addFavorite)
}

const showDeleteConfirm = ref(false)
const deleteTargetItem = ref(null)

const handleDeleteItem = () => {
  deleteTargetItem.value = contextMenu.value.item
  hideContextMenu()
  showDeleteConfirm.value = true
}

const handleDeleteConfirm = async () => {
  showDeleteConfirm.value = false
  if (!deleteTargetItem.value) return
  try {
    const target = deleteTargetItem.value
    const targetGroupId = groupAssignments.value[target.id]
    const isManualFilter = isManualGroupId(filterGroup.value)

    if (isManualFilter && targetGroupId === filterGroup.value) {
      const nextAssignments = { ...groupAssignments.value }
      delete nextAssignments[target.id]
      groupAssignments.value = nextAssignments

      const nextArchive = cloneArchive()
      if (nextArchive[filterGroup.value]) {
        delete nextArchive[filterGroup.value][target.id]
        if (Object.keys(nextArchive[filterGroup.value]).length === 0) {
          delete nextArchive[filterGroup.value]
        }
      }
      groupArchive.value = nextArchive
      await saveGroupState()
      await saveArchiveState()
      doReload()
      return
    }

    if (isManualGroupId(targetGroupId)) {
      const nextArchive = cloneArchive()
      if (!nextArchive[targetGroupId] || typeof nextArchive[targetGroupId] !== 'object') {
        nextArchive[targetGroupId] = {}
      }
      nextArchive[targetGroupId][target.id] = toArchivedSnapshot(target)
      groupArchive.value = nextArchive
      await saveArchiveState()
    }

    await window.ztools.clipboard.delete(target.id)
    doReload()
  } catch (error) {
    console.error('删除失败:', error)
  }
  deleteTargetItem.value = null
}

const handleDeleteCancel = () => {
  showDeleteConfirm.value = false
  deleteTargetItem.value = null
}

const handleOpenFavoriteDialog = () => {
  openFavoriteDialog(contextMenu.value.item)
  hideContextMenu()
}

const handleEditItem = () => {
  if (contextMenu.value.item?.type !== 'text') return
  editTargetItem.value = contextMenu.value.item
  editDialog.value = {
    show: true,
    value: contextMenu.value.item.content || ''
  }
  hideContextMenu()
}

const handleEditConfirm = async (value) => {
  editDialog.value.show = false
  if (!editTargetItem.value) return

  const nextText = String(value || '')
  if (nextText === String(editTargetItem.value.content || '')) {
    editTargetItem.value = null
    return
  }

  try {
    const result = await window.ztools.clipboard.updateText(editTargetItem.value.id, nextText)
    if (!result?.success) {
      console.error('编辑文本失败')
      return
    }
    doReload()
  } catch (error) {
    console.error('编辑文本失败:', error)
  } finally {
    editTargetItem.value = null
  }
}

const handleEditCancel = () => {
  editDialog.value.show = false
  editTargetItem.value = null
}

const handleDeleteFavorite = async (index) => {
  await deleteFavorite(index)
  if (activeTab.value === 'favorite') {
    fetchClipboardHistory()
  }
}

const handleScroll = (event) => {
  const container = event.target
  if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
    loadMore()
  }
}

const showClearConfirm = ref(false)

const clearClipboard = async () => {
  try {
    await window.ztools.clipboard.clear()
    doReload()
  } catch (error) {
    console.error('清空失败:', error)
  }
}

const handleClearClick = () => {
  showClearConfirm.value = true
}

const handleClearConfirm = async () => {
  showClearConfirm.value = false
  await clearClipboard()
}

const handleClearCancel = () => {
  showClearConfirm.value = false
}

const doReload = () => {
  resetSelection()
  clearSelection()
  reload(clipboardListRef)
}

// ---- 监听 & 生命周期 ----
watch(activeTab, doReload)
watch(sourceOptions, options => {
  if (!options.some(source => source.id === filterSource.value)) {
    filterSource.value = 'all'
  }
  if (options.length <= 1) {
    showSourceTools.value = false
  }
})
watch(filterGroup, async () => {
  resetSelection()
  clearSelection()
  await saveGroupState()
})
watch(filterSource, () => {
  resetSelection()
  clearSelection()
})
watch(targetGroup, async () => {
  await saveGroupState()
})
watch(filteredData, (items) => {
  if (items.length === 0) {
    selectedIndex.value = 0
    return
  }
  if (selectedIndex.value > items.length - 1) {
    selectedIndex.value = items.length - 1
  }
})

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', hideContextMenu)

  await Promise.all([loadFavorites(), loadGroupState(), loadArchiveState()])
  fetchClipboardHistory()

  window.ztools.clipboard.onChange(() => doReload())
  window.ztools.onPluginEnter(() => {
    searchText.value = ''
    doReload()
  })
  window.ztools.setSubInput((text) => {
    searchText.value = text.text
    doReload()
  }, '搜索剪贴板内容...', true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', hideContextMenu)
})
</script>

<template>
  <div class="clipboard-app">
    <div class="main-content">
      <TabBar
        :active-tab="activeTab"
        :favorite-count="favorites.length"
        @update:active-tab="activeTab = $event"
      />
      <div class="group-panel">
        <div class="group-chip-row">
          <div class="chip-scroll">
            <button
              v-for="group in groupChips"
              :key="group.id"
              class="group-chip"
              :class="{ active: filterGroup === group.id }"
              @click="filterGroup = group.id"
            >
              <span>{{ group.name }}</span>
              <span class="group-count">{{ countGroupItems(group.id) }}</span>
            </button>
          </div>
        </div>
        <div class="group-toolbar">
          <div class="group-status">
            当前来源：{{ filterSourceName }}，当前分组：{{ filterGroupName }}，目标分组：{{ targetGroupName }}，已选 {{ selectedIds.length }} 条
          </div>
          <div v-if="topQuickActions.length > 0" class="toolbar-toggle-row">
            <button
              v-for="action in topQuickActions"
              :key="action.key"
              class="group-btn toggle-btn"
              :class="{ active: action.active }"
              @click="action.onClick"
            >
              {{ action.label }}
            </button>
          </div>
          <div v-if="showSourceTools && sourceOptions.length > 1" class="source-tools-panel">
            <div class="source-filter-row">
              <span class="filter-row-label">来源应用</span>
              <div class="chip-scroll">
                <button
                  v-for="source in sourceOptions"
                  :key="source.id"
                  class="group-chip source-chip"
                  :class="{ active: filterSource === source.id }"
                  @click="filterSource = source.id"
                >
                  <span>{{ source.name }}</span>
                  <span class="group-count">{{ countSourceItems(source.id) }}</span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="showGroupTools" class="group-tools-panel">
            <div class="group-tool-row">
              <input
                class="group-input readonly"
                type="text"
                value="支持普通分组 / 关键词分组"
                readonly
              />
              <button class="group-btn primary" @click="showCreateGroupDialog = true">添加分组</button>
              <button
                class="group-btn"
                :disabled="!currentEditableGroup"
                @click="renameCurrentGroup"
              >
                重命名分组
              </button>
              <button
                class="group-btn danger"
                :disabled="!currentEditableGroup"
                @click="deleteCurrentGroup"
              >
                删除分组
              </button>
            </div>
            <div class="target-group-row">
              <span class="target-group-label">目标分组</span>
              <div class="chip-scroll">
                <button
                  class="group-chip target-chip"
                  :class="{ active: targetGroup === '' }"
                  @click="targetGroup = ''"
                >
                  未选择
                </button>
                <button
                  v-for="group in movableGroups"
                  :key="group.id"
                  class="group-chip target-chip"
                  :class="{ active: targetGroup === group.id }"
                  @click="targetGroup = group.id"
                >
                  {{ group.name }}
                </button>
              </div>
            </div>
            <div class="group-tool-row">
              <button class="group-btn" :disabled="!canAssignToActiveGroup" @click="assignSelectedToGroup">
                移入目标分组
              </button>
              <button class="group-btn" :disabled="!canRemoveFromGroup" @click="removeSelectedFromGroup">
                移出分组
              </button>
              <button class="group-btn" :disabled="selectedIds.length === 0" @click="clearSelection">
                清空选择
              </button>
            </div>
          </div>
        </div>
      </div>
      <RemoteReceiver v-if="activeTab === 'remote'" />
      <ClipboardList
        v-else
        ref="clipboardListRef"
        :items="filteredData"
        :loading="loading"
        :loading-more="loadingMore"
        :has-more="hasMore"
        :selected-index="selectedIndex"
        :active-tab="activeTab"
        :expanded-items="expandedItems"
        :needs-expand="needsExpand"
        :selected-ids="selectedIds"
        :group-assignments="groupAssignments"
        :groups="groups"
        @select="handleItemSelect"
        @dblclick="copyToClipboard($event)"
        @contextmenu="handleContextMenu"
        @toggle-expand="toggleExpand"
        @delete-favorite="handleDeleteFavorite"
        @scroll="handleScroll"
      />
    </div>

    <SideBar
      :can-move-group="selectedIds.length > 0"
      :group-tools-open="showGroupTools"
      @copy="copySelected"
      @paste="pasteSelected"
      @move-group="openGroupPickerForSelection"
      @toggle-group-tools="showGroupTools = !showGroupTools"
      @clear="handleClearClick"
    />

    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :can-favorite="contextMenu.item?.type === 'text' || contextMenu.item?.type === 'image'"
      :can-edit="contextMenu.item?.type === 'text'"
      :has-groups="movableGroups.length > 0"
      @favorite="handleOpenFavoriteDialog"
      @edit="handleEditItem"
      @open-group-picker="openGroupPicker"
      @delete="handleDeleteItem"
    />

    <GroupMoveDialog
      :show="moveGroupDialog.show"
      :groups="movableGroups"
      :assigned-group-id="
        moveGroupDialog.items.length === 1 ? groupAssignments[moveGroupDialog.items[0].id] || '' : ''
      "
      :selected-count="moveGroupDialog.items.length"
      @select-group="handleMoveContextItem"
      @remove-from-group="handleRemoveContextItem"
      @close="closeGroupPicker"
    />

    <FavoriteDialog
      :show="favoriteDialog.show"
      :item="favoriteDialog.item"
      @confirm="handleFavoriteConfirm"
      @cancel="cancelFavoriteDialog"
    />

    <FileActionsDialog
      :show="fileActionsDialog.show"
      :item="fileActionsDialog.item"
      @close="closeFileActions"
      @open-path="openPathItem"
      @reveal-path="revealPathItem"
      @copy-path="copyPathText($event.path)"
    />

    <InputDialog
      :show="editDialog.show"
      title="编辑文本"
      placeholder="输入新的文本内容"
      confirm-text="保存"
      :initial-value="editDialog.value"
      multiline
      @confirm="handleEditConfirm"
      @cancel="handleEditCancel"
    />

    <InputDialog
      :show="renameDialog.show"
      title="重命名分组"
      placeholder="输入新的分组名称"
      confirm-text="保存"
      :initial-value="renameDialog.value"
      @confirm="handleRenameConfirm"
      @cancel="renameDialog.show = false"
    />

    <CreateGroupDialog
      :show="showCreateGroupDialog"
      @confirm="createGroup"
      @cancel="showCreateGroupDialog = false"
    />

    <ConfirmDialog
      :show="showDeleteGroupConfirm"
      title="删除分组"
      :message="`确定删除分组「${currentEditableGroup?.name || ''}」吗？分组内记录会变成未分组。`"
      @confirm="handleDeleteGroupConfirm"
      @cancel="showDeleteGroupConfirm = false"
    />

    <ConfirmDialog
      :show="showClearConfirm"
      title="清空剪贴板"
      message="确定要清空所有剪贴板记录吗？此操作不可撤销。"
      @confirm="handleClearConfirm"
      @cancel="handleClearCancel"
    />

    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除记录"
      message="确定要删除这条剪贴板记录吗？"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<style scoped>
.clipboard-app {
  display: flex;
  width: 100%;
  min-height: 100vh;
  background: var(--bg-app);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: var(--text-primary);
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.group-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 10px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
}

.group-chip-row {
  overflow: hidden;
}

.source-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
}

.filter-row-label {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.group-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.group-chip:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.group-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.group-count {
  min-width: 18px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgb(255 255 255 / 12%);
  font-size: 12px;
}

.group-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-direction: column;
}

.group-input {
  min-width: 180px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-primary);
  outline: none;
}

.group-input:focus {
  border-color: var(--primary-color);
}

.group-btn {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-secondary);
  cursor: pointer;
}

.group-btn.primary {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.group-btn.active {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--bg-accent-light);
}

.group-btn.danger {
  color: var(--text-danger);
}

.group-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.group-status {
  color: var(--text-tertiary);
  font-size: 12px;
}

.group-tools-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding-top: 8px;
}

.source-tools-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding-top: 2px;
}

.toolbar-toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.group-tool-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.target-group-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.target-group-label {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.target-chip {
  padding: 7px 12px;
}

.source-chip {
  padding: 5px 10px;
}

.chip-scroll {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  overflow: visible;
  padding-bottom: 0;
  min-width: 0;
  width: 100%;
  align-items: flex-start;
}
</style>
