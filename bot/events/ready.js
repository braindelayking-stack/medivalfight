
const { Events, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        
        // Check for unsent feedback every 10 seconds
        setInterval(async () => {
            try {
                // Get unsent feedback
                const unsentFeedback = db.prepare("SELECT * FROM feedback WHERE sent = 0").all();
                
                if (unsentFeedback.length === 0) return;
                
                // Get the feedback channel
                const channelId = '1527647475215896776';
                const channel = await client.channels.fetch(channelId);
                if (!channel) {
                    console.error(`Could not find feedback channel ${channelId}`);
                    return;
                }
                
                // Send each feedback
                for (const feedback of unsentFeedback) {
                    try {
                        const embed = new EmbedBuilder()
                            .setTitle('📝 New Feedback Received!')
                            .setColor('#ffd700')
                            .addFields(
                                { name: 'User', value: `${feedback.username} (ID: ${feedback.user_id})`, inline: true },
                                { name: 'Feedback', value: feedback.feedback_text }
                            )
                            .setTimestamp(new Date(feedback.created_at));
                        
                        await channel.send({ embeds: [embed] });
                        
                        // Mark as sent
                        db.prepare("UPDATE feedback SET sent = 1 WHERE id = ?").run(feedback.id);
                        console.log(`Sent feedback ${feedback.id}`);
                    } catch (err) {
                        console.error(`Error sending feedback ${feedback.id}:`, err);
                    }
                }
            } catch (err) {
                console.error('Error checking feedback:', err);
            }
        }, 10000); // 10 seconds
    },
};
