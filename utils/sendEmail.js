    const nodemailer = require("nodemailer");

    const sendEmail = async ({ to, subject, text, html, replyTo }) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
