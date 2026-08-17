import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'

let emailConfig = null
let siteInfo = null

async function loadConfig() {
  if (emailConfig !== null) return emailConfig
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'))
    if (snap.exists()) {
      const data = snap.data()
      emailConfig = data.smtpConfig || null
      siteInfo = {
        siteName: data.ownerInfo?.collegeName || 'PlaceMint',
        cellName: data.ownerInfo?.name || 'Placement Cell',
      }
    }
  } catch (e) { console.warn('Email config load failed:', e) }
  return emailConfig
}

export function resetEmailConfig() { emailConfig = null }

/**
 * Queue an email in Firestore. A Cloud Function or the Firebase
 * Trigger Email extension will process it via SMTP.
 */
async function queueEmail(to, subject, html, category) {
  const config = await loadConfig()
  if (!config?.host) return false
  if (!config.enabled) return false

  try {
    await addDoc(collection(db, 'emailQueue'), {
      to,
      subject: `[${siteInfo?.cellName || 'Placement'}] ${subject}`,
      html: wrapTemplate(html),
      category,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    return true
  } catch (e) {
    console.warn('Email queue failed:', e)
    return false
  }
}

function wrapTemplate(body) {
  const name = siteInfo?.siteName || 'PlaceMint'
  const cell = siteInfo?.cellName || 'Placement Cell'
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4C5BD4, #3a48b0); padding: 24px 28px; border-radius: 12px 12px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 20px;">${name}</h2>
        <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">${cell}</p>
      </div>
      <div style="padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-top: none;">
        ${body}
      </div>
      <div style="padding: 16px 28px; background: #f8f9fc; border: 1px solid #e5e7eb; border-top: none;
        border-radius: 0 0 12px 12px; font-size: 12px; color: #888; text-align: center;">
        ${cell} · ${name}<br/>
        This is an automated notification. Please do not reply to this email.
      </div>
    </div>`
}

// ─── USER NOTIFICATIONS ───

export async function notifyUserRegistered(email, name) {
  return queueEmail(email,
    'Registration received — awaiting approval',
    `<h3>Welcome, ${name}!</h3>
    <p>Your registration has been received and is pending approval from the placement cell.</p>
    <p>You will receive another email once your registration is approved.</p>`,
    'user_registered')
}

export async function notifyUserApproved(email, name) {
  return queueEmail(email,
    'Registration approved — Your account is active',
    `<h3>Registration Approved</h3>
    <p>Hi ${name},</p>
    <p>Your registration has been approved. You can now log in and complete your profile to start applying for placement drives.</p>`,
    'user_approved')
}

export async function notifyNewJobToStudent(email, name, role, company) {
  return queueEmail(email,
    `New placement drive: ${role} at ${company}`,
    `<h3>New Placement Drive</h3>
    <p>Hi ${name},</p>
    <p>A new placement drive has been posted:</p>
    <table style="border-collapse:collapse; margin: 12px 0;">
      <tr><td style="padding:6px 12px; font-weight:600; color:#666;">Role</td><td style="padding:6px 12px;">${role}</td></tr>
      <tr><td style="padding:6px 12px; font-weight:600; color:#666;">Company</td><td style="padding:6px 12px;">${company}</td></tr>
    </table>
    <p>Log in to check eligibility and register for this drive.</p>`,
    'new_job_student')
}

export async function notifyStageUpdate(email, name, role, company, stage) {
  return queueEmail(email,
    `Application update: ${role} at ${company} → ${stage}`,
    `<h3>Application Status Update</h3>
    <p>Hi ${name},</p>
    <p>Your application for <b>${role}</b> at <b>${company}</b> has progressed to:</p>
    <div style="display:inline-block; padding:8px 18px; background:#EEF0FF; color:#4C5BD4; border-radius:20px; font-weight:700; font-size:16px; margin:10px 0;">${stage}</div>
    <p>Log in to your portal for full details.</p>`,
    'stage_update')
}

export async function notifyProfileApproved(email, name, field, approved) {
  return queueEmail(email,
    `${field} — ${approved ? 'Approved' : 'Rejected'}`,
    `<h3>${field} ${approved ? 'Approved' : 'Needs Revision'}</h3>
    <p>Hi ${name},</p>
    ${approved
      ? `<p>Your <b>${field}</b> have been verified and approved. Your profile completeness has been updated.</p>`
      : `<p>Your <b>${field}</b> have been reviewed and need revision. Please log in and update the details.</p>`
    }`,
    'profile_review')
}

export async function notifyOfferReceived(email, name, role, company) {
  return queueEmail(email,
    `🎉 Offer received: ${role} at ${company}`,
    `<h3>🎉 Congratulations!</h3>
    <p>Hi ${name},</p>
    <p>You have received an offer for <b>${role}</b> at <b>${company}</b>.</p>
    <p>Please log in to review the offer details and respond (accept or decline).</p>`,
    'offer_received')
}

export async function notifyPlaced(email, name, role, company, pkg) {
  return queueEmail(email,
    `🎓 Congratulations! Placed at ${company}`,
    `<h3>🎓 Congratulations, ${name}!</h3>
    <p>You have been officially placed at <b>${company}</b> for the role of <b>${role}</b>${pkg ? ` with a package of <b>₹${pkg} LPA</b>` : ''}.</p>
    <p>Wishing you all the best for your career!</p>`,
    'placed')
}

// ─── COMPANY NOTIFICATIONS ───

export async function notifyCompanyNewApplicant(email, companyName, studentName, role) {
  return queueEmail(email,
    `New applicant: ${studentName} for ${role}`,
    `<h3>New Application Received</h3>
    <p>Hi ${companyName},</p>
    <p><b>${studentName}</b> has applied for the <b>${role}</b> position.</p>
    <p>Log in to review the candidate and manage your pipeline.</p>`,
    'company_new_applicant')
}

export async function notifyCompanyOfferAccepted(email, companyName, studentName, role) {
  return queueEmail(email,
    `Offer accepted: ${studentName} for ${role}`,
    `<h3>Offer Accepted</h3>
    <p>Hi ${companyName},</p>
    <p><b>${studentName}</b> has accepted the offer for <b>${role}</b>. The acceptance is pending admin approval.</p>`,
    'company_offer_accepted')
}

export async function notifyCompanyAdminApproved(email, companyName, studentName, role) {
  return queueEmail(email,
    `✓ Placement confirmed: ${studentName} for ${role}`,
    `<h3>Placement Confirmed</h3>
    <p>Hi ${companyName},</p>
    <p>The placement of <b>${studentName}</b> for <b>${role}</b> has been confirmed by the placement admin.</p>`,
    'company_admin_approved')
}

export async function notifyCompanyCreated(email, companyName, password) {
  return queueEmail(email,
    'Your placement portal account is ready',
    `<h3>Welcome to the Placement Portal</h3>
    <p>Hi ${companyName},</p>
    <p>Your company account has been created. You can log in at the <b>/company</b> portal with:</p>
    <table style="border-collapse:collapse; margin: 12px 0; background:#f8f9fc; border-radius:8px;">
      <tr><td style="padding:8px 14px; font-weight:600; color:#666;">Email</td><td style="padding:8px 14px;">${email}</td></tr>
      <tr><td style="padding:8px 14px; font-weight:600; color:#666;">Password</td><td style="padding:8px 14px;">${password}</td></tr>
    </table>
    <p>Please change your password after first login.</p>`,
    'company_created')
}

// ─── DEPARTMENT NOTIFICATIONS ───

export async function notifyDeptCoordinatorAssigned(email, name, dept) {
  return queueEmail(email,
    `You've been assigned as ${dept} coordinator`,
    `<h3>Coordinator Assignment</h3>
    <p>Hi ${name},</p>
    <p>You have been assigned as a coordinator for the <b>${dept}</b> department.</p>
    <p>Log in at <b>/department</b> to access your coordinator panel.</p>`,
    'dept_coordinator_assigned')
}

export async function notifyDeptNewJob(email, name, dept, role, company) {
  return queueEmail(email,
    `New drive for ${dept}: ${role} at ${company}`,
    `<h3>New Drive for Your Department</h3>
    <p>Hi ${name},</p>
    <p>A new placement drive relevant to <b>${dept}</b> has been posted:</p>
    <p><b>${role}</b> at <b>${company}</b></p>`,
    'dept_new_job')
}

export async function notifyDeptStudentPlaced(email, name, dept, studentName, company, role) {
  return queueEmail(email,
    `🎓 ${dept} student placed: ${studentName} at ${company}`,
    `<h3>Student Placement — ${dept}</h3>
    <p>Hi ${name},</p>
    <p><b>${studentName}</b> from <b>${dept}</b> has been placed at <b>${company}</b> for the role of <b>${role}</b>.</p>`,
    'dept_student_placed')
}

// ─── ADMIN NOTIFICATIONS ───

export async function notifyAdminNewApplicant(adminEmail, studentName, role, company) {
  return queueEmail(adminEmail,
    `New application: ${studentName} → ${role} at ${company}`,
    `<h3>New Application</h3>
    <p><b>${studentName}</b> has applied for <b>${role}</b> at <b>${company}</b>.</p>`,
    'admin_new_applicant')
}

export async function notifyAdminOfferSent(adminEmail, studentName, role, company) {
  return queueEmail(adminEmail,
    `Offer sent: ${studentName} for ${role} at ${company}`,
    `<h3>Offer Letter Sent</h3>
    <p><b>${company}</b> has sent an offer to <b>${studentName}</b> for <b>${role}</b>.</p>
    <p>The student will be notified to accept or decline.</p>`,
    'admin_offer_sent')
}

export async function notifyAdminStudentPlaced(adminEmail, studentName, company, role, pkg) {
  return queueEmail(adminEmail,
    `🎓 Student placed: ${studentName} at ${company}`,
    `<h3>Student Placed</h3>
    <p><b>${studentName}</b> has been placed at <b>${company}</b> for <b>${role}</b>${pkg ? ` · ₹${pkg} LPA` : ''}.</p>`,
    'admin_student_placed')
}

export async function notifyAdminCompanyPostedJob(adminEmail, company, role) {
  return queueEmail(adminEmail,
    `New job posting: ${role} by ${company}`,
    `<h3>New Job Posting</h3>
    <p><b>${company}</b> has posted a new job: <b>${role}</b>.</p>
    <p>Review the posting and publish it for students.</p>`,
    'admin_new_job')
}

export async function notifyAdminPendingApproval(adminEmail, type, details) {
  return queueEmail(adminEmail,
    `Action needed: ${type}`,
    `<h3>Pending Approval</h3>
    <p>A new item needs your attention:</p>
    <p><b>Type:</b> ${type}</p>
    <p><b>Details:</b> ${details}</p>`,
    'admin_pending')
}
