(function () {
  const STORAGE_KEY = 'syca-clipboard-groups-v1';
  const DEFAULT_STATE = {
    activeGroup: 'all',
    groups: [],
    assignments: {}
  };

  let state = loadState();
  let observer = null;

  function loadState() {
    try {
      const raw = window.ztools?.dbStorage?.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return {
        activeGroup: parsed.activeGroup || 'all',
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {}
      };
    } catch (error) {
      console.error('[SycaClipboard] load state failed:', error);
      return { ...DEFAULT_STATE };
    }
  }

  function saveState() {
    try {
      window.ztools?.dbStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[SycaClipboard] save state failed:', error);
    }
  }

  function getListRoot() {
    return document.querySelector('.clipboard-list');
  }

  function getSelectedItemElement() {
    return document.querySelector('.clipboard-item.selected');
  }

  function summarizeSelection() {
    const selected = getSelectedItemElement();
    if (!selected) {
      return '未选中任何记录';
    }

    const text = selected.querySelector('.content-text');
    if (text) {
      return text.textContent?.trim().slice(0, 40) || '文本';
    }

    const image = selected.querySelector('.image-preview img');
    if (image) {
      return image.getAttribute('src') ? '图片记录' : '图片';
    }

    const file = selected.querySelector('.file-name');
    if (file) {
      return file.textContent?.trim() || '文件记录';
    }

    return '已选中记录';
  }

  function createSignature(itemEl) {
    const existing = itemEl.getAttribute('data-syca-key');
    if (existing) return existing;

    const time = itemEl.querySelector('.meta-time')?.textContent?.trim() || '';
    const app = itemEl.querySelector('.meta-app')?.textContent?.trim() || '';

    let type = 'unknown';
    let payload = '';

    const text = itemEl.querySelector('.content-text');
    if (text) {
      type = 'text';
      payload = text.textContent?.trim() || '';
    } else {
      const image = itemEl.querySelector('.image-preview img');
      if (image) {
        type = 'image';
        payload = image.getAttribute('src') || '';
      } else {
        const fileNames = Array.from(itemEl.querySelectorAll('.file-name'))
          .map(el => el.textContent?.trim() || '')
          .filter(Boolean);
        if (fileNames.length > 0) {
          type = 'file';
          payload = fileNames.join('|');
        }
      }
    }

    const key = `${type}::${time}::${app}::${payload.slice(0, 400)}`;
    itemEl.setAttribute('data-syca-key', key);
    itemEl.setAttribute('data-syca-type', type);
    return key;
  }

  function getAssignment(key) {
    return state.assignments[key] || '';
  }

  function isVisibleForGroup(key) {
    const assigned = getAssignment(key);
    if (state.activeGroup === 'all') return true;
    if (state.activeGroup === 'ungrouped') return !assigned;
    return assigned === state.activeGroup;
  }

  function removeDeadAssignments(keysInDom) {
    let changed = false;
    Object.keys(state.assignments).forEach(key => {
      if (!keysInDom.has(key)) {
        return;
      }
      const groupId = state.assignments[key];
      if (groupId && !state.groups.some(group => group.id === groupId)) {
        delete state.assignments[key];
        changed = true;
      }
    });
    if (changed) {
      saveState();
    }
  }

  function upsertBadge(itemEl, label) {
    const meta = itemEl.querySelector('.item-meta');
    if (!meta) return;

    let badge = meta.querySelector('.syca-group-badge');
    if (!label) {
      badge?.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'syca-group-badge';
      meta.insertBefore(badge, meta.firstChild);
    }

    badge.textContent = label;
  }

  function applyGrouping() {
    const items = Array.from(document.querySelectorAll('.clipboard-item'));
    const keysInDom = new Set();

    items.forEach(itemEl => {
      const key = createSignature(itemEl);
      keysInDom.add(key);
      const assignedGroupId = getAssignment(key);
      const assignedGroup = state.groups.find(group => group.id === assignedGroupId);
      itemEl.setAttribute('data-syca-hidden', isVisibleForGroup(key) ? 'false' : 'true');
      upsertBadge(itemEl, assignedGroup?.name || '');
    });

    removeDeadAssignments(keysInDom);
    updatePanel();
  }

  function countGroupItems(groupId) {
    const items = Array.from(document.querySelectorAll('.clipboard-item'));
    let count = 0;
    items.forEach(itemEl => {
      const key = createSignature(itemEl);
      const assigned = getAssignment(key);
      if (groupId === 'all') {
        count += 1;
      } else if (groupId === 'ungrouped') {
        if (!assigned) count += 1;
      } else if (assigned === groupId) {
        count += 1;
      }
    });
    return count;
  }

  function makeChip(groupId, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `syca-group-chip${state.activeGroup === groupId ? ' active' : ''}`;
    button.dataset.groupId = groupId;

    const text = document.createElement('span');
    text.textContent = label;
    button.appendChild(text);

    const count = document.createElement('span');
    count.className = 'syca-group-count';
    count.textContent = String(countGroupItems(groupId));
    button.appendChild(count);

    button.addEventListener('click', () => {
      state.activeGroup = groupId;
      saveState();
      applyGrouping();
    });

    return button;
  }

  function getPanel() {
    return document.querySelector('.syca-group-panel');
  }

  function ensurePanel() {
    if (getPanel()) return getPanel();

    const mainContent = document.querySelector('.main-content');
    const tabBar = document.querySelector('.tab-bar');
    if (!mainContent || !tabBar || !tabBar.parentNode) {
      return null;
    }

    const panel = document.createElement('section');
    panel.className = 'syca-group-panel';
    panel.innerHTML = `
      <div class="syca-group-header">
        <div class="syca-group-title">分组</div>
        <div class="syca-group-selected"></div>
      </div>
      <div class="syca-group-chips"></div>
      <div class="syca-group-toolbar">
        <input class="syca-group-input" type="text" placeholder="新建分组">
        <button type="button" class="syca-group-btn primary" data-action="create">添加</button>
        <button type="button" class="syca-group-btn" data-action="assign">加入当前分组</button>
        <button type="button" class="syca-group-btn" data-action="remove">移出分组</button>
      </div>
    `;

    tabBar.parentNode.insertBefore(panel, tabBar.nextSibling);

    const input = panel.querySelector('.syca-group-input');
    const createBtn = panel.querySelector('[data-action="create"]');
    const assignBtn = panel.querySelector('[data-action="assign"]');
    const removeBtn = panel.querySelector('[data-action="remove"]');

    createBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) return;
      if (state.groups.some(group => group.name === name)) {
        input.select();
        return;
      }
      const id = `group_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      state.groups.push({ id, name });
      state.activeGroup = id;
      input.value = '';
      saveState();
      applyGrouping();
      window.ztools?.subInputFocus?.();
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        createBtn.click();
      }
    });

    assignBtn.addEventListener('click', () => {
      if (state.activeGroup === 'all' || state.activeGroup === 'ungrouped') {
        return;
      }
      const selected = getSelectedItemElement();
      if (!selected) return;
      const key = createSignature(selected);
      state.assignments[key] = state.activeGroup;
      saveState();
      applyGrouping();
    });

    removeBtn.addEventListener('click', () => {
      const selected = getSelectedItemElement();
      if (!selected) return;
      const key = createSignature(selected);
      delete state.assignments[key];
      saveState();
      applyGrouping();
    });

    return panel;
  }

  function updatePanel() {
    const panel = ensurePanel();
    if (!panel) return;

    const chips = panel.querySelector('.syca-group-chips');
    const selectedText = panel.querySelector('.syca-group-selected');
    const assignBtn = panel.querySelector('[data-action="assign"]');
    const removeBtn = panel.querySelector('[data-action="remove"]');

    chips.innerHTML = '';
    chips.appendChild(makeChip('all', '全部'));
    chips.appendChild(makeChip('ungrouped', '未分组'));
    state.groups.forEach(group => {
      chips.appendChild(makeChip(group.id, group.name));
    });

    selectedText.textContent = `当前选中: ${summarizeSelection()}`;
    assignBtn.disabled = state.activeGroup === 'all' || state.activeGroup === 'ungrouped';
    removeBtn.disabled = !getSelectedItemElement();
  }

  function watchClipboardList() {
    const listRoot = getListRoot();
    if (!listRoot) {
      setTimeout(watchClipboardList, 200);
      return;
    }

    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(() => {
      applyGrouping();
    });

    observer.observe(listRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    document.addEventListener('click', () => {
      updatePanel();
    }, true);

    applyGrouping();
  }

  window.addEventListener('DOMContentLoaded', () => {
    ensurePanel();
    watchClipboardList();
    setTimeout(() => {
      applyGrouping();
    }, 300);
  });
})();
