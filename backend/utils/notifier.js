const { Notification } = require('../models');

async function sendEmail(recipient, subject, body) {
  console.log(`[EMAIL SENT] To: ${recipient} | Subject: ${subject} | Body: ${body}`);
  try {
    await Notification.create({
      recipient,
      channel: 'email',
      subject,
      body
    });
  } catch (err) {
    console.error('Failed to log email notification:', err);
  }
}

async function sendSMS(recipient, body) {
  console.log(`[SMS SENT] To: ${recipient} | Body: ${body}`);
  try {
    await Notification.create({
      recipient,
      channel: 'sms',
      subject: 'SMS Alert',
      body
    });
  } catch (err) {
    console.error('Failed to log SMS notification:', err);
  }
}

module.exports = {
  sendEmail,
  sendSMS
};
