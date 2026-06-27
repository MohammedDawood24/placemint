export const ROLE_THEME = {
  student: {
    accent: '#E0A43B', accentDark: '#c98a25', accentSoft: '#FBF1DD',
    gradient: 'radial-gradient(120% 90% at 0% 0%, #2A3aa0 0%, #0E1633 55%, #080d22 100%)',
    glow: 'rgba(224,164,59,.20)',
    kicker: 'Student portal',
    headline: ['From the classroom to the ', 'offer letter', '.'],
    lead: 'View open drives, apply in one click, and track your status from shortlist to offer — all in one place.',
    emailPlaceholder: 'yourname@college.edu',
    pipelineLabels: ['Apply', 'Shortlist', 'Interview', 'Offer', 'Placed'],
    pipelineCaption: "Every student's journey",
  },
  hod: {
    accent: '#4C5BD4', accentDark: '#3B49B8', accentSoft: '#EEF0FF',
    gradient: 'radial-gradient(120% 90% at 0% 100%, #1d2871 0%, #0E1633 55%, #080d22 100%)',
    glow: 'rgba(76,91,212,.18)',
    kicker: 'Department portal',
    headline: ['Your department. ', 'Your placements', '.'],
    lead: 'Approve registrations, organise activities, and track how many of your students are placed — one dashboard for the whole department.',
    emailPlaceholder: 'hod.cse@college.edu',
    pipelineLabels: ['Approve', 'Prepare', 'Drive', 'Placed', 'Report'],
    pipelineCaption: 'The department workflow',
  },
  company: {
    accent: '#15A86B', accentDark: '#0e8a56', accentSoft: '#E2F6EE',
    gradient: 'radial-gradient(120% 90% at 100% 0%, #0c5c3a 0%, #0E1633 55%, #080d22 100%)',
    glow: 'rgba(21,168,107,.18)',
    kicker: 'Recruiter portal',
    headline: ['Find your next ', 'campus hire', '.'],
    lead: "Post roles, set eligibility criteria, and move candidates through every round — the placement cell handles the rest.",
    emailPlaceholder: 'hr@yourcompany.com',
    pipelineLabels: ['Post', 'Shortlist', 'Interview', 'Offer', 'Onboard'],
    pipelineCaption: 'Your hiring pipeline',
  },
  admin: {
    accent: '#E5575B', accentDark: '#c43e42', accentSoft: '#FCE9EA',
    gradient: 'radial-gradient(120% 90% at 50% 0%, #6b1a2a 0%, #0E1633 55%, #080d22 100%)',
    glow: 'rgba(229,87,91,.16)',
    kicker: 'Placement cell',
    headline: ['Run the entire ', 'placement engine', '.'],
    lead: 'Students, companies, drives, reports, donations — full control of the platform, no code required.',
    emailPlaceholder: 'placement@college.edu',
    pipelineLabels: ['Setup', 'Drive', 'Track', 'Report', 'Donate'],
    pipelineCaption: 'The admin workflow',
  },
}

export const ROLE_TO_PATH = {
  admin: '/admin',
  hod: '/department',
  coordinator: '/department',
  company: '/company',
  student: '/',
}

export const PIPELINE_STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']
