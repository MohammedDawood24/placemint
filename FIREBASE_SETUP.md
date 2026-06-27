# PlaceMint — Firebase Setup Guide

Follow these steps **once** to create your Firebase project. Takes ~10 minutes.

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Name it **PlaceMint** (or any name you prefer)
4. Disable Google Analytics (not needed) → Click **Create project**
5. Wait for it to finish → Click **Continue**

---

## Step 2: Enable Authentication

1. In the left sidebar, click **Build → Authentication**
2. Click **Get started**
3. Under "Sign-in method", click **Email/Password**
4. Toggle **Enable** → Click **Save**

---

## Step 3: Create Firestore Database

1. In the left sidebar, click **Build → Firestore Database**
2. Click **Create database**
3. Choose location closest to you (e.g., `asia-south1` for India)
4. Select **Start in test mode** (we'll add security rules later)
5. Click **Create**

---

## Step 4: Enable Cloud Storage

1. In the left sidebar, click **Build → Storage**
2. Click **Get started**
3. Select **Start in test mode** → Click **Next**
4. Choose the same location as Firestore → Click **Done**

> **Note:** As of 2025, Storage requires the Blaze (pay-as-you-go) plan,
> but the free quota (5 GB storage) is more than enough.
> If you want to skip Storage for now, marks-card uploads will be
> disabled but everything else works fine.

---

## Step 5: Register Web App & Get Config

1. In Project Overview (home), click the **web icon** `</>`
2. Nickname: **placemint-web**
3. Check **"Also set up Firebase Hosting"** (optional, for later deployment)
4. Click **Register app**
5. You'll see a config object like this — **copy it**:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "placemint-xxxxx.firebaseapp.com",
  projectId: "placemint-xxxxx",
  storageBucket: "placemint-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. Paste this into `src/config/firebase.js` (replacing the placeholder values)

---

## Step 6: Create the Admin Account

1. Go to **Authentication → Users** tab
2. Click **Add user**
3. Email: `admin@placemint.com` (or your preferred admin email)
4. Password: choose a strong password
5. Copy the **User UID** shown after creation

Now go to **Firestore Database** and create the admin user document:

1. Click **Start collection** → Collection ID: `users`
2. Document ID: paste the **User UID** from step above
3. Add these fields:
   - `email` (string): `admin@placemint.com`
   - `role` (string): `admin`
   - `displayName` (string): `Placement Admin`
   - `createdAt` (timestamp): select current date/time
   - `approved` (boolean): `true`

---

## Firestore Data Model

Here's the complete collection structure the app uses:

```
users (collection)
  └── {userId} (document)
        ├── email: string
        ├── role: "admin" | "hod" | "coordinator" | "company" | "student"
        ├── displayName: string
        ├── department: string (for hod/coordinator/student)
        ├── approved: boolean
        ├── createdAt: timestamp
        └── phone: string

students (collection)
  └── {userId} (document — same ID as users collection)
        ├── usn: string (university seat number)
        ├── department: string
        ├── semester: number
        ├── tenthMarks: number
        ├── twelfthMarks: number
        ├── cgpa: number
        ├── semesters: map
        │     ├── sem1: { marks: number, cardUrl: string, verified: boolean }
        │     ├── sem2: { ... }
        │     └── ...
        ├── tenthCardUrl: string
        ├── twelfthCardUrl: string
        ├── photoUrl: string
        ├── profileComplete: boolean
        ├── placementStatus: "eligible" | "applied" | "shortlisted" | "interview" | "placed" | "blocked"
        ├── placedAt: string (company name, if placed)
        ├── package: number (LPA, if placed)
        └── updatedAt: timestamp

companies (collection)
  └── {companyId} (auto-generated)
        ├── name: string
        ├── industry: string
        ├── website: string
        ├── logo: string (color hex for now, URL later)
        ├── hrContact: string
        ├── about: string
        ├── userId: string (linked to users collection)
        ├── createdAt: timestamp
        └── updatedAt: timestamp

jobs (collection)
  └── {jobId} (auto-generated)
        ├── companyId: string (reference)
        ├── companyName: string (denormalized for fast reads)
        ├── role: string
        ├── package: string (e.g., "6.5 LPA")
        ├── packageNumeric: number (for sorting — e.g., 6.5)
        ├── minPercentage: number (eligibility cutoff)
        ├── eligibleDepartments: array of strings
        ├── driveType: "on-campus" | "virtual"
        ├── driveDate: timestamp
        ├── deadline: timestamp
        ├── description: string
        ├── status: "open" | "closed" | "completed"
        ├── createdAt: timestamp
        └── updatedAt: timestamp

applications (collection)
  └── {applicationId} (auto-generated)
        ├── jobId: string
        ├── studentId: string (userId)
        ├── studentName: string (denormalized)
        ├── studentUsn: string (denormalized)
        ├── department: string
        ├── stage: number (0=Applied, 1=Shortlisted, 2=Aptitude, 3=Technical, 4=HR, 5=Offer, 6=Placed)
        ├── status: "active" | "rejected" | "placed"
        ├── appliedAt: timestamp
        └── updatedAt: timestamp

activities (collection)
  └── {activityId} (auto-generated)
        ├── title: string
        ├── organizer: string
        ├── speaker: string
        ├── date: timestamp
        ├── location: string
        ├── department: string
        ├── totalSeats: number
        ├── attendees: array of strings (userIds)
        ├── createdBy: string (userId)
        └── createdAt: timestamp

settings (collection)
  └── site (single document)
        ├── privacyPolicy: string
        ├── termsAndConditions: string
        ├── ownerInfo: map { name, email, phone, address }
        └── faqs: array of maps [{ question, answer }]

donations (collection)
  └── {donationId} (auto-generated)
        ├── studentId: string
        ├── studentName: string
        ├── amount: number
        ├── status: "requested" | "received"
        ├── requestedAt: timestamp
        └── receivedAt: timestamp
```

---

## Running the App Locally

```bash
cd placemint
npm install
npm run dev
```

App opens at `http://localhost:5173`

Routes:
- `/`            → Student login
- `/department`  → HOD / Coordinator login
- `/company`     → Company login
- `/admin`       → Admin login
