Hello, build me a discord bot that does the following things: 
I want the bot to first have message content intent enabled so that it can see all the messages that are currently being sent in a server. 
Then the bot should read all messages currently being sent in the server. When it reads the messages it should determin long messages vs short messages vs medium messages. 
A long message is 75+ words (assuming one word is about 4 charachters), a short message is 50 words or less, and a medium message is between 50 and 75 words.
And depending on the length of the message the bot should the assign the user certain stat points, how do they work ? 
It works like this. 
At the start each user needs to create his profile using /profile and then has  0 points.
When using /profile the user can see his points and stats and click a + button next to the stat and upgrade it with the points.
For each long message the user gets 10 point points.
For each short message the user gets 1 points.
For each medium message the user gets 5 point points.
Those points can be distributet towards those stats : 
stregth 
wealth 
health 
agility 
composure 
On the dashboard users should be able to change stuff like pfp and name too. So ingame he is called Iron warrior if he wants and has iron man pfp even though thats not his discord one. 
Now users can battle each other using the command /battle user: (user name / id) 
And the users gets tagged in the channel were the battel and he needs to accept the battle.When accepted the battle starts. 
But how do they fight ? 
Here is how 
There is at the start a huge screen were you can see both users health points (the points of health they have invested into the stat health) and there charachter which is simply there pfp but a bit adjusted so it fits onto the menu. 
And then there are different attack defenses and special one can unlock. 
And this is how they work.  
You have a /shop command where you can buy those defenses and special attacks using your stats meaning if you have 50 stregth one of the stregth attack that requires 50 stregth, then your stregth gets reset to 0, if you only had 50 stregth. And there are different stuff you can buy with stregth , wealth , health , agility , composure.
Health isnt in the shop though but determins how much damage one can take before dying. 
When someone buys one of the attacks or defesnes related to some of the stats the bot adds them to the database whitelisting him to use the command related to that attack so lets say i buy the attack that costs 50 stregthn and is called apple damage I get acces to using /apple damage during a fight, fights arent turn based but cmds have cooldown each cmd that is related to having bough it in the ship for stats has a 3s cooldown before being able to use it again. 
Now here are the different commands what they do and how much of what stat they cost : 

# Stregth weak attack :
fire attack (10 stregth): shoot a fireball (fire animation when it happens), does 10 damage to the opponent (cooldown 3s)
water attack (10 stregth): shoot a waterball (water animation when it happens), does 10 damage to the opponent (cooldown 3s)
earth attack (10 stregth): shoot a earthball (earth animation when it happens), does 10 damage to the opponent (cooldown 3s)
air attack (10 stregth): shoot a airball (air animation when it happens), does 10 damage to the opponent (cooldown 3s)
# wealth weak bribe :
sacrifice (10 wealth): spend x amount of wealth points using /sacrifice amount:10 to gain more health mid fight (cooldown 3s)
# agility weak defense :
dodge (10 agility): dodge the next opponent attack with 30% succes rate (cooldown 3s)
attack boost (10 agility): boost the next attack damage by 10% (cooldown 3s)
# composure weak defense :
composure (10 composure): reduce the damage taken by 10% if on low health points (below 20%) (cooldown 3s)
# Health points: 
Those are the points of health you have invested into the stat health and the amount of damage you can take before dying / losing the battle.

Those are the basic attack we can expand later. 
When winning a battle a user gets 10 coins he can spend in a shop to buy stuff ( more on that later)
And after each round your health restores again obviously.

Next to the normal player fights there are boss fights, each boss has a different stat and 3 different attacks 

Currently were going to have 3 bosses: 
**Monster 1:**
Name: Golem
Health points: 100  
Attack name : Golem attack
Effect : does 10 damage to the opponent
Poison attack : does 5 damage to the opponent for 3 seconds 5dmg/second
Shield: 10% chance to block the next attack 
Every three seconds the boss uses one of the attacks above. Golem attack is used with a 60% chance. Shield with a 30% chance and Poison attack with a 10% chance.
**Monster 2:**
Name: Dragon
Health points: 100  
Attack name : Dragon attack
Effect : does 20 damage to the opponent
Fire attack : does burns the oppenont making him take 50% more damage for 10seconds
Shield: 10% chance to block the next attack 
Every three seconds the boss uses one of the attacks above. Dragon attack is used with a 60% chance. Fire attack with a 30% chance and Shield with a 10% chance.
**Monster 3:**
Name: Skeleton
Health points: 100  
Attack name : Skeleton attack
Effect : does 15 damage to the opponent
Shield: 10% chance to block the next attack 
Skeleton army: Sends an army of skeletons to hold you making you unable to use any of your attacks or defense cmds while they are dealing 1dmg / second
lasts 5seconds 
Every three seconds the boss uses one of the attacks above. Skeleton attack is used with a 60% chance. Shield with a 35% chance and Armee with a 5% chance.

Each boss fight win gives you 100 coins 

# Dashboard
Through the dashboard ppl can configure there username and profile picture for the game. Everybody is required to log in using discord when they open the dashboard. 
From there they can choose 
Manage profile: 
Here they get to change their username and profile picture as well as see their stats , how many players the beat how many bosses the beat how many coins they have.
Manage server: 
Here they get to manage the server where the game is played.
So the bot checks for all server they have manage server permissions in and lets them choose which one to manage.
When managing they can setup a role shop where players can buy roles for coins. So a role shop players can open using /role-shop. 
Each server gets 10 role slots so 10 different roles can be bought. 

Last but not least the /leaderboard option: command
this is a command everyone can use the options are: 
coins: 
shows the leaderboard of the coins each player has
meaning player with most coins is place 1 also note that the leaderboard is updated every 10 seconds and is server wide not global. 
Win count: 
shows the leaderboard of the win count each player has
meaning player with most wins is place 1 also note that the leaderboard is updated every 10 seconds and is server wide not global.
Most total points spent: 
This shows the players who have accumalated and / or spent most poins on stats. 
meaning player with most points spent is place 1 also note that the leaderboard is updated every 10 seconds and is server wide not global.

Also all leaderboards only show the top 10 players in this category.

P.S. Performance & Mechanics Notes:Database Optimization: To prevent database lag during high-speed combat, all 3-second ability and attack cooldowns must be tracked locally in the bot's system memory (RAM). Only save the final results (such as won coins and status changes) to the database once the battle concludes.Boss Fight Message Layout: To avoid spamming the chat channels, the boss's automated actions (every 3 seconds) and the player's rapid attacks must not send new messages. Instead, the bot must dynamically edit a single, primary embed message to show the ongoing damage and status updates in real time.