const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1.) Create a transporter
  const transporter = nodemailer.createTransport({
    // //GMAIL CONFIG
    // service: 'Gmail',
    // auth: {
    //     user: process.env.EMAIL_USERNAME,
    //     password: process.env.EMAIL_PASSWORD
    // }
    // Activate in gmail "less secure app" option

    // Mailtrap config
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  // 2.) Define the email ooptions
  const mailOptions = {
    from: 'Natours Inc <info@natours.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  // Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;