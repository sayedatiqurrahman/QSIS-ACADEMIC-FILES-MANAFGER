const DownloadsView = {
  render() {
    return '<main class="main-content" style="max-width:800px;margin:0 auto;padding:20px">' +
      '<div class="page-header">' +
        '<h2><i class="fas fa-download"></i> Downloads</h2>' +
        '<div class="page-actions">' +
          '<span id="cacheSize" style="font-size:.75rem;color:var(--text2);align-self:center"></span>' +
          '<button class="btn btn-sm" onclick="DownloadsView.clearAllCache()" style="border-color:var(--danger);color:var(--danger)">' +
            '<i class="fas fa-trash"></i> Clear All' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div id="cachedList" style="display:flex;flex-direction:column;gap:8px">' +
        '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>' +
      '</div>' +
    '</main>';
  },

  async init() {
    await waitForDB();
    this.loadCached();
  },

  destroy() {},

  formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  },

  async loadCached() {
    var list = document.getElementById('cachedList');
    if (!list) return;
    try {
      var items = await DB.cacheGetAll();
      if (!items || items.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-download"></i><p>No downloaded files yet.<br>Open a file and tap Download to cache it offline.</p><a href="#/" class="btn btn-sm btn-outline" style="margin-top:12px"><i class="fas fa-home"></i> Browse Files</a></div>';
        return;
      }

      var totalSize = 0;
      items.forEach(function(i) { totalSize += i.size || 0; });
      var sizeEl = document.getElementById('cacheSize');
      if (sizeEl) sizeEl.textContent = items.length + ' files \u00B7 ' + this.formatSize(totalSize);

      var self = this;
      list.innerHTML = items.map(function(item) {
        var id = DB.makeId(item.path);
        return '<div class="list-item" id="cache-' + id + '">' +
          '<div class="list-item-icon">' + getFileIconByType(item.mimeType) + '</div>' +
          '<div class="list-item-info">' +
            '<div class="list-item-name">' + esc(item.name) + '</div>' +
            '<div class="list-item-meta">' + self.formatSize(item.size) + ' &middot; ' + (item.editedAt ? 'Edited ' + timeAgo(item.editedAt) : 'Cached ' + timeAgo(item.cachedAt)) + '</div>' +
          '</div>' +
          '<div class="list-item-actions">' +
            '<button class="btn-action btn-view" title="Preview" onclick="DownloadsView.previewCached(\'' + id + '\')"><i class="fas fa-eye"></i></button>' +
            '<button class="btn-action btn-saveas" title="Save to device" onclick="DownloadsView.saveToDevice(\'' + id + '\',\'' + esc(item.name).replace(/'/g, "&#39;") + '\')"><i class="fas fa-share-alt"></i></button>' +
            '<button class="btn-action" title="Remove" onclick="DownloadsView.removeCache(\'' + id + '\')" style="border-color:var(--danger);color:var(--danger)"><i class="fas fa-trash"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load downloads.</p></div>';
    }
  },

  async saveToDevice(id, name) {
    var item = await DB.cacheGet(id);
    if (!item || !item.blob) { showToast('File not found.', 'error'); return; }
    var url = URL.createObjectURL(item.blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Saving: ' + name, 'info');
  },

  async removeCache(id) {
    await DB.cacheDelete(id);
    showToast('Removed', 'info');
    this.loadCached();
  },

  async clearAllCache() {
    if (!confirm('Delete all cached files?')) return;
    await DB.cacheClear();
    showToast('All downloads cleared', 'info');
    this.loadCached();
  }
};
