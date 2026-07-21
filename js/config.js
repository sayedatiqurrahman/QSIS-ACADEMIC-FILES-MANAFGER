const CONFIG = {
  appName: 'QSIS Academic Files Manager',
  repoUrl: 'https://github.com/sayedatiqurrahman/QSIS-ACADEMIC-FILES-MANAFGER',
  uploadPath: 'upload_academic_files',
  adobeClientId: 'd57fdbe801014db1a20bfb74914b5033',
  supportedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp'],
  academicExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'xls', 'xlsx', 'ppt', 'pptx'],
  ignoredFiles: ['.gitkeep', 'README.md', '.github', 'LICENSE'],
  ignoredExtensions: ['js', 'json', 'yml', 'yaml', 'css', 'html', 'md', 'txt', 'lock'],
  semesters: [
    { id: '1st-semister', label: '1st Semester', icon: 'fa-1' },
    { id: '2nd-semister', label: '2nd Semester', icon: 'fa-2' },
    { id: '3rd-semister', label: '3rd Semester', icon: 'fa-3' },
    { id: '4th-semister', label: '4th Semester', icon: 'fa-4' },
    { id: '5th-semister', label: '5th Semester', icon: 'fa-5' },
    { id: '6th-semister', label: '6th Semester', icon: 'fa-6' },
    { id: '7th-semister', label: '7th Semester', icon: 'fa-7' },
    { id: '8th-semister', label: '8th Semester', icon: 'fa-8' }
  ],
  categories: {
    sheet: { label: 'Sheets', icon: 'fa-scroll', color: '#3b82f6' },
    question: { label: 'Previous Questions', icon: 'fa-question-circle', color: '#f59e0b' },
    note: { label: 'Notes', icon: 'fa-sticky-note', color: '#22c55e' },
    syllabus: { label: 'Syllabus', icon: 'fa-graduation-cap', color: '#8b5cf6' },
    kitab: { label: 'Kitab', icon: 'fa-book', color: '#a855f7' },
    other: { label: 'Other', icon: 'fa-folder', color: '#94a3b8' }
  }
};
