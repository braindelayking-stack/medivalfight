
const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found for autocomplete.`);
                return;
            }
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(error);
            }
        } else if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            // Check profile command buttons first
            const profileCommand = interaction.client.commands.get('profile');
            if (profileCommand && profileCommand.handleButton) {
                try {
                    await profileCommand.handleButton(interaction);
                    return;
                } catch (error) {
                    console.error(error);
                }
            }
            // Check boss command buttons
            const bossCommand = interaction.client.commands.get('boss');
            if (bossCommand && bossCommand.handleButton) {
                try {
                    await bossCommand.handleButton(interaction);
                } catch (error) {
                    console.error(error);
                }
            }
        }
    },
};
