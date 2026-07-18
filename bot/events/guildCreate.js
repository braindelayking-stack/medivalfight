
const { Events, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        console.log(`Joined new guild: ${guild.name} (ID: ${guild.id})`);

        // Try to find a channel to send the welcome message
        let channel = guild.systemChannel;
        if (!channel || !channel.permissionsFor(guild.members.me).has('SendMessages')) {
            // If no system channel or can't send messages, find the first text channel we can send to
            channel = guild.channels.cache.find(c => 
                c.type === ChannelType.GuildText && 
                c.permissionsFor(guild.members.me).has('SendMessages')
            );
        }

        if (!channel) {
            console.log(`Could not find a channel to send welcome message to in ${guild.name}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('⚔️ Medieval Fight Bot is here!')
            .setColor('#ffd700')
            .setDescription('Thanks for inviting Medieval Fight Bot! Here\'s how to get started:')
            .addFields(
                { name: '1. Set up tracked channels', value: 'Go to the [dashboard](https://medivalfight.alwaysdata.net) to set which channels give you points for chatting!', inline: false },
                { name: '2. Create a profile', value: 'Use `/profile` to make your character!', inline: false },
                { name: '3. Start chatting!', value: 'Send messages to earn stat points!', inline: false },
                { name: '4. Fight a boss', value: 'Use `/boss fight` to battle bosses for coins and items!', inline: false },
                { name: 'Need help?', value: 'Use `/help` to see all commands!', inline: false }
            )
            .setFooter({ text: 'Have fun! - phantom' });

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(`Error sending welcome message to ${guild.name}:`, err);
        }
    },
};

