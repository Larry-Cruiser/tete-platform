const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const emailService = require('../services/emailService');
const { validateAge } = require('../middleware/validation');

class AuthController {
    async register(req, res) {
        try {
            const { email, username, password, dateOfBirth } = req.body;

            // Validate age
            const age = validateAge(dateOfBirth);
            if (age < 18) {
                return res.status(400).json({ 
                    error: 'You must be 18 or older to use Tété.' 
                });
            }

            // Check if email or username exists
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('id')
                .or(`email.eq.${email},username.eq.${username}`)
                .single();

            if (existingUser) {
                return res.status(400).json({ 
                    error: 'Email or username already exists' 
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);
            const verificationToken = crypto.randomBytes(32).toString('hex');

            // Create user
            const { data: newUser, error } = await supabaseAdmin
                .from('users')
                .insert({
                    email,
                    username: username.toLowerCase(),
                    password_hash: passwordHash,
                    date_of_birth: dateOfBirth,
                    email_verification_token: verificationToken
                })
                .select()
                .single();

            if (error) {
                console.error('Registration error:', error);
                return res.status(500).json({ error: 'Failed to create account' });
            }

            // Send verification email
            await emailService.sendVerificationEmail(email, verificationToken);

            res.status(201).json({
                message: 'Account created successfully! Please check your email to verify your account.',
                userId: newUser.id
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    async login(req, res) {
        try {
            const { emailOrUsername, password } = req.body;

            // Find user by email or username
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('*, wallets(*)')
                .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
                .single();

            if (error || !user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check if email is verified
            if (!user.email_verified) {
                return res.status(403).json({ 
                    error: 'Please verify your email before logging in' 
                });
            }

            // Check account status
            if (user.status !== 'active') {
                return res.status(403).json({ 
                    error: `Account is ${user.status}` 
                });
            }

            // Update last active
            await supabaseAdmin
                .from('users')
                .update({ last_active: new Date().toISOString() })
                .eq('id', user.id);

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Remove sensitive data
            delete user.password_hash;
            delete user.email_verification_token;

            res.json({
                message: 'Login successful',
                token,
                user
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    async verifyEmail(req, res) {
        try {
            const { token } = req.body;

            // Find user with token
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email_verification_token', token)
                .single();

            if (error || !user) {
                return res.status(400).json({ error: 'Invalid verification token' });
            }

            // Update user
            await supabaseAdmin
                .from('users')
                .update({
                    email_verified: true,
                    email_verification_token: null
                })
                .eq('id', user.id);

            res.json({ message: 'Email verified successfully! You can now log in.' });

        } catch (error) {
            console.error('Verification error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const updates = req.body;

            // Validate bank account if provided
            if (updates.bank_account_number) {
                // Check if bank account is already in use
                const { data: existingAccount } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('bank_account_number', updates.bank_account_number)
                    .neq('id', userId)
                    .single();

                if (existingAccount) {
                    return res.status(400).json({ 
                        error: 'This bank account is already registered to another user' 
                    });
                }
            }

            // Update user profile
            const { data: updatedUser, error } = await supabaseAdmin
                .from('users')
                .update({
                    ...updates,
                    profile_completed: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            delete updatedUser.password_hash;
            res.json({
                message: 'Profile updated successfully',
                user: updatedUser
            });

        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
}

module.exports = new AuthController();