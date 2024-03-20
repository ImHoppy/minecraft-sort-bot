import { pathfinder } from 'mineflayer-pathfinder';
import {
	Bot,
	ICacheChest,
	ItemCache,
	Metadata
} from './declarations';

import { preConfigureAutoEat, configureAutoEat } from "./features/auto-eat";
import { configureAutosort, preConfigureAutosort } from "./features/auto-sort";
import { createBot } from 'mineflayer';
import { configureCome, preConfigureCome } from './features/come';
import { Movements, goals } from "mineflayer-pathfinder";
import { customMinecraftData } from "./minecraft-data";

import { config } from 'dotenv'

config();

const bot: Bot = <Bot>createBot({
	host: process.env.HOST ?? 'localhost',
	port: parseInt(process.env.HOST_PORT ?? '25565'),
	username: process.env.USERNAME ?? 'SorterBot',
});

bot.loadPlugin(pathfinder)

preConfigureAutoEat(bot);
preConfigureAutosort(bot);
preConfigureCome(bot);

bot.once('spawn', async () => {

	// @ts-ignore
	// const defaultMove = new Movements(bot, bot.mcData)

	// bot.pathfinder.setMovements(defaultMove)

	const movements = new Movements(bot, customMinecraftData);
	movements.canDig = false;
	movements.allow1by1towers = false;
	bot.pathfinder.setMovements(movements);


	configureAutoEat(bot);
	configureAutosort(bot)
	configureCome(bot);

	await bot.waitForChunksToLoad()
	await bot.waitForTicks(20)

	bot.on('messagestr', async (message: string) => {
		console.log(message)
	})

	if (process.env.USE_AUTHME === 'true') {
		bot.chat(`/login ${process.env.AUTHME_PASSWORD ?? ""}`);
	}
})
