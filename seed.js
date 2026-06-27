/**
 * PlaceMint — Database Seed Script
 * 
 * Run ONCE to set up all collections with sample data:
 *   node seed.js
 * 
 * Prerequisites:
 *   1. npm install (already done if you ran the app)
 *   2. Paste your Firebase config in src/config/firebase.js
 *   3. Firebase Auth email/password enabled
 *   4. Firestore in test mode
 * 
 * This creates:
 *   - 1 Admin account
 *   - 1 HOD account
 *   - 1 Coordinator account
 *   - 1 Company account
 *   - 6 Student accounts (4 approved, 2 pending)
 *   - 3 Job postings
 *   - 3 Activities
 *   - Site settings
 */

import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, doc, setDoc, collection, Timestamp } from 'firebase/firestore'

// ─── PASTE YOUR FIREBASE CONFIG HERE ───────────────────────────
// (Same config as src/config/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyCNriV3JQ9gmcXo3FMS1LvErKBbM53X3mg",
  authDomain: "placement-f2b19.firebaseapp.com",
  projectId: "placement-f2b19",
  storageBucket: "placement-f2b19.firebasestorage.app",
  messagingSenderId: "27854311111",
  appId: "1:27854311111:web:a4e6293733fd187971b8e2"
}
// ────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const now = Timestamp.now()
const PASSWORD = 'Test@123'  // Default password for all seed accounts

// ─── SEED DATA ─────────────────────────────────────────────────

const USERS = [
  // Admin
  {
    email: 'admin@placemint.com',
    profile: { email: 'admin@placemint.com', role: 'admin', displayName: 'Placement Office', department: '', phone: '+91 8800000001', approved: true, createdAt: now },
  },
  // HOD
  {
    email: 'hod.cse@college.edu',
    profile: { email: 'hod.cse@college.edu', role: 'hod', displayName: 'Dr. Vasudha M', department: 'CSE', phone: '+91 8800000002', approved: true, createdAt: now },
  },
  // Coordinator
  {
    email: 'coord.cse@college.edu',
    profile: { email: 'coord.cse@college.edu', role: 'coordinator', displayName: 'Priya Sharma', department: 'CSE', phone: '+91 8800000003', approved: true, createdAt: now },
  },
  // Company
  {
    email: 'hr@bosch.com',
    profile: { email: 'hr@bosch.com', role: 'company', displayName: 'Bosch India', department: '', phone: '+91 8800000004', approved: true, createdAt: now },
    company: { name: 'Bosch India', industry: 'Engineering & Technology', website: 'bosch.in', logo: '#E0A43B', hrContact: 'hr@bosch.com', about: 'Global supplier of technology and services across mobility, industrial, consumer goods, and energy.', createdAt: now, updatedAt: now },
  },
  // Students (approved)
  {
    email: 'ananya.rao@college.edu',
    profile: { email: 'ananya.rao@college.edu', role: 'student', displayName: 'Ananya Rao', department: 'CSE', phone: '+91 9876543210', approved: true, createdAt: now },
    student: { usn: '4SH21CS012', department: 'CSE', semester: 6, tenthMarks: 92, twelfthMarks: 88, cgpa: 8.7, semesters: {}, profileComplete: true, placementStatus: 'placed', placedAt: 'Bosch', package: 12.5, updatedAt: now },
  },
  {
    email: 'rohit.kumar@college.edu',
    profile: { email: 'rohit.kumar@college.edu', role: 'student', displayName: 'Rohit Kumar', department: 'ISE', phone: '+91 9876543211', approved: true, createdAt: now },
    student: { usn: '4SH21IS045', department: 'ISE', semester: 6, tenthMarks: 85, twelfthMarks: 79, cgpa: 7.9, semesters: {}, profileComplete: true, placementStatus: 'interview', placedAt: null, package: null, updatedAt: now },
  },
  {
    email: 'fatima.sheikh@college.edu',
    profile: { email: 'fatima.sheikh@college.edu', role: 'student', displayName: 'Fatima Sheikh', department: 'ECE', phone: '+91 9876543212', approved: true, createdAt: now },
    student: { usn: '4SH21EC008', department: 'ECE', semester: 6, tenthMarks: 95, twelfthMarks: 91, cgpa: 9.1, semesters: {}, profileComplete: true, placementStatus: 'placed', placedAt: 'Mphasis', package: 9.0, updatedAt: now },
  },
  {
    email: 'sneha.patil@college.edu',
    profile: { email: 'sneha.patil@college.edu', role: 'student', displayName: 'Sneha Patil', department: 'CSE', phone: '+91 9876543213', approved: true, createdAt: now },
    student: { usn: '4SH21CS033', department: 'CSE', semester: 6, tenthMarks: 89, twelfthMarks: 84, cgpa: 8.3, semesters: {}, profileComplete: true, placementStatus: 'shortlisted', placedAt: null, package: null, updatedAt: now },
  },
  // Students (pending approval — to test the approval flow)
  {
    email: 'karthik.n@college.edu',
    profile: { email: 'karthik.n@college.edu', role: 'student', displayName: 'Karthik N', department: 'MECH', phone: '+91 9876543214', approved: false, createdAt: now },
    student: { usn: '4SH22ME021', department: 'MECH', semester: 4, tenthMarks: 78, twelfthMarks: 74, cgpa: 7.2, semesters: {}, profileComplete: false, placementStatus: 'eligible', placedAt: null, package: null, updatedAt: now },
  },
  {
    email: 'imran.khan@college.edu',
    profile: { email: 'imran.khan@college.edu', role: 'student', displayName: 'Imran Khan', department: 'CIVIL', phone: '+91 9876543215', approved: false, createdAt: now },
    student: { usn: '4SH21CV019', department: 'CIVIL', semester: 6, tenthMarks: 72, twelfthMarks: 70, cgpa: 6.8, semesters: {}, profileComplete: false, placementStatus: 'eligible', placedAt: null, package: null, updatedAt: now },
  },
]

