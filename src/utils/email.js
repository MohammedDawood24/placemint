import emailjs from '@emailjs/browser'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

let emailConfig = null

/**
 * Load email config from Firestore settings
 */
async function loadConfig() {
  if (emailConfig) return emailConfig
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'))
    if (snap.exists()) {
      emailConfig = snap.data().emailConfig || null
    }
  } catch (e) {
    console.warn('Failed to load email config:', e)
  }
  return emailConfig
}

/**
 * Send an email notification using EmailJS.
 * Silently fails if email is not configured (no errors thrown to UI).
 *
 * @param {string} toEmail - Recipient email
 * @param {string} toName - Recipient name
 * @param {string} subject - Email subject
 * @param {string} body - Email body (HTML supported)
 */
export async function sendEmail(toEmail, toName, subject, body) {
  const config = await loadConfig()
  if (!config?.serviceId || !config?.publicKey) {
    console.log('Email not configured — skipping notification to', toEmail)
    return false
  }

  try {
    await emailjs.send(
      config.serviceId,
      config.templateId || 'default_template',
      {
        to_email: toEmail,
        to_name: toName || toEmail,
        subject: subject,
        message: body,
        from_name: config.fromName || 'Placement Cell',
        reply_to: config.replyTo || '',
      },
      config.publicKey
    )
    console.log('Email sent to', toEmail)
    return true
  } catch (e) {
    console.warn('Email send failed:', e)
    return false
  }
}

/**
 * Clear cached config (call after saving new settings)
 */
export function resetEmailConfig() {
  emailConfig = null
}

// ─── Pre-built notification templates ───

export async function notifyNewJobPost(toEmail, toName, jobRole, companyName) {
  return sendEmail(toEmail, toName,
    `New placement drive: ${jobRole} at ${companyName}`,
    `<h3>New Placement Drive</h3>
    <p>Hi ${toName},</p>
    <p>A new placement drive has been posted:</p>
    <ul>
      <li><b>Role:</b> ${jobRole}</li>
      <li><b>Company:</b> ${companyName}</li>
    </ul>
    <p>Log in to your placement portal to check eligibility and register.</p>`)
}

export async function notifyRegistrationApproved(toEmail, toName) {
  return sendEmail(toEmail, toName,
    'Registration approved — Your account is now active',
    `<h3>Registration Approved</h3>
    <p>Hi ${toName},</p>
    <p>Your registration has been approved by the placement cell. You can now log in and complete your profile to start applying for placement drives.</p>`)
}

export async function notifyMarksApproved(toEmail, toName, marksType) {
  return sendEmail(toEmail, toName,
    `Your ${marksType} marks have been approved`,
    `<h3>Marks Approved</h3>
    <p>Hi ${toName},</p>
    <p>Your <b>${marksType}</b> marks have been verified and approved. Your profile completeness has been updated.</p>`)
}

export async function notifyOfferReceived(toEmail, toName, jobRole, companyName) {
  return sendEmail(toEmail, toName,
    `🎉 You received an offer: ${jobRole} at ${companyName}`,
    `<h3>Congratulations! You Have an Offer</h3>
    <p>Hi ${toName},</p>
    <p>You have received an offer for <b>${jobRole}</b> at <b>${companyName}</b>.</p>
    <p>Please log in to your placement portal to review the offer details and accept or decline.</p>`)
}

export async function notifyStageUpdate(toEmail, toName, jobRole, companyName, stageName) {
  return sendEmail(toEmail, toName,
    `Application update: ${jobRole} at ${companyName}`,
    `<h3>Application Status Update</h3>
    <p>Hi ${toName},</p>
    <p>Your application for <b>${jobRole}</b> at <b>${companyName}</b> has been updated.</p>
    <p>Current stage: <b>${stageName}</b></p>
    <p>Log in to your placement portal for details.</p>`)
}

export async function notifyPlaced(toEmail, toName, jobRole, companyName, pkg) {
  return sendEmail(toEmail, toName,
    `🎉 Congratulations! You are placed at ${companyName}`,
    `<h3>🎉 Congratulations!</h3>
    <p>Hi ${toName},</p>
    <p>You have been officially placed at <b>${companyName}</b> for the role of <b>${jobRole}</b>${pkg ? ` with a package of <b>₹${pkg} LPA</b>` : ''}.</p>
    <p>This is a great achievement. Wishing you all the best for your career!</p>`)
}

export async function notifyApplicationReceived(toEmail, toName, studentName, jobRole) {
  return sendEmail(toEmail, toName,
    `New application received: ${studentName} for ${jobRole}`,
    `<h3>New Application</h3>
    <p>Hi ${toName},</p>
    <p><b>${studentName}</b> has applied for the <b>${jobRole}</b> position.</p>
    <p>Log in to your portal to review the candidate.</p>`)
}
