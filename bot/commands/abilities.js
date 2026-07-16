const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const { abilities, categoryConfig, abilityUpgradeConfigs } = require('../abilities');

module.exports = {
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const subcommandGroup = interaction.options.getSubcommandGroup() || null;
        const subcommand = interaction.options.getSubcommand();
        let choices;

        if (subcommandGroup === 'upgrade') {
            // For upgrade subcommands: only show owned abilities
            const userAbilities = db.prepare('SELECT ability_id FROM user_abilities WHERE user_id = ? AND server_id = ?')
                .all(interaction.user.id, interaction.guild.id);
            const ownedIds = new Set(userAbilities.map(u => u.ability_id));
            choices = abilities.filter(a => ownedIds.has(a.id)).map(a => ({ name: a.name, value: a.id }));
        } else {
            choices = abilities.map(a => ({ name: a.name, value: a.id }));
        }

        const filtered = choices.filter(c => c.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
        await interaction.respond(filtered.map(c => ({ name: c.name, value: c.value })));
    },
    data: new SlashCommandBuilder()
        .setName('abilities')
        .setDescription('Ability management commands!')
        .addSubcommand(subcommand =>
            subcommand.setName('buy')
                .setDescription('Buy an ability!')
                .addStringOption(option =>
                    option.setName('ability')
                        .setDescription('Choose an ability to buy')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('inspect')
                .setDescription('View detailed info about an ability!')
                .addStringOption(option =>
                    option.setName('ability')
                        .setDescription('Choose an ability to inspect')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('view')
                .setDescription('List all your owned abilities!')
        )
        .addSubcommandGroup(group =>
            group.setName('upgrade')
                .setDescription('Ability upgrade commands!')
                .addSubcommand(subcommand =>
                    subcommand.setName('ability')
                        .setDescription('Upgrade one of your abilities!')
                        .addStringOption(option =>
                            option.setName('ability')
                                .setDescription('Choose an ability to upgrade')
                                .setAutocomplete(true)
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName('view')
                        .setDescription('View upgrades for one of your abilities!')
                        .addStringOption(option =>
                            option.setName('ability')
                                .setDescription('Choose an ability to view upgrades for')
                                .setAutocomplete(true)
                                .setRequired(true)
                        )
                )
        ),
    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup() || null;
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!userData) {
            await interaction.reply({ content: 'You need a profile first! Use /profile', ephemeral: false });
            return;
        }

        if (subcommand === 'view' && !subcommandGroup) {
            const userAbilities = db.prepare('SELECT ability_id FROM user_abilities WHERE user_id = ? AND server_id = ?').all(userId, serverId);
            const ownedAbilityIds = new Set(userAbilities.map(u => u.ability_id));
            const ownedAbilities = abilities.filter(a => ownedAbilityIds.has(a.id));
            if (ownedAbilities.length === 0) {
                await interaction.reply({ content: 'You don\'t own any abilities yet! Use /shop or /abilities buy to get some!', ephemeral: true });
                return;
            }
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('📜 Your Abilities');
            for (const [cat, config] of Object.entries(categoryConfig)) {
                const catAbilities = ownedAbilities.filter(a => a.category === cat);
                if (catAbilities.length > 0) {
                    embed.addFields({ name: `${config.emoji} ${cat}`, value: catAbilities.map(a => `**${a.name}**: ${a.description}`).join('\n'), inline: false });
                }
            }
            await interaction.reply({ embeds: [embed], ephemeral: false });
            return;
        }

        const abilityId = interaction.options.getString('ability');
        const ability = abilities.find(a => a.id === abilityId);
        if (!ability) {
            await interaction.reply({ content: 'Ability not found!', ephemeral: true });
            return;
        }

        if (subcommandGroup === 'upgrade' && subcommand === 'view') {
            const owned = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, abilityId);
            if (!owned) {
                await interaction.reply({ content: 'You don\'t own this ability yet!', ephemeral: true });
                return;
            }

            const upgrade = db.prepare('SELECT level FROM user_ability_upgrades WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, abilityId);
            const currentLevel = upgrade ? upgrade.level : 0;
            const config = abilityUpgradeConfigs[abilityId];

            const embed = new EmbedBuilder()
                .setColor(categoryConfig[ability.category].color)
                .setTitle(`⬆️ ${ability.name} Upgrade Progress`)
                .setDescription(`**Current Upgrade Level:** ${currentLevel}/15`)
                .addFields(
                    { name: 'Upgrade Name', value: config.label, inline: true },
                    { name: 'Current Effects', value: config.description(currentLevel), inline: false },
                    { name: 'Next Upgrade', value: currentLevel < 15 ? config.description(currentLevel + 1) : 'Maxed out!', inline: false }
                );

            await interaction.reply({ embeds: [embed], ephemeral: false });
            return;
        }

        if (subcommandGroup === 'upgrade' && subcommand === 'ability') {
            const owned = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, abilityId);
            if (!owned) {
                await interaction.reply({ content: 'You don\'t own this ability yet!', ephemeral: true });
                return;
            }

            const upgrade = db.prepare('SELECT level FROM user_ability_upgrades WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, abilityId);
            const currentLevel = upgrade ? upgrade.level : 0;
            if (currentLevel >= 15) {
                await interaction.reply({ content: 'This ability is already maxed out!', ephemeral: true });
                return;
            }

            const config = abilityUpgradeConfigs[abilityId];
            const cost = 30 + (currentLevel * 30);
            const attr = config.costType;
            const userAttrValue = userData[attr];

            if (userAttrValue < cost) {
                await interaction.reply({ content: `You don't have enough ${attr}! Need ${cost}, have ${userAttrValue}`, ephemeral: true });
                return;
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`upgrade_confirm_${abilityId}`)
                        .setLabel(`Upgrade (${cost} ${attr})`)
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`upgrade_cancel_${abilityId}`)
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            const embed = new EmbedBuilder()
                .setColor(categoryConfig[ability.category].color)
                .setTitle(`⬆️ Upgrade ${ability.name}?`)
                .setDescription(`Upgrade to Level ${currentLevel + 1}/15?\n\n**Cost:** ${cost} ${attr}\n**Current Effects:** ${config.description(currentLevel)}\n**New Effects:** ${config.description(currentLevel + 1)}`);

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

            const filter = i => i.user.id === userId;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === `upgrade_cancel_${abilityId}`) {
                    await i.update({ content: 'Upgrade cancelled!', embeds: [], components: [] });
                    collector.stop();
                    return;
                }
                if (i.customId === `upgrade_confirm_${abilityId}`) {
                    // Re-check data in case something changed
                    const freshData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
                    const freshUpgrade = db.prepare('SELECT level FROM user_ability_upgrades WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, abilityId);
                    const freshLevel = freshUpgrade ? freshUpgrade.level : 0;
                    const freshCost = 30 + (freshLevel * 30);

                    if (freshLevel >= 15 || freshData[attr] < freshCost) {
                        await i.update({ content: 'Upgrade is no longer possible!', embeds: [], components: [] });
                        collector.stop();
                        return;
                    }

                    // Deduct cost
                    db.prepare(`UPDATE users SET ${attr} = ${attr} - ? WHERE user_id = ? AND server_id = ?`).run(freshCost, userId, serverId);

                    // Update or insert upgrade level
                    if (freshUpgrade) {
                        db.prepare('UPDATE user_ability_upgrades SET level = ? WHERE user_id = ? AND server_id = ? AND ability_id = ?').run(freshLevel + 1, userId, serverId, abilityId);
                    } else {
                        db.prepare('INSERT INTO user_ability_upgrades (user_id, server_id, ability_id, level) VALUES (?, ?, ?, ?)').run(userId, serverId, abilityId, 1);
                    }

                    await i.update({ content: `🎉 Successfully upgraded ${ability.name} to Level ${freshLevel + 1}!`, embeds: [], components: [] });
                    collector.stop();
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: 'Upgrade timed out!', embeds: [], components: [] });
                }
            });

            return;
        }

        if (subcommand === 'inspect') {
            const embed = new EmbedBuilder()
                .setColor(categoryConfig[ability.category].color)
                .setTitle(`📜 ${ability.name}`)
                .setDescription(ability.description)
                .addFields(
                    { name: 'Cost', value: ability.costType === 'coins' ? `${ability.cost} coins` : `${ability.cost} ${ability.costType}`, inline: true },
                    { name: 'Cooldown', value: `${ability.cooldown / 1000} seconds`, inline: true }
                );
            await interaction.reply({ embeds: [embed], ephemeral: false });
            return;
        }

        if (subcommand === 'buy') {
            const alreadyOwned = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, abilityId);
            if (alreadyOwned) {
                await interaction.reply({ content: 'You already own this ability!', ephemeral: true });
                return;
            }

            if (ability.costType === 'coins') {
                if (userData.coins < ability.cost) {
                    await interaction.reply({ content: `You don't have enough coins! Need ${ability.cost}, have ${userData.coins}`, ephemeral: true });
                    return;
                }
                db.prepare('UPDATE users SET coins = coins - ? WHERE user_id = ? AND server_id = ?').run(ability.cost, userId, serverId);
            } else {
                const attrValue = userData[ability.costType];
                if (attrValue < ability.cost) {
                    await interaction.reply({ content: `You don't have enough ${ability.costType}! Need ${ability.cost}, have ${attrValue}`, ephemeral: true });
                    return;
                }
                db.prepare(`UPDATE users SET ${ability.costType} = ${ability.costType} - ? WHERE user_id = ? AND server_id = ?`).run(ability.cost, userId, serverId);
            }

            db.prepare('INSERT INTO user_abilities (user_id, server_id, ability_id) VALUES (?, ?, ?)').run(userId, serverId, abilityId);
            await interaction.reply({ content: `🎉 You bought ${ability.name}!`, ephemeral: false });
        }
    }
};