const JOBS = [
  {
    companyName: 'Infosys',
    role: 'Systems Engineer',
    package: '6.5 LPA',
    packageNumeric: 6.5,
    minPercentage: 60,
    eligibleDepartments: ['CSE', 'ISE', 'ECE'],
    driveType: 'on-campus',
    driveDate: Timestamp.fromDate(new Date('2025-11-05')),
    deadline: Timestamp.fromDate(new Date('2025-11-02')),
    description: 'Systems Engineer role for fresh graduates. Training in Mysore campus.',
    status: 'open',
    createdAt: now,
    updatedAt: now,
  },
  {
    companyName: 'Bosch',
    role: 'Graduate Trainee',
    package: '12.5 LPA',
    packageNumeric: 12.5,
    minPercentage: 70,
    eligibleDepartments: ['CSE', 'ECE', 'MECH'],
    driveType: 'on-campus',
    driveDate: Timestamp.fromDate(new Date('2025-11-01')),
    deadline: Timestamp.fromDate(new Date('2025-10-28')),
    description: 'Graduate Engineering Trainee program with 6-month rotation across divisions.',
    status: 'open',
    createdAt: now,
    updatedAt: now,
  },
  {
    companyName: 'TCS',
    role: 'Digital — Ninja',
    package: '7.0 LPA',
    packageNumeric: 7.0,
    minPercentage: 65,
    eligibleDepartments: ['CSE', 'ISE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIML', 'DS'],
    driveType: 'virtual',
    driveDate: Timestamp.fromDate(new Date('2025-11-03')),
    deadline: Timestamp.fromDate(new Date('2025-10-30')),
    description: 'TCS Digital hiring for Ninja profile. All branches eligible.',
    status: 'open',
    createdAt: now,
    updatedAt: now,
  },
]

const ACTIVITIES = [
  {
    title: 'Aptitude & Reasoning Bootcamp',
    organizer: 'CSE Dept',
    speaker: 'Mr. Suresh Hegde',
    date: Timestamp.fromDate(new Date('2025-10-28')),
    location: 'Seminar Hall B',
    department: 'CSE',
    totalSeats: 160,
    attendees: [],
    createdAt: now,
  },
  {
    title: 'Mock Technical Interviews',
    organizer: 'Placement Cell',
    speaker: 'Bosch Panel',
    date: Timestamp.fromDate(new Date('2025-10-30')),
    location: 'Lab 3 & 4',
    department: 'ALL',
    totalSeats: 96,
    attendees: [],
    createdAt: now,
  },
  {
    title: 'Resume Building Workshop',
    organizer: 'ISE Dept',
    speaker: 'Ms. Priya Nair',
    date: Timestamp.fromDate(new Date('2025-11-02')),
    location: 'Auditorium',
    department: 'ISE',
    totalSeats: 120,
    attendees: [],
    createdAt: now,
  },
]

const SITE_SETTINGS = {
  privacyPolicy: 'PlaceMint respects your privacy. Student data is used only for placement purposes and is not shared with third parties without consent.',
  termsAndConditions: 'By registering on PlaceMint, you agree to provide accurate academic information. Falsification of records will result in account suspension.',
  ownerInfo: {
    name: 'Placement Cell',
    email: 'placement@college.edu',
    phone: '+91 8884362160',
    address: 'N.T Road, Shivamogga - 577201',
  },
  faqs: [
    { question: 'How do I register for a placement drive?', answer: 'Complete your profile with all academic records. Eligible drives will appear on your dashboard automatically.' },
    { question: 'Can I attend multiple placement drives?', answer: 'Yes, until you are placed. Once placed, the system blocks further registrations.' },
    { question: 'How do I upload my marks card?', answer: 'Go to My Profile → Academic Record and click Upload next to the relevant semester.' },
    { question: 'Who approves my registration?', answer: 'Your department HOD or coordinator reviews and approves new registrations.' },
  ],
}

