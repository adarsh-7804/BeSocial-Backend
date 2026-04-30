const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true only for 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: `"BeSocial" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    ...(text && { text }),
    ...(html && { html }),
    ...(replyTo && { replyTo }),
  });
};

module.exports = sendEmail;
