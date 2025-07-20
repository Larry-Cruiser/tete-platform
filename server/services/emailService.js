const { supabaseAdmin } = require('../config/supabase');
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Create reusable transporter object using Gmail
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'tete.lanre@gmail.com',
                pass: process.env.EMAIL_APP_PASSWORD // Use App Password here
            }
        });

        // Verify transporter configuration
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Email service error:', error);
                console.log('📧 Falling back to console logging for emails');
            } else {
                console.log('✅ Email service ready to send messages');
            }
        });
    }

    // Helper function to get user details
    async getUserDetails(userId) {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('email, username, first_name')
            .eq('id', userId)
            .single();
        return user;
    }

    // Send verification email
    async sendVerificationEmail(email, token) {
        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email.html?token=${token}`;
        
        const mailOptions = {
            from: `"Tété Platform" <${process.env.EMAIL_USER || 'tete.lanre@gmail.com'}>`,
            to: email,
            subject: '🎮 Verify your Tété account',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; }
                        .header { background: linear-gradient(135deg, #FFD700, #FF4500); padding: 40px 20px; text-align: center; }
                        .header h1 { color: #1a1a1a; margin: 0; font-size: 36px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
                        .content { padding: 40px 30px; color: #ffffff; }
                        .button { display: inline-block; padding: 15px 40px; background: linear-gradient(145deg, #FFD700, #B8860B); color: #1a1a1a; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0; }
                        .footer { padding: 20px; text-align: center; color: #888; font-size: 14px; border-top: 1px solid #333; }
                        .link { color: #FFD700; word-break: break-all; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>TÉTÉ</h1>
                        </div>
                        <div class="content">
                            <h2 style="color: #FFD700;">Welcome to Tété! 🎉</h2>
                            <p>You're just one step away from joining Nigeria's premium P2P betting platform.</p>
                            <p>Please verify your email address to start winning:</p>
                            <div style="text-align: center;">
                                <a href="${verificationLink}" class="button">Verify My Email</a>
                            </div>
                            <p style="color: #888; font-size: 14px;">Or copy and paste this link in your browser:</p>
                            <p class="link">${verificationLink}</p>
                            <p style="color: #888; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
                        </div>
                        <div class="footer">
                            <p>© 2025 Game Headquarters Nigeria Limited. All rights reserved.</p>
                            <p>Players win, we just host! 🎮</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Welcome to Tété!
                
                Please verify your email address by clicking this link:
                ${verificationLink}
                
                This link will expire in 24 hours.
                
                Players win, we just host!
                
                © 2025 Game Headquarters Nigeria Limited
            `
        };

        try {
            // Try to send email
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Verification email sent:', info.messageId);
            
        } catch (error) {
            console.error('❌ Email send error:', error);
            // Log to console as fallback
            console.log(`
                📧 Verification Email (Console Fallback)
                To: ${email}
                Link: ${verificationLink}
            `);
        }

        // Store notification in database
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (user) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: user.id,
                    type: 'email_verification',
                    title: 'Verify your email',
                    message: 'Please verify your email to start wagering',
                    data: { verificationLink },
                    is_emailed: true
                });
        }

        return true;
    }

    // Send wager notifications
    async sendWagerNotification(userId, type, wagerData) {
        const messages = {
            wager_joined: {
                title: 'Your wager has been joined!',
                message: `${wagerData.joinerUsername} has joined your ₦${wagerData.amount} wager`,
                emoji: '🎮'
            },
            wager_won: {
                title: 'Congratulations! You won!',
                message: `You won ₦${wagerData.winnings} from your wager`,
                emoji: '🏆'
            },
            outcome_reminder: {
                title: 'Time to submit your outcome',
                message: `The decision time for your wager has passed. Submit your outcome now!`,
                emoji: '⏰'
            },
            approval_needed: {
                title: 'Wager approval needed',
                message: `${wagerData.joinerUsername} wants to join your wager with: "${wagerData.joinerPrediction}"`,
                emoji: '⚡'
            }
        };

        const notification = messages[type];
        if (!notification) return;

        // Get user details for email
        const user = await this.getUserDetails(userId);
        if (!user) return;

        // Save to notifications table
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                type: type,
                title: notification.title,
                message: notification.message,
                data: wagerData
            });

        // Send email notification
        if (user.email) {
            const mailOptions = {
                from: `"Tété Platform" <${process.env.EMAIL_USER || 'tete.lanre@gmail.com'}>`,
                to: user.email,
                subject: `${notification.emoji} ${notification.title}`,
                html: this.getNotificationEmailTemplate(notification, user, wagerData),
                text: `${notification.title}\n\n${notification.message}\n\nLog in to Tété to view details: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`
            };

            try {
                await this.transporter.sendMail(mailOptions);
                console.log(`✅ ${type} notification sent to ${user.email}`);
            } catch (error) {
                console.error('❌ Notification email error:', error);
            }
        }
    }

    // Email template for notifications
    getNotificationEmailTemplate(notification, user, wagerData) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; }
                    .header { background: linear-gradient(135deg, #FFD700, #FF4500); padding: 30px 20px; text-align: center; }
                    .header h1 { color: #1a1a1a; margin: 0; font-size: 32px; }
                    .content { padding: 30px; color: #ffffff; }
                    .notification-box { background: rgba(255,215,0,0.1); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; margin: 20px 0; }
                    .emoji { font-size: 48px; text-align: center; margin-bottom: 10px; }
                    .button { display: inline-block; padding: 15px 40px; background: linear-gradient(145deg, #FFD700, #B8860B); color: #1a1a1a; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0; }
                    .footer { padding: 20px; text-align: center; color: #888; font-size: 14px; border-top: 1px solid #333; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>TÉTÉ</h1>
                    </div>
                    <div class="content">
                        <div class="notification-box">
                            <div class="emoji">${notification.emoji}</div>
                            <h2 style="color: #FFD700; text-align: center; margin: 10px 0;">${notification.title}</h2>
                            <p style="text-align: center; font-size: 16px; margin: 15px 0;">${notification.message}</p>
                        </div>
                        
                        <p>Hi ${user.username || user.first_name || 'Champion'},</p>
                        
                        ${this.getSpecificContent(notification, wagerData)}
                        
                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html" class="button">View in Tété</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2025 Game Headquarters Nigeria Limited. All rights reserved.</p>
                        <p>Players win, we just host! 🎮</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Get specific content based on notification type
    getSpecificContent(notification, wagerData) {
        if (notification.title.includes('won')) {
            return `
                <p>Your winning amount of <strong style="color: #FFD700;">₦${wagerData.winnings}</strong> has been credited to your wallet!</p>
                <p>Ready for another challenge? Create or join more wagers to keep winning!</p>
            `;
        } else if (notification.title.includes('joined')) {
            return `
                <p>Your wager for <strong style="color: #FFD700;">₦${wagerData.amount}</strong> has been accepted by ${wagerData.joinerUsername}.</p>
                <p>The game is now live! May the best player win! 🎯</p>
            `;
        } else if (notification.title.includes('outcome')) {
            return `
                <p>The decision time for your wager has passed. You have <strong style="color: #FF4500;">24 hours</strong> to submit your outcome.</p>
                <p>Don't forget - failing to submit on time may result in penalties!</p>
            `;
        } else if (notification.title.includes('approval')) {
            return `
                <p><strong>${wagerData.joinerUsername}</strong> wants to join your wager with the following prediction:</p>
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <em>"${wagerData.joinerPrediction}"</em>
                </div>
                <p>You can approve or reject this request in your dashboard.</p>
            `;
        }
        return '';
    }

    // Send password reset email
    async sendPasswordResetEmail(email, resetToken) {
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
        
        const mailOptions = {
            from: `"Tété Platform" <${process.env.EMAIL_USER || 'tete.lanre@gmail.com'}>`,
            to: email,
            subject: '🔐 Reset your Tété password',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; }
                        .header { background: linear-gradient(135deg, #FFD700, #FF4500); padding: 30px 20px; text-align: center; }
                        .header h1 { color: #1a1a1a; margin: 0; font-size: 32px; }
                        .content { padding: 30px; color: #ffffff; }
                        .button { display: inline-block; padding: 15px 40px; background: linear-gradient(145deg, #FF4500, #CC3700); color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0; }
                        .footer { padding: 20px; text-align: center; color: #888; font-size: 14px; border-top: 1px solid #333; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>TÉTÉ</h1>
                        </div>
                        <div class="content">
                            <h2 style="color: #FFD700;">Password Reset Request</h2>
                            <p>We received a request to reset your password. Click the button below to create a new password:</p>
                            <div style="text-align: center;">
                                <a href="${resetLink}" class="button">Reset Password</a>
                            </div>
                            <p style="color: #888; font-size: 14px;">This link will expire in 1 hour.</p>
                            <p style="color: #888; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>© 2025 Game Headquarters Nigeria Limited. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Password Reset Request
                
                Click this link to reset your password:
                ${resetLink}
                
                This link will expire in 1 hour.
                
                If you didn't request this, please ignore this email.
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent to:', email);
        } catch (error) {
            console.error('❌ Password reset email error:', error);
        }
    }

    // Send dispute notification
    async sendDisputeNotification(userId, disputeData) {
        const user = await this.getUserDetails(userId);
        if (!user || !user.email) return;

        const mailOptions = {
            from: `"Tété Platform" <${process.env.EMAIL_USER || 'tete.lanre@gmail.com'}>`,
            to: user.email,
            subject: '⚖️ Dispute Update on Your Wager',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; }
                        .header { background: linear-gradient(135deg, #FF4500, #CC3700); padding: 30px 20px; text-align: center; }
                        .header h1 { color: #ffffff; margin: 0; font-size: 32px; }
                        .content { padding: 30px; color: #ffffff; }
                        .alert-box { background: rgba(255,69,0,0.1); border: 2px solid #FF4500; border-radius: 10px; padding: 20px; margin: 20px 0; }
                        .button { display: inline-block; padding: 15px 40px; background: linear-gradient(145deg, #FFD700, #B8860B); color: #1a1a1a; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0; }
                        .footer { padding: 20px; text-align: center; color: #888; font-size: 14px; border-top: 1px solid #333; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>DISPUTE NOTIFICATION</h1>
                        </div>
                        <div class="content">
                            <div class="alert-box">
                                <h2 style="color: #FF4500; margin-top: 0;">⚖️ Dispute Filed</h2>
                                <p>A dispute has been filed for your wager: <strong>${disputeData.wagerTitle}</strong></p>
                                <p>Amount: <strong style="color: #FFD700;">₦${disputeData.amount}</strong></p>
                                <p>Status: <strong style="color: #FF4500;">${disputeData.status}</strong></p>
                            </div>
                            
                            <p>Our Oracle system is reviewing the dispute. You will be notified once a decision is made.</p>
                            
                            <p style="color: #888;">Remember: Providing false information in disputes can result in penalties.</p>
                            
                            <div style="text-align: center;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/wager-details.html?id=${disputeData.wagerId}" class="button">View Dispute Details</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>© 2025 Game Headquarters Nigeria Limited. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Dispute notification sent to:', user.email);
        } catch (error) {
            console.error('❌ Dispute notification error:', error);
        }
    }
}

module.exports = new EmailService();