const HomeView = {
  allTreeItems: [],
  currentPath: '',
  currentSemester: '',
  currentCategory: '',
  currentCourse: '',
  breadcrumb: [],
  semesterFolders: {},
  semesterLabels: {},

  render() {
    return `
      <main class="min-h-[60vh]">
        <section class="py-7 px-5 text-center bg-gradient-to-b from-dark-bg2 to-transparent">
          <div class="flex items-center justify-center gap-5 mb-3.5">
            <div class="w-[72px] h-[72px] rounded-[14px] bg-gradient-to-br from-qsis to-accent flex items-center justify-center text-white text-[1.8rem] border-[3px] border-qsis">
              <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="w-[72px] h-[72px] rounded-[14px] bg-dark-bg2 flex items-center justify-center text-[1.8rem] border-[3px] border-qsis">
              <i class="fas fa-book-open text-qsis"></i>
            </div>
          </div>
          <h2 class="text-[1.7rem] font-extrabold bg-gradient-to-br from-qsis to-accent bg-clip-text text-transparent mb-1.5">QSIS-ARMS</h2>
          <p class="text-dark-text2 text-[0.95rem]">QSIS Academic Resource Management System</p>
          <div class="flex items-center justify-center gap-2 mt-2.5 flex-wrap">
            <span class="text-[0.78rem] text-dark-text2">Developed by <strong class="text-qsis">Sayed Atiqur Rahman</strong> &mdash; QSIS, IIUC</span>
          </div>
        </section>

        <section class="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-[700px] mx-auto px-5 my-4">
          <div class="bg-dark-bg2 border border-dark-border rounded-xl p-3.5 text-center">
            <span class="block text-[1.5rem] font-extrabold text-qsis" id="statsSemesters">0</span>
            <span class="text-[0.75rem] text-dark-text2">Semesters</span>
          </div>
          <div class="bg-dark-bg2 border border-dark-border rounded-xl p-3.5 text-center">
            <span class="block text-[1.5rem] font-extrabold text-qsis" id="statsCourses">0</span>
            <span class="text-[0.75rem] text-dark-text2">Courses</span>
          </div>
          <div class="bg-dark-bg2 border border-dark-border rounded-xl p-3.5 text-center">
            <span class="block text-[1.5rem] font-extrabold text-qsis" id="statsFiles">0</span>
            <span class="text-[0.75rem] text-dark-text2">Files</span>
          </div>
          <div class="bg-dark-bg2 border border-dark-border rounded-xl p-3.5 text-center">
            <span class="block text-[1.5rem] font-extrabold text-qsis" id="statsYears">0</span>
            <span class="text-[0.75rem] text-dark-text2">Years</span>
          </div>
        </section>

        <section class="max-w-[1200px] mx-auto mb-5 px-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-semibold flex items-center gap-2"><i class="fas fa-clock"></i> Recent Reads</h3>
            <a href="#/history" id="recentMore" class="text-qsis text-[0.8rem] font-semibold no-underline hover:underline hidden">View All <i class="fas fa-arrow-right"></i></a>
          </div>
          <div id="recentReads" class="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
            <div class="text-center py-5 text-dark-text2 text-[0.85rem]"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
          </div>
        </section>

        <section class="max-w-[700px] mx-auto mb-4 px-5">
          <div class="bg-dark-bg2 border border-dark-border rounded-xl p-1">
            <div class="flex items-center gap-2.5 bg-dark-bg border border-dark-border rounded-lg px-3.5">
              <i class="fas fa-search text-dark-text2"></i>
              <input type="text" id="searchInput" class="flex-1 bg-transparent border-none text-dark-text py-2.5 text-[0.9rem] outline-none placeholder:text-dark-text2" placeholder="Search files, courses, semesters..." oninput="HomeView.searchFiles()" />
            </div>
            <div class="flex gap-2 p-2 flex-wrap">
              <select id="searchSemester" class="bg-dark-bg border border-dark-border text-dark-text py-1.5 px-2.5 rounded-md text-[0.78rem] outline-none cursor-pointer focus:border-qsis" onchange="HomeView.searchFiles()">
                <option value="">All Semesters</option>
              </select>
              <select id="searchType" class="bg-dark-bg border border-dark-border text-dark-text py-1.5 px-2.5 rounded-md text-[0.78rem] outline-none cursor-pointer focus:border-qsis" onchange="HomeView.searchFiles()">
                <option value="">All Types</option>
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
                <option value="doc">Document</option>
                <option value="sheet">Sheet (XLS)</option>
                <option value="ppt">Presentation</option>
              </select>
              <select id="searchYear" class="bg-dark-bg border border-dark-border text-dark-text py-1.5 px-2.5 rounded-md text-[0.78rem] outline-none cursor-pointer focus:border-qsis" onchange="HomeView.searchFiles()">
                <option value="">All Years</option>
              </select>
            </div>
          </div>
        </section>

        <section class="max-w-[1200px] mx-auto mb-5 px-5" id="semesterSection">
          <div class="flex items-center justify-between mb-3">
            <h3 id="sectionTitle" class="text-base font-semibold flex items-center gap-2"><i class="fas fa-book"></i> Select Semester</h3>
          </div>
          <div id="semesterGrid" class="flex flex-col gap-2">
            <div class="text-center py-10 text-dark-text2 text-[0.9rem]"><i class="fas fa-spinner fa-spin"></i> Loading semesters...</div>
          </div>
        </section>

        <section class="max-w-[1200px] mx-auto mb-[30px] px-5 hidden" id="fileSection">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 id="sectionTitle2" class="text-[1.05rem] font-semibold flex items-center gap-2"><i class="fas fa-folder-open"></i> Files</h3>
            <button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold ml-auto" onclick="HomeView.goHome()">
              <i class="fas fa-arrow-left"></i> Back to Semesters
            </button>
          </div>
          <div id="breadcrumb" class="flex items-center gap-2 text-[0.8rem] flex-wrap mb-3.5"></div>
          <div id="fileGrid" class="flex flex-col gap-2"></div>
        </section>
      </main>`;
  },

  async init() {
    await waitForDB();
    this.loadRecentReads();
    this.loadSemesters().then(() => this.populateYearSelect());
  },

  destroy() {},

  async loadRecentReads() {
    const container = document.getElementById('recentReads');
    if (!container) return;
    try {
      const items = await DB.historyGetRecent(7);
      if (!items || items.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-dark-text2 text-[0.85rem] col-span-full"><i class="fas fa-clock"></i> No recent reads yet. Open a file to get started.</div>`;
        return;
      }
      container.innerHTML = items.map(item => {
        const icon = getFileIconByType(item.mimeType);
        const time = timeAgo(item.lastRead);
        return `<div class="flex items-center gap-2.5 p-[10px_12px] bg-dark-bg3 border border-dark-border rounded-lg cursor-pointer hover:border-qsis hover:bg-dark-bg3/80 hover:-translate-y-px transition-all" onclick="HomeView.openRecentFile('${esc(item.path)}', '${esc(item.mimeType)}')">
          <div class="text-[1.4rem] flex-shrink-0">${icon}</div>
          <div class="min-w-0 flex-1">
            <div class="text-[0.8rem] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">${esc(item.name)}</div>
            <div class="text-[0.7rem] text-dark-text2">${time}</div>
          </div>
        </div>`;
      }).join('');

      const moreBtn = document.getElementById('recentMore');
      if (moreBtn && items.length >= 7) moreBtn.classList.remove('hidden');
      else if (moreBtn) moreBtn.classList.add('hidden');
    } catch (err) {
      container.innerHTML = `<div class="text-center py-5 text-dark-text2 text-[0.85rem]"><i class="fas fa-clock"></i> No recent reads yet.</div>`;
    }
  },

  async openRecentFile(path, mimeType) {
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
  },

  async loadSemesters() {
    const grid = document.getElementById('semesterGrid');
    grid.innerHTML = `<div class="text-center py-10 text-dark-text2 text-[0.9rem]"><i class="fas fa-spinner fa-spin"></i> Loading semesters...</div>`;
    try {
      const tree = await GITHUB.getUploadTree(true);
      this.allTreeItems = tree.tree.filter(item => {
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

      const detectedSemIds = [...new Set(this.allTreeItems.map(i => i.path.split('/')[0]).filter(Boolean))];
      detectedSemIds.sort();
      const semFolders = detectedSemIds.map(semId => {
        const numMatch = semId.match(/^(\d+)/);
        const num = numMatch ? numMatch[1] : '';
        const suffix = num === '1' ? 'st' : num === '2' ? 'nd' : num === '3' ? 'rd' : 'th';
        const label = num ? num + suffix + ' Semester' : semId.replace(/-/g, ' ');
        const items = this.allTreeItems.filter(i => i.path.startsWith(semId + '/'));
        const fileCount = items.filter(i => i.type === 'blob').length;
        const courseSet = new Set();
        items.forEach(i => {
          const parts = i.path.split('/');
          if (parts.length < 3) return;
          const f2 = (parts[2] || '').toLowerCase();
          if (parts[2] && !/^\d{4}$/.test(parts[2]) && !f2.startsWith('mid') && !f2.startsWith('final') && !f2.startsWith('note') && !f2.startsWith('readme') && !f2.startsWith('.gitkeep') && !parts[2].match(/\.\w{1,5}$/)) {
            courseSet.add(parts[2]);
          } else if (parts.length >= 4 && parts[3]) {
            const f3 = (parts[3] || '').toLowerCase();
            if (parts[3] && !/^\d{4}$/.test(parts[3]) && !f3.startsWith('mid') && !f3.startsWith('final') && !f3.startsWith('note') && !parts[3].match(/\.\w{1,5}$/)) {
              courseSet.add(parts[3]);
            }
          }
        });
        const courseCount = courseSet.size;
        const years = new Set();
        items.forEach(i => {
          const m = i.path.match(/\/(\d{4})\//);
          if (m) years.add(m[1]);
        });
        return { id: semId, label, fileCount, courseCount, yearCount: years.size };
      });
      this.semesterLabels = {};
      semFolders.forEach(s => this.semesterLabels[s.id] = s.label);

      const semSelect = document.getElementById('searchSemester');
      if (semSelect) {
        semSelect.innerHTML = '<option value="">All Semesters</option>' +
          semFolders.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
      }

      grid.innerHTML = semFolders.map(s => `
        <div class="flex items-center gap-4 p-[18px_20px] bg-dark-bg2 border border-dark-border rounded-xl cursor-pointer hover:border-qsis hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:translate-x-1 transition-all" onclick="HomeView.openSemester('${s.id}')">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-qsis to-accent flex items-center justify-center text-white text-[1.2rem] flex-shrink-0"><i class="fas fa-book"></i></div>
          <div class="text-[1.05rem] font-bold">${s.label}</div>
          <div class="text-[0.8rem] text-dark-text2 ml-auto">${s.courseCount || 0} courses &middot; ${s.fileCount} files</div>
        </div>
      `).join('');

      document.getElementById('statsSemesters').textContent = semFolders.length;
      document.getElementById('statsCourses').textContent = semFolders.reduce((sum, s) => sum + s.courseCount, 0);
      document.getElementById('statsFiles').textContent = this.allTreeItems.filter(i => i.type === 'blob').length;
      document.getElementById('statsYears').textContent = semFolders.reduce((sum, s) => sum + s.yearCount, 0);
    } catch (err) {
      console.error(err);
      var isRateLimit = err.message && err.message.includes('rate limit');
      grid.innerHTML = `<div class="text-center py-10 text-dark-text2 col-span-full">
        <i class="fas fa-exclamation-triangle text-warning text-2xl mb-2 block"></i>
        <p>${isRateLimit ? 'GitHub API rate limit reached. Login for higher limits.' : 'Could not load files. Check connection.'}</p>
        ${isRateLimit ? '<p class="text-[0.75rem] mt-1">Or wait 1 hour for limit reset.</p>' : ''}
        <button class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.8rem] font-semibold mt-3" onclick="HomeView.loadSemesters()"><i class="fas fa-sync"></i> Retry</button>
      </div>`;
    }
  },

  semLabel(semId) {
    return this.semesterLabels[semId] || semId.replace(/-/g, ' ');
  },

  openSemester(semId) {
    this.currentSemester = semId;
    this.currentCategory = '';
    this.currentCourse = '';
    this.currentPath = semId;
    this.breadcrumb = [{ label: 'Home', action: 'HomeView.goHome()' }, { label: this.semLabel(semId), action: `HomeView.openSemester('${semId}')` }];
    this.renderBreadcrumb();
    this.renderCategories(semId);
    document.getElementById('fileSection').classList.remove('hidden');
    document.getElementById('semesterSection').classList.add('hidden');
    document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-book"></i> ${this.semLabel(semId)}`;
  },

  openCategory(semId, catKey) {
    this.currentCategory = catKey;
    this.currentCourse = '';
    const actualFolder = this.semesterFolders[semId]?.[catKey] || catKey;
    this.currentPath = semId + '/' + actualFolder;
    this.breadcrumb = [
      { label: 'Home', action: 'HomeView.goHome()' },
      { label: this.semLabel(semId), action: `HomeView.openSemester('${semId}')` },
      { label: CONFIG.categories[catKey]?.label || catKey, action: `HomeView.openCategory('${semId}','${catKey}')` }
    ];
    this.renderBreadcrumb();
    this.renderCourses(semId, catKey);
    document.getElementById('sectionTitle2').innerHTML = `<i class="fas ${CONFIG.categories[catKey]?.icon || 'fa-folder'}"></i> ${CONFIG.categories[catKey]?.label || catKey}`;
  },

  openCourse(semId, catKey, coursePath) {
    this.currentCourse = coursePath;
    this.currentPath = coursePath;

    const actualFolder = this.semesterFolders[semId]?.[catKey] || catKey;
    const prefix = semId + '/' + actualFolder + '/';
    const relPath = coursePath.startsWith(prefix) ? coursePath.substring(prefix.length) : coursePath.split('/').pop();
    const parts = relPath.split('/').filter(Boolean);

    this.breadcrumb = [
      { label: 'Home', action: 'HomeView.goHome()' },
      { label: this.semLabel(semId), action: `HomeView.openSemester('${semId}')` },
      { label: CONFIG.categories[catKey]?.label || catKey, action: `HomeView.openCategory('${semId}','${catKey}')` }
    ];

    let builtPath = prefix;
    parts.forEach((part, i) => {
      builtPath += part;
      if (i < parts.length - 1) {
        const p = builtPath;
        this.breadcrumb.push({ label: part, action: `HomeView.openCourse('${semId}','${catKey}','${p}')` });
      } else {
        this.breadcrumb.push({ label: part });
      }
      builtPath += '/';
    });

    this.renderBreadcrumb();
    this.renderFilesInPath(coursePath);
    const lastPart = parts[parts.length - 1] || coursePath.split('/').pop();
    document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-folder-open"></i> ${esc(lastPart)}`;
  },

  goHome() {
    this.currentSemester = '';
    this.currentCategory = '';
    this.currentCourse = '';
    this.currentPath = '';
    this.breadcrumb = [];
    this.renderBreadcrumb();
    document.getElementById('fileSection').classList.add('hidden');
    document.getElementById('semesterSection').classList.remove('hidden');
    document.getElementById('sectionTitle').innerHTML = `<i class="fas fa-book"></i> Select Semester`;
    this.loadRecentReads();
  },

  renderBreadcrumb() {
    const el = document.getElementById('breadcrumb');
    if (!this.breadcrumb.length) { el.innerHTML = ''; return; }
    el.innerHTML = this.breadcrumb.map((b, i) => {
      if (b.action) return `<span class="text-qsis cursor-pointer hover:underline" onclick="${b.action}">${b.label}</span><span class="text-dark-text2 text-[0.6rem]"><i class="fas fa-chevron-right"></i></span>`;
      return `<span class="text-dark-text cursor-default">${b.label}</span>`;
    }).join('');
  },

  detectCatFromFolder(folderName) {
    const lower = folderName.toLowerCase();
    if (lower === 'sheet' || lower.includes('sheet')) return 'sheet';
    if (lower.includes('previous question') || lower.includes('question')) return 'question';
    if (lower === 'notes' || lower.toLowerCase() === 'note') return 'note';
    if (lower.includes('syllabus')) return 'syllabus';
    return 'other';
  },

  renderCategories(semId) {
    const grid = document.getElementById('fileGrid');

    const topFolders = {};
    this.allTreeItems.forEach(item => {
      if (!item.path.startsWith(semId + '/')) return;
      const rel = item.path.substring(semId.length + 1);
      const firstPart = rel.split('/')[0];
      if (!firstPart) return;
      if (!topFolders[firstPart]) topFolders[firstPart] = { name: firstPart, blobCount: 0, treeCount: 0 };
      if (item.type === 'blob') topFolders[firstPart].blobCount++;
      else topFolders[firstPart].treeCount++;
    });

    this.semesterFolders[semId] = {};
    const catEntries = [];

    Object.values(topFolders).forEach(folder => {
      const cat = this.detectCatFromFolder(folder.name);
      this.semesterFolders[semId][cat] = folder.name;
      const existing = catEntries.find(e => e.cat === cat);
      if (existing) {
        existing.count += folder.blobCount;
        existing.folders.push(folder.name);
      } else {
        catEntries.push({ cat, count: folder.blobCount, folders: [folder.name] });
      }
    });

    if (catEntries.length === 0) {
      grid.innerHTML = `<div class="text-center py-10 text-dark-text2" id="setupSemesterCell">
        <i class="fas fa-folder-open text-2xl text-dark-text2 mb-2 block"></i>
        <p>No files found in this semester.</p>
        <p class="text-[0.78rem] text-dark-text2 mt-1.5">Add folders like <code class="text-qsis font-semibold">sheet/</code>, <code class="text-qsis font-semibold">Notes/</code>, <code class="text-qsis font-semibold">Previous Questions/</code>, <code class="text-qsis font-semibold">Syllabus/</code> under <strong>${semId}/</strong> in the repo.</p>
      </div>`;
      return;
    }

    grid.innerHTML = catEntries.map(ce => {
      const cat = CONFIG.categories[ce.cat] || CONFIG.categories.other;
      return `<div class="flex items-center gap-3.5 p-[14px_18px] bg-dark-bg2 border border-dark-border rounded-xl cursor-pointer hover:border-accent hover:shadow-[0_0_16px_rgba(16,185,129,.2)] hover:translate-x-1 transition-all" onclick="HomeView.openCategory('${semId}','${ce.cat}')">
        <div class="text-[1.5rem]" style="color:${cat.color}"><i class="fas ${cat.icon}"></i></div>
        <div class="text-[0.95rem] font-semibold">${cat.label}</div>
        <div class="text-[0.75rem] text-dark-text2 ml-auto">${ce.count} files</div>
      </div>`;
    }).join('');
  },

  renderCourses(semId, catKey) {
    const grid = document.getElementById('fileGrid');
    const actualFolder = this.semesterFolders[semId]?.[catKey] || catKey;
    const prefix = semId + '/' + actualFolder + '/';
    const items = this.allTreeItems.filter(i => i.path.startsWith(prefix) && i.path !== prefix);

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
      grid.innerHTML = `<div class="text-center py-10 text-dark-text2"><i class="fas fa-folder-open"></i> No files found.</div>`;
      return;
    }

    let html = '';

    if (courses.length > 0) {
      html += courses.map(([name, files]) => {
        const pdfCount = files.filter(f => f.path.toLowerCase().endsWith('.pdf')).length;
        const docCount = files.filter(f => /\.(doc|docx)$/i.test(f.path)).length;
        const xlsCount = files.filter(f => /\.(xls|xlsx)$/i.test(f.path)).length;
        const pptCount = files.filter(f => /\.(ppt|pptx)$/i.test(f.path)).length;
        const imgCount = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.path)).length;
        const isEmpty = files.length === 0;
        const iconClass = isEmpty ? 'fa-folder' : 'fa-book-open';
        const iconStyle = isEmpty ? 'color:#94a3b8' : '';
        return `<div class="flex items-center gap-3.5 p-[14px_18px] bg-dark-bg2 border border-dark-border rounded-xl cursor-pointer hover:border-qsis hover:shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all" onclick="HomeView.openCourse('${semId}','${catKey}','${prefix}${name}')">
          <div class="text-[1.3rem] text-qsis flex-shrink-0"><i class="fas ${iconClass}" ${iconStyle ? `style="${iconStyle}"` : ''}></i></div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-[0.9rem]">${esc(name)}</div>
            <div class="flex gap-2.5 text-[0.72rem] text-dark-text2 mt-[3px]">
              ${pdfCount ? `<span class="flex items-center gap-[3px]"><i class="fas fa-file-pdf" style="color:#ef4444"></i> ${pdfCount}</span>` : ''}
              ${docCount ? `<span class="flex items-center gap-[3px]"><i class="fas fa-file-word" style="color:#3b82f6"></i> ${docCount}</span>` : ''}
              ${xlsCount ? `<span class="flex items-center gap-[3px]"><i class="fas fa-file-excel" style="color:#22c55e"></i> ${xlsCount}</span>` : ''}
              ${pptCount ? `<span class="flex items-center gap-[3px]"><i class="fas fa-file-powerpoint" style="color:#f97316"></i> ${pptCount}</span>` : ''}
              ${imgCount ? `<span class="flex items-center gap-[3px]"><i class="fas fa-file-image" style="color:#34d399"></i> ${imgCount}</span>` : ''}
              ${isEmpty ? '<span class="flex items-center gap-[3px]"><i class="fas fa-inbox"></i> Empty</span>' : `<span class="flex items-center gap-[3px]"><i class="fas fa-file"></i> ${files.length} total</span>`}
            </div>
          </div>
          <i class="fas fa-chevron-right text-dark-text2 text-[0.7rem] flex-shrink-0"></i>
        </div>`;
      }).join('');
    }

    if (directFiles.length > 0) {
      html += directFiles.map(item => {
        const name = item.path.split('/').pop();
        const ext = name.split('.').pop().toLowerCase();
        const mime = getMimeFromExt(ext);
        const id = DB.makeId(item.path);
        return `<div class="bg-dark-bg2 border border-dark-border rounded-xl p-[12px_14px] transition-all hover:border-qsis hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]" id="file-${id}">
          <div class="flex gap-2.5 items-center cursor-pointer" onclick="HomeView.clickFile('${esc(item.path)}','${mime}')">
            <div class="text-[1.5rem] flex-shrink-0">${getFileIconByType(mime)}</div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis">${esc(name)}</div>
              <div class="text-[0.7rem] text-dark-text2 whitespace-nowrap overflow-hidden text-ellipsis">${esc(item.path)}</div>
            </div>
          </div>
          <div class="flex gap-1 mt-2 pt-2 border-t border-dark-border justify-end">
            <button class="bg-transparent border border-dark-border text-dark-text2 cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-dark-bg3 hover:text-qsis hover:border-qsis transition-all" title="View" onclick="event.stopPropagation();HomeView.clickFile('${esc(item.path)}','${mime}')"><i class="fas fa-eye"></i></button>
            <button class="bg-transparent border border-qsis text-qsis cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-[rgba(34,197,94,.15)] transition-all" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')"><i class="fas fa-download"></i></button>
            <button class="bg-transparent border border-accent text-accent cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-[rgba(16,185,129,.15)] transition-all hidden" id="sv-${id}" title="Save as" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')"><i class="fas fa-share-alt"></i></button>
          </div>
        </div>`;
      }).join('');
      checkCachedButtons();
    }

    grid.innerHTML = html;
  },

  renderFilesInPath(folderPath) {
    const grid = document.getElementById('fileGrid');
    const prefix = folderPath.endsWith('/') ? folderPath : folderPath + '/';
    const items = this.allTreeItems.filter(i => {
      if (i.type !== 'blob') return false;
      if (!i.path.startsWith(prefix)) return false;
      const rel = i.path.substring(prefix.length);
      return rel && !rel.includes('/');
    });
    const subFolders = new Set();
    this.allTreeItems.forEach(i => {
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
        return `<div class="flex items-center gap-3.5 p-[14px_18px] bg-dark-bg2 border border-dark-border rounded-xl cursor-pointer hover:border-qsis hover:shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all" onclick="HomeView.openCourse('${this.currentSemester}','${this.currentCategory}','${prefix}${f}')">
          <div class="text-[1.3rem] text-accent flex-shrink-0"><i class="fas fa-folder"></i></div>
          <div class="flex-1 min-w-0"><div class="font-semibold text-[0.9rem]">${esc(f)}</div></div>
          <i class="fas fa-chevron-right text-dark-text2 text-[0.7rem] flex-shrink-0"></i>
        </div>`;
      }).join('');
    }

    if (items.length === 0 && !subFolders.size) {
      grid.innerHTML = `<div class="text-center py-10 text-dark-text2"><i class="fas fa-folder-open"></i> No files here yet.</div>`;
      return;
    }

    const fileCards = items.map((item) => {
      const name = item.path.split('/').pop();
      const ext = name.split('.').pop().toLowerCase();
      const mime = getMimeFromExt(ext);
      const icon = getFileIconByType(mime);
      const id = DB.makeId(item.path);
      return `<div class="bg-dark-bg2 border border-dark-border rounded-xl p-[12px_14px] transition-all hover:border-qsis hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]" id="file-${id}">
        <div class="flex gap-2.5 items-center cursor-pointer" onclick="HomeView.clickFile('${esc(item.path)}','${mime}')">
          <div class="text-[1.5rem] flex-shrink-0">${icon}</div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis">${esc(name)}</div>
            <div class="text-[0.7rem] text-dark-text2 whitespace-nowrap overflow-hidden text-ellipsis">${esc(item.path)}</div>
          </div>
        </div>
        <div class="flex gap-1 mt-2 pt-2 border-t border-dark-border justify-end">
          <button class="bg-transparent border border-dark-border text-dark-text2 cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-dark-bg3 hover:text-qsis hover:border-qsis transition-all" title="View" onclick="event.stopPropagation();HomeView.clickFile('${esc(item.path)}','${mime}')"><i class="fas fa-eye"></i></button>
          <button class="bg-transparent border border-qsis text-qsis cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-[rgba(34,197,94,.15)] transition-all" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')"><i class="fas fa-download"></i></button>
          <button class="bg-transparent border border-accent text-accent cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-[rgba(16,185,129,.15)] transition-all hidden" id="sv-${id}" title="Save as" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')"><i class="fas fa-share-alt"></i></button>
        </div>
      </div>`;
    }).join('');

    grid.innerHTML = html + fileCards;
    checkCachedButtons();
  },

  searchFiles() {
    const query = document.getElementById('searchInput')?.value.toLowerCase().trim();
    const semFilter = document.getElementById('searchSemester')?.value || '';
    const typeFilter = document.getElementById('searchType')?.value || '';
    const yearFilter = document.getElementById('searchYear')?.value || '';

    const hasFilter = query || semFilter || typeFilter || yearFilter;
    if (!hasFilter) {
      if (this.currentPath) return;
      document.getElementById('fileSection').classList.add('hidden');
      document.getElementById('semesterSection').classList.remove('hidden');
      return;
    }

    const results = this.allTreeItems.filter(i => {
      if (i.type !== 'blob') return false;
      const name = i.path.split('/').pop().toLowerCase();
      const ext = name.split('.').pop().toLowerCase();

      if (query && !name.includes(query) && !i.path.toLowerCase().includes(query)) return false;
      if (semFilter && !i.path.startsWith(semFilter + '/')) return false;
      if (typeFilter === 'pdf' && ext !== 'pdf') return false;
      if (typeFilter === 'image' && !['jpg','jpeg','png','gif','webp'].includes(ext)) return false;
      if (typeFilter === 'doc' && !['doc','docx'].includes(ext)) return false;
      if (typeFilter === 'sheet' && !['xls','xlsx','csv'].includes(ext)) return false;
      if (typeFilter === 'ppt' && !['ppt','pptx'].includes(ext)) return false;
      if (yearFilter && !i.path.includes('/' + yearFilter + '/')) return false;
      return true;
    });

    if (!this.currentPath) {
      document.getElementById('fileSection').classList.remove('hidden');
      document.getElementById('semesterSection').classList.add('hidden');
      const filterParts = [];
      if (query) filterParts.push(`"${query}"`);
      if (semFilter) filterParts.push(this.semLabel(semFilter));
      if (typeFilter) filterParts.push(typeFilter);
      if (yearFilter) filterParts.push(yearFilter);
      const filterLabel = filterParts.length ? filterParts.join(', ') : 'All';
      document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-search"></i> Search: ${esc(filterLabel)}`;
      this.breadcrumb = [{ label: 'Home', action: 'HomeView.goHome()' }, { label: 'Search Results' }];
      this.renderBreadcrumb();
    }

    const grid = document.getElementById('fileGrid');
    if (results.length === 0) {
      grid.innerHTML = `<div class="text-center py-10 text-dark-text2"><i class="fas fa-search"></i> No results for "${esc(query)}"</div>`;
      return;
    }

    grid.innerHTML = results.slice(0, 50).map(item => {
      const name = item.path.split('/').pop();
      const ext = name.split('.').pop().toLowerCase();
      const mime = getMimeFromExt(ext);
      const id = DB.makeId(item.path);
      return `<div class="bg-dark-bg2 border border-dark-border rounded-xl p-[12px_14px] transition-all hover:border-qsis hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]" id="file-${id}">
        <div class="flex gap-2.5 items-center cursor-pointer" onclick="HomeView.clickFile('${esc(item.path)}','${mime}')">
          <div class="text-[1.5rem] flex-shrink-0">${getFileIconByType(mime)}</div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis">${esc(name)}</div>
            <div class="text-[0.7rem] text-dark-text2 whitespace-nowrap overflow-hidden text-ellipsis">${esc(item.path)}</div>
          </div>
        </div>
        <div class="flex gap-1 mt-2 pt-2 border-t border-dark-border justify-end">
          <button class="bg-transparent border border-dark-border text-dark-text2 cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-dark-bg3 hover:text-qsis hover:border-qsis transition-all" title="View" onclick="event.stopPropagation();HomeView.clickFile('${esc(item.path)}','${mime}')"><i class="fas fa-eye"></i></button>
          <button class="bg-transparent border border-qsis text-qsis cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-[rgba(34,197,94,.15)] transition-all" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')"><i class="fas fa-download"></i></button>
          <button class="bg-transparent border border-accent text-accent cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-[rgba(16,185,129,.15)] transition-all hidden" id="sv-${id}" title="Save as" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')"><i class="fas fa-share-alt"></i></button>
        </div>
      </div>`;
    }).join('');
    checkCachedButtons();
  },

  clickFile(path, mime) {
    const name = path.split('/').pop();
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${CONFIG.uploadPath}/${path}`;
    const item = { path, name, mimeType: mime, rawUrl };
    openViewer(item);
    DB.historyAdd(item).then(() => this.loadRecentReads());
  },

  populateYearSelect() {
    const sel = document.getElementById('searchYear');
    if (!sel) return;
    const years = new Set();
    this.allTreeItems.forEach(i => {
      const match = i.path.match(/\/(\d{4})(?:\/|$)/);
      if (match) years.add(match[1]);
    });
    const sorted = [...years].sort();
    if (sorted.length === 0) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">All Years</option>' +
      sorted.map(y => `<option value="${y}" ${y === current ? 'selected' : ''}>${y}</option>`).join('');
  },

  refreshFiles() {
    if (this.currentSemester) this.openSemester(this.currentSemester);
    else this.loadSemesters();
  }
};

function getMimeFromExt(ext) {
  const e = ext.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) return 'image';
  if (e === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(e)) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(e)) return 'sheet';
  if (['ppt', 'pptx'].includes(e)) return 'ppt';
  return 'other';
}
