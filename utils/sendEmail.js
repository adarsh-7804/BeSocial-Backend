const nodemailer = require("nodemailer");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    family: 4
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