require('dotenv').config();
const emailService = require('./server/services/emailService');

console.log('Testing email service...');
console.log('Email user:', process.env.EMAIL_USER);

// Test sending a verification email
emailService.sendVerificationEmail('tete.lanre@gmail.com', 'test-token-123')
    .then(() => {
        console.log('✅ Test email sent successfully!');
        console.log('Check your inbox for the verification email.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error sending email:', err);
        process.exit(1);
    });