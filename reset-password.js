/**
 * Reset admin password without logging in.
 * 
 * Usage:
 *   node reset-password.js <email> <new-password>
 *   node reset-password.js admin@placemint.app Admin@123
 * 
 * This uses Firebase Admin SDK approach via the Firebase Auth REST API.
 * You need to run this from Firebase Console instead:
 * 
 * OPTION A (Easiest - Firebase Console):
 *   1. Go to https://console.firebase.google.com
 *   2. Select your project "placement-f2b19"
 *   3. Go to Authentication → Users
 *   4. Find your admin email
 *   5. Click the three dots (⋮) on the right
 *   6. Click "Reset password" → sends a reset email
 *   OR
 *   7. Click "Edit account" → type new password → Save
 * 
 * OPTION B (This script - requires service account):
 *   1. Go to Firebase Console → Project Settings → Service Accounts
 *   2. Click "Generate new private key" → downloads a JSON file
 *   3. Save it as "serviceAccount.json" in this folder
 *   4. Run: npm install firebase-admin
 *   5. Run: node reset-password.js admin@placemint.app Admin@123
 */

const admin = require('firebase-admin')

// Load service account
try {
  const serviceAccount = require('./serviceAccount.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
} catch (e) {
  console.error('\n❌ serviceAccount.json not found!\n')
  console.log('Follow these steps:')
  console.log('1. Go to Firebase Console → Project Settings → Service Accounts')
  console.log('2. Click "Generate new private key"')
  console.log('3. Save the downloaded file as "serviceAccount.json" in this folder')
  console.log('4. Run: npm install firebase-admin')
  console.log('5. Run: node reset-password.js <email> <newpassword>\n')
  console.log('OR just reset from Firebase Console:')
  console.log('   Authentication → Users → Find user → ⋮ → Reset password\n')
  process.exit(1)
}

const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.log('Usage: node reset-password.js <email> <new-password>')
  console.log('Example: node reset-password.js admin@placemint.app Admin@123')
  process.exit(1)
}

async function resetPassword() {
  try {
    const user = await admin.auth().getUserByEmail(email)
    await admin.auth().updateUser(user.uid, { password: newPassword })
    console.log(`\n✅ Password reset successfully!`)
    console.log(`   Email: ${email}`)
    console.log(`   New password: ${newPassword}`)
    console.log(`   UID: ${user.uid}\n`)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  process.exit(0)
}

resetPassword()
