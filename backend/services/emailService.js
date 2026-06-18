import nodemailer from 'nodemailer';
import '#bootstrap/env.js';

/**
 * Email Service using Nodemailer
 * Supports Gmail SMTP (free, 500 emails/day) and can be upgraded to Resend/SendGrid
 */

// Create transporter
let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // Check if email service is configured
  const emailService = process.env.EMAIL_SERVICE || 'gmail'; // 'gmail', 'resend', 'sendgrid'
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD; // Gmail App Password

  if (!emailUser || !emailPassword) {
    console.warn('⚠️ Email service not configured. Emails will be logged to console only.');
    return null;
  }

  if (emailService === 'gmail') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword, // Gmail App Password
      },
    });
  } else {
    // For other services, use SMTP config
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  }

  return transporter;
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  // Format token for better readability (split into groups of 8 characters)
  const formattedToken = token.match(/.{1,8}/g)?.join('-') || token;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'English Chatbot'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Xác thực email - English Chatbot',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #7137ea; margin-top: 0;">Xác thực email của bạn</h2>
          <p style="color: #333; line-height: 1.6;">Xin chào,</p>
          <p style="color: #333; line-height: 1.6;">Cảm ơn bạn đã đăng ký tài khoản. Vui lòng xác thực email của bạn bằng một trong các cách sau:</p>
          
          <!-- Verification Code Section -->
          <div style="background-color: #f5f5f5; border-left: 4px solid #7137ea; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; font-weight: 600;">📋 Mã xác thực (Copy và paste vào chatbot):</p>
            <div style="background-color: white; border: 2px dashed #7137ea; border-radius: 6px; padding: 15px; text-align: center; margin: 15px 0;">
              <code style="font-size: 18px; font-weight: bold; color: #7137ea; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                ${formattedToken}
              </code>
            </div>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
              ⚠️ Mã này sẽ hết hạn sau 24 giờ. Không chia sẻ mã này với bất kỳ ai.
            </p>
          </div>

          <!-- OR Divider -->
          <div style="text-align: center; margin: 25px 0; color: #999;">
            <span style="background-color: white; padding: 0 15px; position: relative; z-index: 1;">HOẶC</span>
            <hr style="border: none; border-top: 1px solid #ddd; margin: -10px 0 0 0;">
          </div>

          <!-- Verification Link Section -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Nhấp vào nút bên dưới để xác thực tự động:</p>
            <a href="${verificationUrl}" 
               style="background-color: #7137ea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
              ✅ Xác thực email
            </a>
          </div>

          <!-- Link as text -->
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; font-weight: 600;">Hoặc copy link sau vào trình duyệt:</p>
            <p style="margin: 0; word-break: break-all; color: #7137ea; font-size: 12px; font-family: 'Courier New', monospace;">
              ${verificationUrl}
            </p>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0; line-height: 1.6;">
              ⏰ Link và mã này sẽ hết hạn sau <strong>24 giờ</strong>.<br>
              🔒 Nếu bạn không yêu cầu xác thực email này, vui lòng bỏ qua email này.
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
XÁC THỰC EMAIL - ENGLISH CHATBOT

Xin chào,

Cảm ơn bạn đã đăng ký tài khoản. Vui lòng xác thực email của bạn bằng một trong các cách sau:

📋 MÃ XÁC THỰC (Copy và paste vào chatbot):
${formattedToken}

⚠️ Mã này sẽ hết hạn sau 24 giờ. Không chia sẻ mã này với bất kỳ ai.

HOẶC

✅ Nhấp vào link sau để xác thực tự động:
${verificationUrl}

⏰ Link và mã này sẽ hết hạn sau 24 giờ.
🔒 Nếu bạn không yêu cầu xác thực email này, vui lòng bỏ qua email này.
    `,
  };

  try {
    const emailTransporter = getTransporter();

    if (!emailTransporter) {
      // Fallback: Log to console in development
      console.log('📧 [Email Service Not Configured] Verification email would be sent:');
      console.log(`   To: ${email}`);
      console.log(`   Code: ${formattedToken}`);
      console.log(`   URL: ${verificationUrl}`);
      return { success: false, message: 'Email service not configured', verificationUrl, token: formattedToken };
    }

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);

    // Fallback: Log to console
    console.log('📧 [Email Send Failed] Verification URL:');
    console.log(`   To: ${email}`);
    console.log(`   URL: ${verificationUrl}`);

    return {
      success: false,
      error: error.message,
      verificationUrl // Return URL as fallback
    };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'English Chatbot'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Đặt lại mật khẩu - English Chatbot',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7137ea;">Đặt lại mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấp vào nút bên dưới để tạo mật khẩu mới:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #7137ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Đặt lại mật khẩu
          </a>
        </div>
        <p>Hoặc copy và paste link sau vào trình duyệt:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Link này sẽ hết hạn sau 1 giờ.<br>
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
      </div>
    `,
    text: `
Đặt lại mật khẩu

Xin chào,

Bạn đã yêu cầu đặt lại mật khẩu. Truy cập link sau để tạo mật khẩu mới:

${resetUrl}

Link này sẽ hết hạn sau 1 giờ.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
    `,
  };

  try {
    const emailTransporter = getTransporter();

    if (!emailTransporter) {
      console.log('📧 [Email Service Not Configured] Password reset email would be sent:');
      console.log(`   To: ${email}`);
      console.log(`   URL: ${resetUrl}`);
      return { success: false, message: 'Email service not configured', resetUrl };
    }

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message, resetUrl };
  }
}