// ─── SEED FUNCTION ─────────────────────────────────────────────

async function createUser(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await signOut(auth)
    return cred.user.uid
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      // User exists in Auth — sign in to get their UID, then sign out
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        const uid = cred.user.uid
        await signOut(auth)
        console.log(`  ⚠ ${email} already exists in Auth, updating Firestore docs`)
        return uid
      } catch {
        console.log(`  ⚠ ${email} exists but password doesn't match seed password, skipping`)
        return null
      }
    }
    throw err
  }
}

async function seed() {
  console.log('\n🌱 PlaceMint — Seeding database...\n')
  console.log(`   Password for all accounts: ${PASSWORD}`)
  console.log('   (Change passwords after testing)\n')

  // Track the Bosch company userId for linking jobs
  let boschUserId = null

  // ── 1. Create users ──
  console.log('📋 Creating user accounts...')
  for (const u of USERS) {
    const uid = await createUser(u.email, PASSWORD)
    if (!uid) {
      console.log(`     Skipped ${u.email}`)
      continue
    }

    // Write user profile
    await setDoc(doc(db, 'users', uid), u.profile)
    console.log(`  ✓ ${u.profile.role.padEnd(11)} ${u.email} (${u.profile.displayName})`)

    // Write student record if applicable
    if (u.student) {
      await setDoc(doc(db, 'students', uid), u.student)
    }

    // Write company record if applicable
    if (u.company) {
      await setDoc(doc(db, 'companies', uid), { ...u.company, userId: uid })
      boschUserId = uid
    }
  }

  // ── 2. Create jobs ──
  console.log('\n💼 Creating job postings...')
  for (const job of JOBS) {
    const jobData = { ...job }
    // Link Bosch job to company
    if (job.companyName === 'Bosch' && boschUserId) {
      jobData.companyId = boschUserId
    }
    const jobRef = doc(collection(db, 'jobs'))
    await setDoc(jobRef, jobData)
    console.log(`  ✓ ${job.role} at ${job.companyName} (${job.package})`)
  }

  // ── 3. Create activities ──
  console.log('\n📅 Creating activities...')
  for (const act of ACTIVITIES) {
    const actRef = doc(collection(db, 'activities'))
    await setDoc(actRef, act)
    console.log(`  ✓ ${act.title}`)
  }

  // ── 4. Create site settings ──
  console.log('\n⚙️  Creating site settings...')
  await setDoc(doc(db, 'settings', 'site'), SITE_SETTINGS)
  console.log('  ✓ Privacy policy, terms, FAQs')

  // ── Done ──
  console.log('\n' + '═'.repeat(50))
  console.log('✅ Seeding complete! Here are your test accounts:\n')
  console.log('  Role           Email                        Password')
  console.log('  ─────────────  ───────────────────────────  ────────')
  console.log(`  Admin          admin@placemint.com          ${PASSWORD}`)
  console.log(`  HOD (CSE)      hod.cse@college.edu          ${PASSWORD}`)
  console.log(`  Coordinator    coord.cse@college.edu        ${PASSWORD}`)
  console.log(`  Company        hr@bosch.com                 ${PASSWORD}`)
  console.log(`  Student        ananya.rao@college.edu       ${PASSWORD}`)
  console.log(`  Student        rohit.kumar@college.edu      ${PASSWORD}`)
  console.log(`  Student        sneha.patil@college.edu      ${PASSWORD}`)
  console.log(`  Student (pending) karthik.n@college.edu     ${PASSWORD}`)
  console.log(`  Student (pending) imran.khan@college.edu    ${PASSWORD}`)
  console.log('\n  Login URLs:')
  console.log('  Student:     http://localhost:5173/')
  console.log('  Department:  http://localhost:5173/department')
  console.log('  Company:     http://localhost:5173/company')
  console.log('  Admin:       http://localhost:5173/admin')
  console.log('\n' + '═'.repeat(50) + '\n')

  process.exit(0)
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message)
  console.error('\n  Common fixes:')
  console.error('  • Did you paste your Firebase config above?')
  console.error('  • Is Email/Password auth enabled?')
  console.error('  • Is Firestore in test mode?')
  console.error('')
  process.exit(1)
})
