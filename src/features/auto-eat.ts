import { Bot } from "../declarations";
import { plugin as autoEat } from "mineflayer-auto-eat";


export function preConfigureAutoEat(bot: Bot) {
    bot.loadPlugin(autoEat)
}

export function configureAutoEat(bot: Bot) {

    bot.on('autoeat_started', (item, offhand) => {
        console.log(`Eating ${item.name} in ${offhand ? 'offhand' : 'hand'}`)
    })
    
    bot.on('autoeat_finished', (item, offhand) => {
        console.log(`Finished eating ${item.name} in ${offhand ? 'offhand' : 'hand'}`)
    })
    
    bot.on('autoeat_error', console.error)
} 
