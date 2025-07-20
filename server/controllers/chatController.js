const { supabaseAdmin } = require('../config/supabase');

class ChatController {
    async sendMessage(req, res) {
        try {
            const userId = req.user.id;
            const { wagerId } = req.params;
            const { message } = req.body;

            // Verify user is part of the wager
            const { data: wager, error: wagerError } = await supabaseAdmin
                .from('wagers')
                .select('creator_id, joiner_id, chat_enabled')
                .eq('id', wagerId)
                .single();

            if (wagerError || !wager) {
                return res.status(404).json({ error: 'Wager not found' });
            }

            if (!wager.chat_enabled) {
                return res.status(403).json({ error: 'Chat is disabled for this wager' });
            }

            if (userId !== wager.creator_id && userId !== wager.joiner_id) {
                return res.status(403).json({ error: 'Not authorized to send messages' });
            }

            // Create message
            const { data: chatMessage, error } = await supabaseAdmin
                .from('chat_messages')
                .insert({
                    wager_id: wagerId,
                    sender_id: userId,
                    message: message.trim(),
                    is_system_message: false
                })
                .select('*, sender:users!sender_id(id, username, avatar_url)')
                .single();

            if (error) {
                return res.status(500).json({ error: 'Failed to send message' });
            }

            res.json({ message: chatMessage });

        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    async getMessages(req, res) {
        try {
            const userId = req.user.id;
            const { wagerId } = req.params;
            const { page = 1, limit = 50 } = req.query;

            // Verify user is part of the wager
            const { data: wager } = await supabaseAdmin
                .from('wagers')
                .select('creator_id, joiner_id')
                .eq('id', wagerId)
                .single();

            if (!wager || (userId !== wager.creator_id && userId !== wager.joiner_id)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const offset = (page - 1) * limit;

            const { data: messages, error, count } = await supabaseAdmin
                .from('chat_messages')
                .select(`
                    *,
                    sender:users!sender_id(id, username, avatar_url)
                `, { count: 'exact' })
                .eq('wager_id', wagerId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                return res.status(500).json({ error: 'Failed to fetch messages' });
            }

            res.json({
                messages: messages.reverse(), // Return in chronological order
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            console.error('Get messages error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
}

module.exports = new ChatController();