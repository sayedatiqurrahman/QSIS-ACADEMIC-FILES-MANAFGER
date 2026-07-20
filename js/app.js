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
    loadSemesters();
  });
  setupEventListeners();
  populateYearSelect();
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

// ========== YEAR SELECT ==========
function populateYearSelect() {
  const sel = document.getElementById('uploadYear');
  if (!sel) return;
  const cy = new Date().getFullYear();
  for (let y = cy; y >= 2018; y--) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    sel.appendChild(o);
  }
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
  const courseName = coursePath.split('/').pop();
  breadcrumb = [
    { label: 'Home', action: 'goHome()' },
    { label: semId.replace('-semister', ' Semester'), action: `openSemester('${semId}')` },
    { label: CONFIG.categories[catKey]?.label || catKey, action: `openCategory('${semId}','${catKey}')` },
    { label: courseName }
  ];
  renderBreadcrumb();
  renderFilesInPath(coursePath);
  document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-folder-open"></i> ${courseName}`;
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
    if (item.type !== 'blob') return;
    const rel = item.path.substring(prefix.length);
    const parts = rel.split('/');
    if (parts.length <= 1) {
      directFiles.push(item);
    } else {
      const courseName = parts[0];
      if (!courseMap[courseName]) courseMap[courseName] = [];
      courseMap[courseName].push(item);
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
      return `<div class="course-card" onclick="openCourse('${semId}','${catKey}','${prefix}${name}')">
        <div class="course-icon"><i class="fas fa-book-open"></i></div>
        <div class="course-info">
          <div class="course-name">${esc(name)}</div>
          <div class="course-meta">
            ${pdfCount ? `<span><i class="fas fa-file-pdf" style="color:#ef4444"></i> ${pdfCount}</span>` : ''}
            ${docCount ? `<span><i class="fas fa-file-word" style="color:#3b82f6"></i> ${docCount}</span>` : ''}
            ${imgCount ? `<span><i class="fas fa-file-image" style="color:#34d399"></i> ${imgCount}</span>` : ''}
            <span><i class="fas fa-file"></i> ${files.length} total</span>
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
  const items = allTreeItems.filter(i => i.path.startsWith(prefix) && i.type === 'blob');
  const subFolders = new Set();
  allTreeItems.forEach(i => {
    if (i.path.startsWith(prefix) && i.type === 'tree') {
      const rel = i.path.substring(prefix.length);
      if (rel && !rel.includes('/')) subFolders.add(rel);
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

  if (item.mimeType === 'pdf') openPdfViewer(item.rawUrl, viewerBody);
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
  if (item.mimeType === 'pdf') openPdfViewer(url, viewerBody);
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
  const body = document.getElementById('viewerBody');
  if (body) body.innerHTML = '';
}

// ========== PDF VIEWER ==========
let pdfDoc = null, pdfPage = 1, pdfScale = 1.5, pdfTotal = 0;

function openPdfViewer(url, container) {
  container.innerHTML = `<div class="pdf-viewer-container">
    <div class="pdf-toolbar">
      <button class="btn btn-sm" onclick="pdfPrev()"><i class="fas fa-chevron-left"></i></button>
      <span id="pdfPageInfo">Loading...</span>
      <button class="btn btn-sm" onclick="pdfNext()"><i class="fas fa-chevron-right"></i></button>
      <span class="pdf-sep"></span>
      <button class="btn btn-sm" onclick="pdfZoomOut()"><i class="fas fa-minus"></i></button>
      <span id="pdfZoomInfo">100%</span>
      <button class="btn btn-sm" onclick="pdfZoomIn()"><i class="fas fa-plus"></i></button>
      <button class="btn btn-sm" onclick="pdfFitWidth()"><i class="fas fa-arrows-alt-h"></i></button>
    </div>
    <div class="pdf-scroll-area" id="pdfScrollArea">
      <canvas id="pdfCanvas"></canvas>
    </div>
  </div>`;
  loadPdf(url);
}

async function loadPdf(url) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    pdfDoc = await pdfjsLib.getDocument(url).promise;
    pdfTotal = pdfDoc.numPages;
    pdfPage = 1;
    pdfScale = 1.5;
    renderPdfPage();
  } catch (err) {
    document.getElementById('pdfScrollArea').innerHTML = `<div class="viewer-fallback">
      <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--warning);margin-bottom:12px"></i>
      <p>Could not load PDF.</p><p style="font-size:0.85rem;color:var(--text2)">${err.message}</p>
    </div>`;
  }
}

async function renderPdfPage() {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(pdfPage);
  const viewport = page.getViewport({ scale: pdfScale });
  const canvas = document.getElementById('pdfCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  document.getElementById('pdfPageInfo').textContent = `${pdfPage} / ${pdfTotal}`;
  document.getElementById('pdfZoomInfo').textContent = Math.round(pdfScale * 100 / 1.5) + '%';
}

function pdfPrev() { if (pdfDoc && pdfPage > 1) { pdfPage--; renderPdfPage(); } }
function pdfNext() { if (pdfDoc && pdfPage < pdfTotal) { pdfPage++; renderPdfPage(); } }
function pdfZoomIn() { if (pdfDoc) { pdfScale = Math.min(pdfScale + 0.3, 4); renderPdfPage(); } }
function pdfZoomOut() { if (pdfDoc && pdfScale > 0.5) { pdfScale = Math.max(pdfScale - 0.3, 0.5); renderPdfPage(); } }
function pdfFitWidth() { pdfScale = 1.5; renderPdfPage(); }

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
async function uploadFiles() {
  const fileInput = document.getElementById('fileInput');
  const semester = document.getElementById('uploadSemester').value;
  const category = document.getElementById('uploadCategory').value;
  const year = document.getElementById('uploadYear').value;
  const examType = document.getElementById('uploadExamType')?.value || '';
  const courseCode = document.getElementById('uploadCourseCode')?.value.trim() || '';
  const userName = document.getElementById('uploadUserName')?.value.trim() || '';

  if (!fileInput.files.length || !semester || !category || !year) {
    showToast('Please fill all required fields.', 'error'); return;
  }

  const btn = document.getElementById('uploadBtn');
  const progress = document.getElementById('uploadProgress');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
  progress.style.display = 'block';

  const files = Array.from(fileInput.files);
  let ok = 0, fail = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    fill.style.width = Math.round((i / files.length) * 100) + '%';
    text.textContent = `${i + 1}/${files.length}: ${file.name}`;

    let dir = [semester];
    if (category === 'sheet') dir.push('sheet');
    else if (category === 'question') { dir.push('Previous Question', year); if (examType) dir.push(examType); }
    else if (category === 'note') dir.push('NOTES');
    else if (category === 'syllabus') dir.push('Syllabus');
    else dir.push('Other');
    if (courseCode) dir.push(courseCode);

    try {
      const reader = new FileReader();
      const content = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsBinaryString(file); });
      await GITHUB.uploadFileAsPR(dir.join('/') + '/' + file.name, content, `[Submission] ${file.name} - ${semester}${userName ? ` by ${userName}` : ''}`);
      ok++;
    } catch (err) { fail++; }
  }

  fill.style.width = '100%';
  text.textContent = ok > 0 ? `${ok} file(s) submitted!${fail ? ` (${fail} failed)` : ''}` : 'Upload failed.';
  if (ok > 0) {
    showToast(`${ok} file(s) submitted for review!`, 'success');
    setTimeout(() => { closeModal('uploadModal'); document.getElementById('uploadForm').reset(); progress.style.display = 'none'; }, 2000);
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Submit for Review';
}

// ========== SEARCH ==========
function searchFiles() {
  const query = document.getElementById('searchInput')?.value.toLowerCase().trim();
  if (!query) return;

  const results = allTreeItems.filter(i => {
    if (i.type !== 'blob') return false;
    const name = i.path.split('/').pop().toLowerCase();
    return name.includes(query) || i.path.toLowerCase().includes(query);
  });

  if (!currentPath) {
    document.getElementById('fileSection').style.display = '';
    document.getElementById('semesterSection').style.display = 'none';
    document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-search"></i> Search Results`;
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
