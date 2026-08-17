/**
 * Firebase Cloud Function — SMTP Email Processor
 *
 * Watches the `emailQueue` Firestore collection and sends emails
 * via SMTP using the config stored in `settings/site.smtpConfig`.
 *
 * SETUP:
 *   1. cd functions
 *   2. npm install
 *   3. firebase deploy --only functions
 *
 * Requires Firebase Blaze plan for Cloud Functions.
 *
 * For the weekly admin digest (Monday 8 AM), this also includes
 * a scheduled function using Cloud Scheduler.
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const nodemailer = require('nodemailer')

admin.initializeApp()
const db = admin.firestore()

let cachedTransporter = null
let cachedConfig = null

async function getTransporter() {
  const snap = await db.doc('settings/site').get()
  const config = snap.data()?.smtpConfig
  if (!config?.host || !config.enabled) return null

  // Reuse transporter if config hasn't changed
  if (cachedConfig && cachedConfig.host === config.host &&
      cachedConfig.username === config.username) {
    return cachedTransporter
  }

  cachedConfig = config
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: parseInt(config.port) || 587,
    secure: config.security === 'SSL',
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  return cachedTransporter
}

/**
 * Trigger: new document in emailQueue collection
 */
exports.processEmailQueue = functions.firestore
  .document('emailQueue/{emailId}')
  .onCreate(async (snap, context) => {
    const email = snap.data()
    const transporter = await getTransporter()

    if (!transporter) {
      await snap.ref.update({ status: 'skipped', reason: 'SMTP not configured' })
      return
    }

    const config = cachedConfig
    try {
      await transporter.sendMail({
        from: `"${config.fromName || 'Placement Cell'}" <${config.fromEmail || config.username}>`,
        to: email.to,
        subject: email.subject,
        html: email.html,
      })
      await snap.ref.update({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp() })
      console.log(`Email sent to ${email.to}: ${email.subject}`)
    } catch (error) {
      await snap.ref.update({ status: 'failed', error: error.message })
      console.error(`Email failed to ${email.to}:`, error.message)
    }
  })

/**
 * Weekly admin digest — runs every Monday at 8:00 AM IST
 * Requires Cloud Scheduler (Blaze plan)
 */
exports.weeklyAdminDigest = functions.pubsub
  .schedule('0 8 * * 1')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const settingsSnap = await db.doc('settings/site').get()
    const config = settingsSnap.data()?.smtpConfig
    if (!config?.adminEmail || !config.enabled) return

    const now = new Date()
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    // Gather stats
    const [studentsSnap, appsSnap, jobsSnap] = await Promise.all([
      db.collection('students').get(),
      db.collection('applications').where('appliedAt', '>=', weekAgo).get(),
      db.collection('jobs').where('createdAt', '>=', weekAgo).get(),
    ])

    const totalStudents = studentsSnap.size
    const placed = studentsSnap.docs.filter(d => d.data().placementStatus === 'placed').length
    const weekApps = appsSnap.size
    const newJobs = jobsSnap.size
    const weekPlaced = appsSnap.docs.filter(d => d.data().stage >= 6).length

    const siteName = settingsSnap.data()?.ownerInfo?.collegeName || 'PlaceMint'

    await db.collection('emailQueue').add({
      to: config.adminEmail,
      subject: `[${siteName}] Weekly Placement Digest — ${now.toLocaleDateString('en-IN')}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4C5BD4, #3a48b0); padding: 24px 28px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0;">Weekly Placement Digest</h2>
            <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">
              ${siteName} · Week ending ${now.toLocaleDateString('en-IN')}</p>
          </div>
          <div style="padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-top: none;">
            <h3 style="margin-top:0;">This Week's Summary</h3>
            <table style="border-collapse:collapse; width:100%; margin:12px 0;">
              <tr style="background:#f8f9fc;">
                <td style="padding:10px 14px; font-weight:600; border:1px solid #e5e7eb;">Total students</td>
                <td style="padding:10px 14px; border:1px solid #e5e7eb; font-size:18px; font-weight:700;">${totalStudents}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px; font-weight:600; border:1px solid #e5e7eb;">Total placed</td>
                <td style="padding:10px 14px; border:1px solid #e5e7eb; font-size:18px; font-weight:700; color:#15A86B;">${placed}</td>
              </tr>
              <tr style="background:#f8f9fc;">
                <td style="padding:10px 14px; font-weight:600; border:1px solid #e5e7eb;">New applications this week</td>
                <td style="padding:10px 14px; border:1px solid #e5e7eb; font-size:18px; font-weight:700;">${weekApps}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px; font-weight:600; border:1px solid #e5e7eb;">New job postings</td>
                <td style="padding:10px 14px; border:1px solid #e5e7eb; font-size:18px; font-weight:700;">${newJobs}</td>
              </tr>
              <tr style="background:#f8f9fc;">
                <td style="padding:10px 14px; font-weight:600; border:1px solid #e5e7eb;">Placed this week</td>
                <td style="padding:10px 14px; border:1px solid #e5e7eb; font-size:18px; font-weight:700; color:#15A86B;">${weekPlaced}</td>
              </tr>
            </table>
            <p>Log in to your admin dashboard for full details.</p>
          </div>
          <div style="padding: 16px 28px; background: #f8f9fc; border: 1px solid #e5e7eb; border-top: none;
            border-radius: 0 0 12px 12px; font-size: 12px; color: #888; text-align: center;">
            Automated weekly digest · ${siteName}
          </div>
        </div>`,
      category: 'admin_weekly_digest',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    console.log('Weekly digest queued for', config.adminEmail)
  })
