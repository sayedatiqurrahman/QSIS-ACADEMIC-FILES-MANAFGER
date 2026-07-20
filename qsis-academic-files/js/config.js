const CONFIG = {
  appName: 'QSIS Academic Files Manager',
  appDescription: 'Academic Resource Hub for Qur\'anic Sciences & Islamic Studies, IIUC',
  repoUrl: 'https://github.com/sayedatiqurrahman/QSIS-ACADEMIC-FILES-MANAFGER',
  sponsorUrl: 'https://programming-light-project.eu.cc',
  clubName: 'Quranic Sciences Club',
  facebookUrl: 'https://www.facebook.com/DQSIS',
  department: 'Qur\'anic Sciences and Islamic Studies',
  university: 'International Islamic University Chittagong',
  faculty: 'Faculty of Shariah and Islamic Studies',
  supportedFormats: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'],
  maxFileSize: 25 * 1024 * 1024, // 25MB
  semesters: [
    '2nd-semister',
    '3rd-semister',
    '4th-semister',
    '5th-semister',
    '6th-semister'
  ],
  categories: ['sheet', 'question', 'note', 'syllabus', 'other'],
  yearRange: { start: 2018, end: new Date().getFullYear() }
};
