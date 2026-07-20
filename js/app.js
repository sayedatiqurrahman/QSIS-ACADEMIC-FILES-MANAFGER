let allTreeItems = [];
let currentPath = '';
let currentSemester = '';
let currentCategory = '';
let currentCourse = '';
let breadcrumb = [];
let semesterFolders = {};

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  registerSW();
  waitForDB().then(() => {
    loadRecentReads();
    loadSemesters().then(() => populateYearSelect());
  });
  setupEventListeners();
});

function waitForDB() {
  return new Promise((resolve) => {
    if (DB && DB.db) { resolve(); return; }
    const check = setInterval(() => { if (DB && DB.db) { clearInterval(check); resolve(); } }, 100);
  });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function setupEventListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => { m.classList.remove('active'); document.body.style.overflow = ''; });
      closeViewer();
    }
  });
}

// ========== THEME ==========
function toggleTheme() {
  const c = document.documentElement.getAttribute('data-theme');
  const n = c === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', n);
  localStorage.setItem('qsis-theme', n);
  const icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = n === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}
function loadTheme() {
  const s = localStorage.getItem('qsis-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', s);
  const icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = s === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// ========== TOAST ==========
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ========== MODALS ==========
function showUploadModal() { document.getElementById('uploadModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function showTutorialModal() { document.getElementById('tutorialModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
document.querySelectorAll('.modal').forEach(m => { m.addEventListener('click', (e) => { if (e.target === m) { m.classList.remove('active'); document.body.style.overflow = ''; } }); });

// ========== UPLOAD TABS ==========
function showUploadTab(tab) {
  document.querySelectorAll('.upload-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('uploadTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = '';
  event.currentTarget.classList.add('active');
}

// ========== RECENT READS ==========
async function loadRecentReads() {
  const container = document.getElementById('recentReads');
  if (!container) return;
  try {
    const items = await DB.historyGetRecent(7);
    if (!items || items.length === 0) {
      container.innerHTML = `<div class="recent-empty"><i class="fas fa-clock"></i> No recent reads yet. Open a file to get started.</div>`;
      return;
    }
    container.innerHTML = items.map(item => {
      const icon = getFileIconByType(item.mimeType);
      const time = timeAgo(item.lastRead);
      const cached = DB.makeId(item.path);
      return `<div class="recent-card" onclick="openRecentFile('${esc(item.path)}', '${esc(item.mimeType)}')">
        <div class="recent-icon">${icon}</div>
        <div class="recent-info">
          <div class="recent-name">${esc(item.name)}</div>
          <div class="recent-time">${time}</div>
        </div>
      </div>`;
    }).join('');

    const moreBtn = document.getElementById('recentMore');
    if (moreBtn && items.length >= 7) moreBtn.style.display = '';
    else if (moreBtn) moreBtn.style.display = 'none';
  } catch (err) {
    container.innerHTML = `<div class="recent-empty"><i class="fas fa-clock"></i> No recent reads yet.</div>`;
  }
}

async function openRecentFile(path, mimeType) {
  const id = DB.makeId(path);
  const cached = await DB.cacheGet(id);
  const item = {
    path, name: path.split('/').pop(), mimeType,
    rawUrl: `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${CONFIG.uploadPath}/${path}`
  };
  if (cached && cached.blob) {
    openViewerFromBlob(item, cached.blob);
  } else {
    openViewer(item);
  }
  await DB.historyAdd(item);
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}

// ========== LOAD SEMESTERS (ENTRY POINT) ==========
async function loadSemesters() {
  const grid = document.getElementById('semesterGrid');
  grid.innerHTML = `<div class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading semesters...</div>`;
  try {
    const tree = await GITHUB.getUploadTree(true);
    allTreeItems = tree.tree.filter(item => {
      const parts = item.path.split('/');
      const fileName = parts[parts.length - 1];
      const ext = fileName.split('.').pop().toLowerCase();
      if (item.type === 'blob') {
        if (CONFIG.ignoredFiles.includes(fileName)) return false;
        if (CONFIG.ignoredExtensions.includes(ext)) return false;
        if (!CONFIG.academicExtensions.includes(ext)) return false;
      }
      return true;
    });

    const semFolders = CONFIG.semesters.map(s => {
      const pathParts = s.id.split('/');
      const items = allTreeItems.filter(i => {
        const p = i.path;
        return (p.startsWith(s.id + '/') || p === s.id);
      });
      const fileCount = items.filter(i => i.type === 'blob').length;
      const courseSet = new Set();
      items.forEach(i => {
        const parts = i.path.split('/');
        if (parts.length > 2 && i.type === 'blob') courseSet.add(parts[1] || parts[2]);
      });
      return { ...s, fileCount, courseCount: courseSet.size };
    });

    grid.innerHTML = semFolders.map(s => `
      <div class="semester-card" onclick="openSemester('${s.id}')">
        <div class="semester-icon"><i class="fas fa-book"></i></div>
        <div class="semester-label">${s.label}</div>
        <div class="semester-meta">${s.courseCount || '?'} courses &middot; ${s.fileCount} files</div>
      </div>
    `).join('');

    document.getElementById('statsSemesters').textContent = semFolders.length;
    document.getElementById('statsCourses').textContent = '?';
    document.getElementById('statsFiles').textContent = allTreeItems.filter(i => i.type === 'blob').length;
    document.getElementById('statsYears').textContent = '?';
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="loading-cell" style="grid-column:1/-1">
      <i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i>
      <p>Could not load from GitHub. Check connection.</p>
      <button class="btn btn-sm" onclick="loadSemesters()" style="margin-top:12px"><i class="fas fa-sync"></i> Retry</button>
    </div>`;
  }
}

// ========== NAVIGATION ==========
function openSemester(semId) {
  currentSemester = semId;
  currentCategory = '';
  currentCourse = '';
  currentPath = semId;
  breadcrumb = [{ label: 'Home', action: 'goHome()' }, { label: semId.replace('-semister', ' Semester'), action: `openSemester('${semId}')` }];
  renderBreadcrumb();
  renderCategories(semId);
  document.getElementById('fileSection').style.display = '';
  document.getElementById('semesterSection').style.display = 'none';
  document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-book"></i> ${semId.replace('-semister', ' Semester')}`;
}

function openCategory(semId, catKey) {
  currentCategory = catKey;
  currentCourse = '';
  const actualFolder = semesterFolders[semId]?.[catKey] || catKey;
  currentPath = semId + '/' + actualFolder;
  breadcrumb = [
    { label: 'Home', action: 'goHome()' },
    { label: semId.replace('-semister', ' Semester'), action: `openSemester('${semId}')` },
    { label: CONFIG.categories[catKey]?.label || catKey, action: `openCategory('${semId}','${catKey}')` }
  ];
  renderBreadcrumb();
  renderCourses(semId, catKey);
  document.getElementById('sectionTitle2').innerHTML = `<i class="fas ${CONFIG.categories[catKey]?.icon || 'fa-folder'}"></i> ${CONFIG.categories[catKey]?.label || catKey}`;
}

function openCourse(semId, catKey, coursePath) {
  currentCourse = coursePath;
  currentPath = coursePath;

  const actualFolder = semesterFolders[semId]?.[catKey] || catKey;
  const prefix = semId + '/' + actualFolder + '/';
  const relPath = coursePath.startsWith(prefix) ? coursePath.substring(prefix.length) : coursePath.split('/').pop();
  const parts = relPath.split('/').filter(Boolean);

  breadcrumb = [
    { label: 'Home', action: 'goHome()' },
    { label: semId.replace('-semister', ' Semester'), action: `openSemester('${semId}')` },
    { label: CONFIG.categories[catKey]?.label || catKey, action: `openCategory('${semId}','${catKey}')` }
  ];

  let builtPath = prefix;
  parts.forEach((part, i) => {
    builtPath += part;
    if (i < parts.length - 1) {
      const p = builtPath;
      breadcrumb.push({ label: part, action: `openCourse('${semId}','${catKey}','${p}')` });
    } else {
      breadcrumb.push({ label: part });
    }
    builtPath += '/';
  });

  renderBreadcrumb();
  renderFilesInPath(coursePath);
  const lastPart = parts[parts.length - 1] || coursePath.split('/').pop();
  document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-folder-open"></i> ${esc(lastPart)}`;
}

function goHome() {
  currentSemester = '';
  currentCategory = '';
  currentCourse = '';
  currentPath = '';
  breadcrumb = [];
  renderBreadcrumb();
  document.getElementById('fileSection').style.display = 'none';
  document.getElementById('semesterSection').style.display = '';
  document.getElementById('sectionTitle').innerHTML = `<i class="fas fa-book"></i> Select Semester`;
  loadRecentReads();
}

function renderBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  if (!breadcrumb.length) { el.innerHTML = ''; return; }
  el.innerHTML = breadcrumb.map((b, i) => {
    if (b.action) return `<span class="bc-item" onclick="${b.action}">${b.label}</span><span class="bc-sep"><i class="fas fa-chevron-right"></i></span>`;
    return `<span class="bc-item bc-active">${b.label}</span>`;
  }).join('');
}

function detectCatFromFolder(folderName) {
  const lower = folderName.toLowerCase();
  if (lower === 'sheet' || lower.includes('sheet')) return 'sheet';
  if (lower.includes('previous question') || lower.includes('question')) return 'question';
  if (lower === 'notes' || lower.toLowerCase() === 'note') return 'note';
  if (lower.includes('syllabus')) return 'syllabus';
  return 'other';
}

// ========== RENDER CATEGORIES ==========
function renderCategories(semId) {
  const grid = document.getElementById('fileGrid');

  const topFolders = {};
  allTreeItems.forEach(item => {
    if (!item.path.startsWith(semId + '/')) return;
    const rel = item.path.substring(semId.length + 1);
    const firstPart = rel.split('/')[0];
    if (!firstPart) return;
    if (!topFolders[firstPart]) topFolders[firstPart] = { name: firstPart, blobCount: 0, treeCount: 0 };
    if (item.type === 'blob') topFolders[firstPart].blobCount++;
    else topFolders[firstPart].treeCount++;
  });

  semesterFolders[semId] = {};
  const catEntries = [];

  Object.values(topFolders).forEach(folder => {
    const cat = detectCatFromFolder(folder.name);
    semesterFolders[semId][cat] = folder.name;
    const existing = catEntries.find(e => e.cat === cat);
    if (existing) {
      existing.count += folder.blobCount;
      existing.folders.push(folder.name);
    } else {
      catEntries.push({ cat, count: folder.blobCount, folders: [folder.name] });
    }
  });

  if (catEntries.length === 0) {
    grid.innerHTML = `<div class="loading-cell"><i class="fas fa-folder-open"></i> No files found in this semester.</div>`;
    return;
  }

  grid.innerHTML = catEntries.map(ce => {
    const cat = CONFIG.categories[ce.cat] || CONFIG.categories.other;
    return `<div class="category-card" onclick="openCategory('${semId}','${ce.cat}')">
      <div class="cat-icon" style="color:${cat.color}"><i class="fas ${cat.icon}"></i></div>
      <div class="cat-label">${cat.label}</div>
      <div class="cat-count">${ce.count} files</div>
    </div>`;
  }).join('');
}

// ========== RENDER COURSES ==========
function renderCourses(semId, catKey) {
  const grid = document.getElementById('fileGrid');
  const actualFolder = semesterFolders[semId]?.[catKey] || catKey;
  const prefix = semId + '/' + actualFolder + '/';
  const items = allTreeItems.filter(i => i.path.startsWith(prefix) && i.path !== prefix);

  const directFiles = [];
  const courseMap = {};

  items.forEach(item => {
    const rel = item.path.substring(prefix.length);
    const parts = rel.split('/');
    if (!rel || parts.length === 0) return;
    if (item.type === 'blob') {
      if (parts.length <= 1) {
        directFiles.push(item);
      } else {
        const courseName = parts[0];
        if (!courseMap[courseName]) courseMap[courseName] = [];
        courseMap[courseName].push(item);
      }
    } else if (item.type === 'tree') {
      const folderName = parts[0];
      if (!courseMap[folderName]) courseMap[folderName] = [];
    }
  });

  const courses = Object.entries(courseMap).sort((a, b) => a[0].localeCompare(b[0]));

  if (courses.length === 0 && directFiles.length === 0) {
    grid.innerHTML = `<div class="loading-cell"><i class="fas fa-folder-open"></i> No files found.</div>`;
    return;
  }

  let html = '';

  if (courses.length > 0) {
    html += courses.map(([name, files]) => {
      const pdfCount = files.filter(f => f.path.toLowerCase().endsWith('.pdf')).length;
      const docCount = files.filter(f => /\.(doc|docx)$/i.test(f.path)).length;
      const imgCount = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.path)).length;
      const isEmpty = files.length === 0;
      const iconClass = isEmpty ? 'fa-folder' : 'fa-book-open';
      const iconColor = isEmpty ? 'var(--text2)' : '';
      return `<div class="course-card" onclick="openCourse('${semId}','${catKey}','${prefix}${name}')">
        <div class="course-icon"><i class="fas ${iconClass}" ${iconColor ? `style="color:${iconColor}"` : ''}></i></div>
        <div class="course-info">
          <div class="course-name">${esc(name)}</div>
          <div class="course-meta">
            ${pdfCount ? `<span><i class="fas fa-file-pdf" style="color:#ef4444"></i> ${pdfCount}</span>` : ''}
            ${docCount ? `<span><i class="fas fa-file-word" style="color:#3b82f6"></i> ${docCount}</span>` : ''}
            ${imgCount ? `<span><i class="fas fa-file-image" style="color:#34d399"></i> ${imgCount}</span>` : ''}
            ${isEmpty ? '<span><i class="fas fa-inbox"></i> Empty</span>' : `<span><i class="fas fa-file"></i> ${files.length} total</span>`}
          </div>
        </div>
        <i class="fas fa-chevron-right course-arrow"></i>
      </div>`;
    }).join('');
  }

  if (directFiles.length > 0) {
    html += directFiles.map(item => {
      const name = item.path.split('/').pop();
      const ext = name.split('.').pop().toLowerCase();
      const mime = ['jpg','jpeg','png','gif','webp'].includes(ext) ? 'image' : ext === 'pdf' ? 'pdf' : ['doc','docx'].includes(ext) ? 'doc' : 'other';
      const id = DB.makeId(item.path);
      return `<div class="file-card" id="file-${id}">
        <div class="file-card-main" onclick="clickFile('${esc(item.path)}','${mime}')">
          <div class="file-icon">${getFileIconByType(mime)}</div>
          <div class="file-info">
            <div class="file-name">${esc(name)}</div>
            <div class="file-path">${esc(item.path)}</div>
          </div>
        </div>
        <div class="file-actions">
          <button class="btn-action btn-view" title="View" onclick="event.stopPropagation();clickFile('${esc(item.path)}','${mime}')"><i class="fas fa-eye"></i></button>
          <button class="btn-action btn-download" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')"><i class="fas fa-download"></i></button>
          <button class="btn-action btn-saveas" id="sv-${id}" title="Save as" style="display:none" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')"><i class="fas fa-share-alt"></i></button>
        </div>
      </div>`;
    }).join('');
    checkCachedButtons();
  }

  grid.innerHTML = html;
}

// ========== RENDER FILES ==========
function renderFilesInPath(folderPath) {
  const grid = document.getElementById('fileGrid');
  const prefix = folderPath.endsWith('/') ? folderPath : folderPath + '/';
  const items = allTreeItems.filter(i => {
    if (i.type !== 'blob') return false;
    if (!i.path.startsWith(prefix)) return false;
    const rel = i.path.substring(prefix.length);
    return rel && !rel.includes('/');
  });
  const subFolders = new Set();
  allTreeItems.forEach(i => {
    if (!i.path.startsWith(prefix)) return;
    const rel = i.path.substring(prefix.length);
    if (!rel) return;
    if (i.type === 'tree') {
      if (!rel.includes('/')) subFolders.add(rel);
    } else if (i.type === 'blob') {
      const slashIdx = rel.indexOf('/');
      if (slashIdx > 0) subFolders.add(rel.substring(0, slashIdx));
    }
  });

  let html = '';
  if (subFolders.size > 0) {
    html += [...subFolders].sort().map(f => {
      return `<div class="course-card" onclick="openCourse('${currentSemester}','${currentCategory}','${prefix}${f}')">
        <div class="course-icon"><i class="fas fa-folder" style="color:var(--accent)"></i></div>
        <div class="course-info"><div class="course-name">${esc(f)}</div></div>
        <i class="fas fa-chevron-right course-arrow"></i>
      </div>`;
    }).join('');
  }

  if (items.length === 0 && !subFolders.size) {
    grid.innerHTML = `<div class="loading-cell"><i class="fas fa-folder-open"></i> No files here yet.</div>`;
    return;
  }

  const fileCards = items.map((item, idx) => {
    const name = item.path.split('/').pop();
    const ext = name.split('.').pop().toLowerCase();
    const mime = ['jpg','jpeg','png','gif','webp'].includes(ext) ? 'image' : ext === 'pdf' ? 'pdf' : ['doc','docx'].includes(ext) ? 'doc' : 'other';
    const icon = getFileIconByType(mime);
    const id = DB.makeId(item.path);
    return `<div class="file-card" id="file-${id}">
      <div class="file-card-main" onclick="clickFile('${esc(item.path)}','${mime}')">
        <div class="file-icon">${icon}</div>
        <div class="file-info">
          <div class="file-name">${esc(name)}</div>
          <div class="file-path">${esc(item.path)}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-action btn-view" title="View" onclick="event.stopPropagation();clickFile('${esc(item.path)}','${mime}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-action btn-download" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')">
          <i class="fas fa-download"></i>
        </button>
        <button class="btn-action btn-saveas" id="sv-${id}" title="Save as" style="display:none" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')">
          <i class="fas fa-share-alt"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  grid.innerHTML = html + fileCards;
  checkCachedButtons();
}

async function checkCachedButtons() {
  const cards = document.querySelectorAll('.file-card');
  for (const card of cards) {
    const id = card.id.replace('file-', '');
    const cached = await DB.cacheGet(id);
    if (cached) {
      const dl = document.getElementById('dl-' + id);
      const sv = document.getElementById('sv-' + id);
      if (dl) dl.style.display = 'none';
      if (sv) sv.style.display = '';
    }
  }
}

// ========== CLICK FILE ==========
function clickFile(path, mime) {
  const name = path.split('/').pop();
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${CONFIG.uploadPath}/${path}`;
  const item = { path, name, mimeType: mime, rawUrl };
  openViewer(item);
  DB.historyAdd(item).then(() => loadRecentReads());
}

// ========== DOWNLOAD TO CACHE ==========
async function downloadToCache(path, name, mime) {
  const id = DB.makeId(path);
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${CONFIG.uploadPath}/${path}`;
  const dl = document.getElementById('dl-' + id);
  const sv = document.getElementById('sv-' + id);

  if (dl) { dl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; dl.disabled = true; }

  try {
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const item = { path, name, mimeType: mime, ext: name.split('.').pop(), size: blob.size };
    await DB.cacheFile(item, blob);

    if (dl) dl.style.display = 'none';
    if (sv) sv.style.display = '';
    showToast(`Downloaded: ${name}`, 'success');
  } catch (err) {
    console.error(err);
    if (dl) { dl.innerHTML = '<i class="fas fa-download"></i>'; dl.disabled = false; }
    showToast('Download failed. Try again.', 'error');
  }
}

// ========== SAVE AS (to device) ==========
async function saveAsFile(path, name) {
  const id = DB.makeId(path);
  const cached = await DB.cacheGet(id);
  if (!cached || !cached.blob) {
    showToast('File not cached. Download it first.', 'error');
    return;
  }
  const url = URL.createObjectURL(cached.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Saving: ${name}`, 'info');
}

// ========== HELPERS ==========
function detectCategory(path) {
  const lp = path.toLowerCase();
  if (lp.includes('sheet') || lp.includes('main sheet')) return 'sheet';
  if (lp.includes('question') || lp.includes('previous question') || lp.includes('/mid') || lp.includes('/final')) return 'question';
  if (lp.includes('note') || lp.includes('notes')) return 'note';
  if (lp.includes('syllabus')) return 'syllabus';
  return 'other';
}

function getFileIconByType(mime) {
  if (mime === 'image') return '<i class="fas fa-file-image" style="color:#34d399"></i>';
  if (mime === 'pdf') return '<i class="fas fa-file-pdf" style="color:#ef4444"></i>';
  if (mime === 'doc') return '<i class="fas fa-file-word" style="color:#3b82f6"></i>';
  return '<i class="fas fa-file" style="color:var(--text2)"></i>';
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML.replace(/'/g, '&#39;');
}

// ========== FILE VIEWER ==========
function openViewer(item) {
  if (!item) return;
  const viewer = document.getElementById('fileViewer');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerBody = document.getElementById('viewerBody');

  viewerTitle.textContent = item.name;
  document.getElementById('viewerDownloadBtn').onclick = () => downloadToCache(item.path, item.name, item.mimeType);
  document.getElementById('viewerSaveAsBtn').onclick = () => saveAsFile(item.path, item.name);

  const id = DB.makeId(item.path);
  DB.cacheGet(id).then(cached => {
    if (cached && cached.blob) {
      document.getElementById('viewerDownloadBtn').style.display = 'none';
      document.getElementById('viewerSaveAsBtn').style.display = '';
    } else {
      document.getElementById('viewerDownloadBtn').style.display = '';
      document.getElementById('viewerSaveAsBtn').style.display = 'none';
    }
  });

  if (item.mimeType === 'pdf') openPdfViewer(item.rawUrl, viewerBody, item.path);
  else if (item.mimeType === 'image') openImageViewer(item.rawUrl, item.name, viewerBody);
  else if (item.mimeType === 'doc') openDocViewer(item.rawUrl, viewerBody);
  else {
    viewerBody.innerHTML = `<div class="viewer-fallback">
      <i class="fas fa-file" style="font-size:3rem;color:var(--text2);margin-bottom:16px"></i>
      <p>Preview not available for this file type.</p>
      <p style="font-size:0.85rem;color:var(--text2)">Use download button to save offline.</p>
    </div>`;
  }

  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';
  DB.historyAdd(item).then(() => loadRecentReads());
}

function openViewerFromBlob(item, blob) {
  if (!item || !blob) return;
  const viewer = document.getElementById('fileViewer');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerBody = document.getElementById('viewerBody');

  viewerTitle.textContent = item.name;
  document.getElementById('viewerDownloadBtn').style.display = 'none';
  document.getElementById('viewerSaveAsBtn').style.display = '';
  document.getElementById('viewerSaveAsBtn').onclick = () => saveAsFile(item.path, item.name);

  const url = URL.createObjectURL(blob);
  if (item.mimeType === 'pdf') openPdfViewer(url, viewerBody, item.path);
  else if (item.mimeType === 'image') openImageViewer(url, item.name, viewerBody);
  else {
    viewerBody.innerHTML = `<div class="viewer-fallback">
      <i class="fas fa-file" style="font-size:3rem;color:var(--text2);margin-bottom:16px"></i>
      <p>File cached. Use "Save as" to save to device.</p>
    </div>`;
  }
  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeViewer() {
  const viewer = document.getElementById('fileViewer');
  if (viewer) viewer.classList.remove('active');
  document.body.style.overflow = '';
  pdfDoc = null;
  pdfAnnotations = [];
  pdfFilePath = '';
  pdfMode = 'scroll';
  pdfTool = 'hand';
  if (document.fullscreenElement) document.exitFullscreen();
  const body = document.getElementById('viewerBody');
  if (body) body.innerHTML = '';
}

// ========== PDF VIEWER ==========
let pdfDoc = null, pdfPage = 1, pdfScale = 1.5, pdfTotal = 0;
let pdfMode = 'scroll', pdfTool = 'hand', pdfDragging = false, pdfDragStart = { x: 0, y: 0 };
let pdfAnnotations = [], pdfHighlightStart = null, pdfFilePath = '';

function openPdfViewer(url, container, filePath) {
  pdfFilePath = filePath || '';
  pdfAnnotations = [];
  container.innerHTML = `<div class="pdf-viewer-container">
    <div class="pdf-toolbar">
      <div class="pdf-toolbar-group">
        <button class="btn btn-sm pdf-mode-btn active" id="pdfModeScroll" onclick="pdfSetMode('scroll')" title="Scroll mode"><i class="fas fa-arrows-alt-v"></i> Scroll</button>
        <button class="btn btn-sm pdf-mode-btn" id="pdfModePage" onclick="pdfSetMode('page')" title="Single page"><i class="fas fa-file"></i> Page</button>
      </div>
      <span class="pdf-sep"></span>
      <div class="pdf-toolbar-group">
        <button class="btn btn-sm" onclick="pdfPrev()" title="Previous page"><i class="fas fa-chevron-left"></i></button>
        <span id="pdfPageInfo">Loading...</span>
        <button class="btn btn-sm" onclick="pdfNext()" title="Next page"><i class="fas fa-chevron-right"></i></button>
      </div>
      <span class="pdf-sep"></span>
      <div class="pdf-toolbar-group">
        <button class="btn btn-sm" onclick="pdfZoomOut()" title="Zoom out"><i class="fas fa-minus"></i></button>
        <span id="pdfZoomInfo">100%</span>
        <button class="btn btn-sm" onclick="pdfZoomIn()" title="Zoom in"><i class="fas fa-plus"></i></button>
        <button class="btn btn-sm" onclick="pdfFitWidth()" title="Fit width"><i class="fas fa-arrows-alt-h"></i></button>
        <button class="btn btn-sm" onclick="pdfFitPage()" title="Fit page"><i class="fas fa-expand-arrows-alt"></i></button>
      </div>
      <span class="pdf-sep"></span>
      <div class="pdf-toolbar-group">
        <button class="btn btn-sm pdf-tool-btn active" id="pdfToolHand" onclick="pdfSetTool('hand')" title="Hand tool"><i class="fas fa-hand-paper"></i></button>
        <button class="btn btn-sm pdf-tool-btn" id="pdfToolHighlight" onclick="pdfSetTool('highlight')" title="Highlight"><i class="fas fa-highlighter"></i></button>
        <button class="btn btn-sm pdf-tool-btn" id="pdfToolDraw" onclick="pdfSetTool('draw')" title="Pen"><i class="fas fa-pen"></i></button>
        <button class="btn btn-sm" id="pdfClearAnnotations" onclick="pdfClearAnnotations()" title="Clear annotations"><i class="fas fa-eraser"></i></button>
      </div>
      <span class="pdf-sep"></span>
      <div class="pdf-toolbar-group">
        <button class="btn btn-sm" onclick="pdfFullscreen()" title="Fullscreen"><i class="fas fa-expand"></i></button>
      </div>
    </div>
    <div class="pdf-scroll-area" id="pdfScrollArea">
      <div class="pdf-pages-container" id="pdfPagesContainer"></div>
    </div>
  </div>`;
  loadPdf(url);
  setupPdfInteractions();
}

function setupPdfInteractions() {
  const area = document.getElementById('pdfScrollArea');
  if (!area) return;
  area.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) pdfZoomIn(); else pdfZoomOut();
    }
  }, { passive: false });
  area.addEventListener('mousedown', (e) => {
    if (e.target.closest('.pdf-toolbar')) return;
    if (pdfTool === 'hand' || pdfTool === 'highlight' || pdfTool === 'draw') {
      pdfDragging = true;
      pdfDragStart = { x: e.clientX, y: e.clientY, scrollLeft: area.scrollLeft, scrollTop: area.scrollTop };
      if (pdfTool === 'highlight') pdfHighlightStart = { x: e.clientX, y: e.clientY };
      if (pdfTool === 'draw') pdfDrawStart(e);
    }
  });
  area.addEventListener('mousemove', (e) => {
    if (!pdfDragging) return;
    if (pdfTool === 'hand') {
      const dx = e.clientX - pdfDragStart.x;
      const dy = e.clientY - pdfDragStart.y;
      area.scrollLeft = pdfDragStart.scrollLeft - dx;
      area.scrollTop = pdfDragStart.scrollTop - dy;
    } else if (pdfTool === 'draw') {
      pdfDrawMove(e);
    }
  });
  area.addEventListener('mouseup', (e) => {
    if (pdfDragging && pdfTool === 'highlight' && pdfHighlightStart) {
      pdfAddHighlight(pdfHighlightStart, { x: e.clientX, y: e.clientY });
      pdfHighlightStart = null;
    }
    pdfDragging = false;
    if (pdfTool === 'draw') pdfDrawEnd();
  });
  area.addEventListener('mouseleave', () => { pdfDragging = false; pdfHighlightStart = null; });
  const viewer = document.getElementById('fileViewer');
  if (viewer) viewer.addEventListener('mousemove', (e) => {
    if (pdfTool === 'hand') area.style.cursor = pdfDragging ? 'grabbing' : 'grab';
    else if (pdfTool === 'highlight') area.style.cursor = 'crosshair';
    else if (pdfTool === 'draw') area.style.cursor = 'crosshair';
    else area.style.cursor = 'default';
  });
}

function pdfSetMode(mode) {
  pdfMode = mode;
  document.querySelectorAll('.pdf-mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('pdfMode' + (mode === 'scroll' ? 'Scroll' : 'Page')).classList.add('active');
  if (mode === 'page') pdfFitPage(); else pdfFitWidth();
  renderPdfPages();
}

function pdfSetTool(tool) {
  pdfTool = tool;
  document.querySelectorAll('.pdf-tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('pdfTool' + tool.charAt(0).toUpperCase() + tool.slice(1)).classList.add('active');
}

async function loadPdf(url) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    pdfDoc = await pdfjsLib.getDocument(url).promise;
    pdfTotal = pdfDoc.numPages;
    pdfPage = 1;
    const page0 = await pdfDoc.getPage(1);
    const vp0 = page0.getViewport({ scale: 1 });
    const area = document.getElementById('pdfScrollArea');
    if (area) pdfScale = (area.clientWidth - 40) / vp0.width;
    if (pdfFilePath) {
      const saved = await DB.editsGet(pdfFilePath);
      if (saved && saved.annotations) pdfAnnotations = saved.annotations;
    }
    renderPdfPages();
  } catch (err) {
    document.getElementById('pdfPagesContainer').innerHTML = `<div class="viewer-fallback">
      <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--warning);margin-bottom:12px"></i>
      <p>Could not load PDF.</p><p style="font-size:0.85rem;color:var(--text2)">${err.message}</p>
    </div>`;
  }
}

async function renderPdfPages() {
  if (!pdfDoc) return;
  const container = document.getElementById('pdfPagesContainer');
  if (!container) return;

  if (pdfMode === 'scroll') {
    container.innerHTML = '';
    container.className = 'pdf-pages-container pdf-scroll-mode';
    for (let i = 1; i <= pdfTotal; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper';
      wrapper.id = 'pdf-page-' + i;
      const canvas = document.createElement('canvas');
      wrapper.appendChild(canvas);
      container.appendChild(wrapper);
      await renderSinglePage(i, canvas);
    }
    if (pdfPage > 0 && pdfPage <= pdfTotal) {
      const target = document.getElementById('pdf-page-' + pdfPage);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else {
    container.innerHTML = '';
    container.className = 'pdf-pages-container pdf-page-mode';
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-page-wrapper pdf-page-single';
    const canvas = document.createElement('canvas');
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);
    await renderSinglePage(pdfPage, canvas);
  }
  document.getElementById('pdfPageInfo').textContent = pdfMode === 'page' ? `${pdfPage} / ${pdfTotal}` : `1 - ${pdfTotal}`;
  document.getElementById('pdfZoomInfo').textContent = Math.round(pdfScale * 100 / 1.5) + '%';
  renderAnnotationsOnPage();
}

async function renderSinglePage(num, canvas) {
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale: pdfScale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = viewport.width + 'px';
  canvas.style.height = viewport.height + 'px';
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
}

function pdfPrev() { if (pdfDoc && pdfPage > 1) { pdfPage--; renderPdfPages(); } }
function pdfNext() { if (pdfDoc && pdfPage < pdfTotal) { pdfPage++; renderPdfPages(); } }
function pdfZoomIn() { if (pdfDoc) { pdfScale = Math.min(pdfScale * 1.25, 5); renderPdfPages(); } }
function pdfZoomOut() { if (pdfDoc && pdfScale > 0.3) { pdfScale = Math.max(pdfScale / 1.25, 0.3); renderPdfPages(); } }

async function pdfFitWidth() {
  if (!pdfDoc) return;
  const area = document.getElementById('pdfScrollArea');
  if (!area) return;
  const page0 = await pdfDoc.getPage(1);
  const vp0 = page0.getViewport({ scale: 1 });
  pdfScale = (area.clientWidth - 40) / vp0.width;
  renderPdfPages();
}

async function pdfFitPage() {
  if (!pdfDoc) return;
  const area = document.getElementById('pdfScrollArea');
  if (!area) return;
  const page0 = await pdfDoc.getPage(1);
  const vp0 = page0.getViewport({ scale: 1 });
  const sw = (area.clientWidth - 40) / vp0.width;
  const sh = (area.clientHeight - 20) / vp0.height;
  pdfScale = Math.min(sw, sh);
  renderPdfPages();
}

function pdfFullscreen() {
  const el = document.getElementById('fileViewer');
  if (!el) return;
  if (document.fullscreenElement) document.exitFullscreen();
  else if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

function pdfGetCurrentPageCanvas() {
  const container = document.getElementById('pdfPagesContainer');
  if (!container) return null;
  if (pdfMode === 'page') {
    const canvas = container.querySelector('canvas');
    return canvas || null;
  }
  const el = document.getElementById('pdf-page-' + pdfPage);
  return el ? el.querySelector('canvas') : null;
}

function pdfGetPageFromY(absY) {
  if (pdfMode === 'page') return pdfPage;
  for (let i = 1; i <= pdfTotal; i++) {
    const el = document.getElementById('pdf-page-' + i);
    if (!el) continue;
    const area = document.getElementById('pdfScrollArea');
    const areaRect = area.getBoundingClientRect();
    const wrapperRect = el.getBoundingClientRect();
    const elTop = wrapperRect.top - areaRect.top + area.scrollTop;
    const elBottom = elTop + wrapperRect.height;
    if (absY >= elTop && absY < elBottom) return i;
  }
  return pdfPage;
}

function pdfAddHighlight(start, end) {
  const area = document.getElementById('pdfScrollArea');
  if (!area) return;
  const rect = area.getBoundingClientRect();
  const container = document.getElementById('pdfPagesContainer');
  const canvas = pdfGetCurrentPageCanvas();
  if (!canvas || !container) return;

  const absX = Math.min(start.x, end.x) - rect.left + area.scrollLeft;
  const absY = Math.min(start.y, end.y) - rect.top + area.scrollTop;
  const absW = Math.abs(end.x - start.x);
  const absH = Math.abs(end.y - start.y);
  if (absW < 5 && absH < 5) return;

  const canvasRect = canvas.getBoundingClientRect();
  const pageAbsX = canvasRect.left - rect.left + area.scrollLeft;
  const pageAbsY = canvasRect.top - rect.top + area.scrollTop;
  const displayW = canvasRect.width;
  const displayH = canvasRect.height;

  const normX = (absX - pageAbsX) / displayW;
  const normY = (absY - pageAbsY) / displayH;
  const normW = absW / displayW;
  const normH = absH / displayH;

  const targetPage = pdfGetPageFromY(absY);

  pdfAnnotations.push({
    type: 'highlight',
    page: targetPage,
    x: normX, y: normY, w: normW, h: normH,
    color: 'rgba(255,230,0,0.35)'
  });
  renderAnnotationsOnPage();
  pdfSaveAnnotations();
}

function renderAnnotationsOnPage() {
  const container = document.getElementById('pdfPagesContainer');
  if (!container) return;
  container.querySelectorAll('.pdf-highlight-box').forEach(el => el.remove());
  container.querySelectorAll('.pdf-page-wrapper .pdf-draw-layer').forEach(el => el.remove());

  const highlightAnnotations = pdfAnnotations.filter(a => {
    if (a.type !== 'highlight') return false;
    if (pdfMode === 'page') return a.page === pdfPage;
    return true;
  });

  highlightAnnotations.forEach((hl) => {
    let canvas;
    if (pdfMode === 'page') {
      canvas = container.querySelector('canvas');
    } else {
      const pageEl = document.getElementById('pdf-page-' + hl.page);
      canvas = pageEl ? pageEl.querySelector('canvas') : null;
    }
    if (!canvas) return;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    const box = document.createElement('div');
    box.className = 'pdf-highlight-box';
    box.style.left = (hl.x * displayW) + 'px';
    box.style.top = (hl.y * displayH) + 'px';
    box.style.width = (hl.w * displayW) + 'px';
    box.style.height = (hl.h * displayH) + 'px';
    box.style.background = hl.color;
    box.title = 'Double-click to remove';
    box.addEventListener('dblclick', () => {
      const idx = pdfAnnotations.indexOf(hl);
      if (idx >= 0) pdfAnnotations.splice(idx, 1);
      renderAnnotationsOnPage();
      pdfSaveAnnotations();
    });
    if (canvas.parentElement) canvas.parentElement.appendChild(box);
  });

  const drawingAnnotations = pdfAnnotations.filter(a => {
    if (a.type !== 'drawing') return false;
    if (pdfMode === 'page') return a.page === pdfPage;
    return true;
  });

  drawingAnnotations.forEach((drawing) => {
    let pageWrapper;
    if (pdfMode === 'page') {
      pageWrapper = container.querySelector('.pdf-page-wrapper');
    } else {
      pageWrapper = document.getElementById('pdf-page-' + drawing.page);
    }
    if (!pageWrapper) return;
    const canvas = pageWrapper.querySelector('canvas');
    if (!canvas) return;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    const drawLayer = document.createElement('div');
    drawLayer.className = 'pdf-draw-layer';
    drawLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
    pageWrapper.style.position = 'relative';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', displayW);
    svg.setAttribute('height', displayH);
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';

    for (let i = 1; i < drawing.points.length; i++) {
      const prev = drawing.points[i - 1];
      const cur = drawing.points[i];
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', prev.x * displayW);
      line.setAttribute('y1', prev.y * displayH);
      line.setAttribute('x2', cur.x * displayW);
      line.setAttribute('y2', cur.y * displayH);
      line.setAttribute('stroke', drawing.color || 'rgba(239,68,68,0.7)');
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    }

    drawLayer.appendChild(svg);
    pageWrapper.appendChild(drawLayer);
  });
}

function pdfClearAnnotations() {
  pdfAnnotations = [];
  const container = document.getElementById('pdfPagesContainer');
  if (container) {
    container.querySelectorAll('.pdf-highlight-box').forEach(el => el.remove());
    container.querySelectorAll('.pdf-draw-layer').forEach(el => el.remove());
  }
  pdfSaveAnnotations();
}

async function pdfSaveAnnotations() {
  if (!pdfFilePath) return;
  try {
    await DB.editsSave(pdfFilePath, { annotations: pdfAnnotations });
  } catch (err) {
    console.error('Failed to save annotations:', err);
  }
}

let pdfDrawPoints = [];
function pdfDrawStart(e) {
  const area = document.getElementById('pdfScrollArea');
  const canvas = pdfGetCurrentPageCanvas();
  if (!area || !canvas) return;

  const wrapper = canvas.parentElement;
  if (!wrapper) return;
  wrapper.style.position = 'relative';

  const wrapperRect = wrapper.getBoundingClientRect();
  const normX = (e.clientX - wrapperRect.left) / wrapper.clientWidth;
  const normY = (e.clientY - wrapperRect.top) / wrapper.clientHeight;
  pdfDrawPoints = [{ x: normX, y: normY }];

  const drawLayer = document.createElement('div');
  drawLayer.className = 'pdf-draw-layer';
  drawLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', wrapper.clientWidth);
  svg.setAttribute('height', wrapper.clientHeight);
  svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
  svg.id = 'pdfDrawSvg';
  drawLayer.appendChild(svg);
  wrapper.appendChild(drawLayer);
}

function pdfDrawMove(e) {
  if (pdfDrawPoints.length === 0) return;
  const canvas = pdfGetCurrentPageCanvas();
  if (!canvas) return;
  const wrapper = canvas.parentElement;
  if (!wrapper) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const normX = (e.clientX - wrapperRect.left) / wrapper.clientWidth;
  const normY = (e.clientY - wrapperRect.top) / wrapper.clientHeight;
  pdfDrawPoints.push({ x: normX, y: normY });

  const svg = document.getElementById('pdfDrawSvg');
  if (!svg) return;
  const displayW = wrapper.clientWidth;
  const displayH = wrapper.clientHeight;
  const prev = pdfDrawPoints[pdfDrawPoints.length - 2];
  const cur = pdfDrawPoints[pdfDrawPoints.length - 1];

  const svgNS = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', prev.x * displayW);
  line.setAttribute('y1', prev.y * displayH);
  line.setAttribute('x2', cur.x * displayW);
  line.setAttribute('y2', cur.y * displayH);
  line.setAttribute('stroke', 'rgba(239,68,68,0.7)');
  line.setAttribute('stroke-width', '3');
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);
}

function pdfDrawEnd() {
  if (pdfDrawPoints.length > 1) {
    const targetPage = pdfMode === 'page' ? pdfPage : pdfGetPageFromY(0);
    pdfAnnotations.push({
      type: 'drawing',
      page: targetPage,
      points: [...pdfDrawPoints],
      color: 'rgba(239,68,68,0.7)'
    });
    pdfSaveAnnotations();
  }
  pdfDrawPoints = [];
  const svg = document.getElementById('pdfDrawSvg');
  if (svg) {
    const layer = svg.parentElement;
    if (layer) layer.remove();
  }
}

// ========== IMAGE VIEWER ==========
let imgZoom = 100, imgRotation = 0;
function openImageViewer(url, name, container) {
  imgZoom = 100; imgRotation = 0;
  container.innerHTML = `<div class="image-viewer-container">
    <div class="image-toolbar">
      <button class="btn btn-sm" onclick="imgZoomOut()"><i class="fas fa-minus"></i></button>
      <span id="imgZoomInfo">100%</span>
      <button class="btn btn-sm" onclick="imgZoomIn()"><i class="fas fa-plus"></i></button>
      <button class="btn btn-sm" onclick="imgFit()"><i class="fas fa-expand"></i> Fit</button>
      <button class="btn btn-sm" onclick="imgRotate()"><i class="fas fa-redo"></i></button>
    </div>
    <div class="image-scroll-area" id="imageScrollArea">
      <img id="viewerImage" src="${url}" alt="${esc(name)}" />
    </div>
  </div>`;
}
function imgZoomIn() { imgZoom = Math.min(imgZoom + 15, 300); applyImgTransform(); }
function imgZoomOut() { imgZoom = Math.max(imgZoom - 15, 20); applyImgTransform(); }
function imgFit() { imgZoom = 100; imgRotation = 0; applyImgTransform(); }
function imgRotate() { imgRotation = (imgRotation + 90) % 360; applyImgTransform(); }
function applyImgTransform() {
  const img = document.getElementById('viewerImage');
  if (img) img.style.transform = `scale(${imgZoom / 100}) rotate(${imgRotation}deg)`;
  const info = document.getElementById('imgZoomInfo');
  if (info) info.textContent = Math.round(imgZoom) + '%';
}

// ========== DOC VIEWER ==========
function openDocViewer(url, container) {
  container.innerHTML = `<div class="doc-viewer-container">
    <div class="doc-toolbar">
      <span><i class="fas fa-file-word" style="color:#3b82f6"></i> Word Document</span>
      <a href="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}" target="_blank" class="btn btn-sm btn-outline">
        <i class="fas fa-external-link-alt"></i> Open in Office Online
      </a>
    </div>
    <iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}"
      style="width:100%;height:calc(100vh - 140px);border:none;border-radius:0 0 8px 8px"></iframe>
  </div>`;
}

// ========== UPLOAD ==========

function populateYearSelect() {
  const sel = document.getElementById('searchYear');
  if (!sel) return;
  const years = new Set();
  allTreeItems.forEach(i => {
    const match = i.path.match(/\/(\d{4})(?:\/|$)/);
    if (match) years.add(match[1]);
  });
  const sorted = [...years].sort();
  if (sorted.length === 0) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">All Years</option>' +
    sorted.map(y => `<option value="${y}" ${y === current ? 'selected' : ''}>${y}</option>`).join('');
}

// ========== SEARCH ==========
function searchFiles() {
  const query = document.getElementById('searchInput')?.value.toLowerCase().trim();
  const semFilter = document.getElementById('searchSemester')?.value || '';
  const typeFilter = document.getElementById('searchType')?.value || '';
  const yearFilter = document.getElementById('searchYear')?.value || '';

  const hasFilter = query || semFilter || typeFilter || yearFilter;
  if (!hasFilter) return;

  const results = allTreeItems.filter(i => {
    if (i.type !== 'blob') return false;
    const name = i.path.split('/').pop().toLowerCase();
    const ext = name.split('.').pop().toLowerCase();

    if (query && !name.includes(query) && !i.path.toLowerCase().includes(query)) return false;

    if (semFilter && !i.path.startsWith(semFilter + '/')) return false;

    if (typeFilter === 'pdf' && ext !== 'pdf') return false;
    if (typeFilter === 'image' && !['jpg','jpeg','png','gif','webp'].includes(ext)) return false;
    if (typeFilter === 'doc' && !['doc','docx'].includes(ext)) return false;

    if (yearFilter && !i.path.includes('/' + yearFilter + '/')) return false;

    return true;
  });

  if (!currentPath) {
    document.getElementById('fileSection').style.display = '';
    document.getElementById('semesterSection').style.display = 'none';
    const filterParts = [];
    if (query) filterParts.push(`"${query}"`);
    if (semFilter) filterParts.push(semFilter.replace('-semister', ' Sem'));
    if (typeFilter) filterParts.push(typeFilter);
    if (yearFilter) filterParts.push(yearFilter);
    const filterLabel = filterParts.length ? filterParts.join(', ') : 'All';
    document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-search"></i> Search: ${esc(filterLabel)}`;
    breadcrumb = [{ label: 'Home', action: 'goHome()' }, { label: 'Search Results' }];
    renderBreadcrumb();
  }

  const grid = document.getElementById('fileGrid');
  if (results.length === 0) {
    grid.innerHTML = `<div class="loading-cell"><i class="fas fa-search"></i> No results for "${esc(query)}"</div>`;
    return;
  }

  grid.innerHTML = results.slice(0, 50).map(item => {
    const name = item.path.split('/').pop();
    const ext = name.split('.').pop().toLowerCase();
    const mime = ['jpg','jpeg','png','gif','webp'].includes(ext) ? 'image' : ext === 'pdf' ? 'pdf' : ['doc','docx'].includes(ext) ? 'doc' : 'other';
    const id = DB.makeId(item.path);
    return `<div class="file-card" id="file-${id}">
      <div class="file-card-main" onclick="clickFile('${esc(item.path)}','${mime}')">
        <div class="file-icon">${getFileIconByType(mime)}</div>
        <div class="file-info">
          <div class="file-name">${esc(name)}</div>
          <div class="file-path">${esc(item.path)}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-action btn-view" title="View" onclick="event.stopPropagation();clickFile('${esc(item.path)}','${mime}')"><i class="fas fa-eye"></i></button>
        <button class="btn-action btn-download" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')"><i class="fas fa-download"></i></button>
        <button class="btn-action btn-saveas" id="sv-${id}" title="Save as" style="display:none" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')"><i class="fas fa-share-alt"></i></button>
      </div>
    </div>`;
  }).join('');
  checkCachedButtons();
}

// ========== REFRESH ==========
function refreshFiles() {
  if (currentSemester) openSemester(currentSemester);
  else loadSemesters();
}
