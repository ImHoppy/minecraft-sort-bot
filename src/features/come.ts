import { Movements, goals } from "mineflayer-pathfinder";
import { Bot } from "../declarations";

export function preConfigureCome(bot: Bot) {
}

export function configureCome(bot: Bot) {
    
    bot.addChatPattern(
        'come',
        new RegExp('come'),
    )
    bot.on('chat:come', async () => {
            let target: any = null;
            const targetUsername = process.env.BOT_MASTER;
            if (!targetUsername) {
                return;
            }
            target = bot.players[targetUsername]?.entity;

            if (!target) {
                await bot.chat(`On ne peux pas trouver "${targetUsername}", desolé.`)
                return;
            }

            bot.pathfinder.setGoal(new goals.GoalFollow(target, 3), true);
    })
}
