import { Vec3 } from "vec3"
// import { Entity } from "prismarine-entity";
import { Entity } from "prismarine-entity";
import { Block } from "prismarine-block";

import * as mineflayer from "mineflayer"
// import { pathfinder, Movements } from "mineflayer-pathfinder";

const { pathfinder, Movements, goals: { GoalGetToBlock, GoalNear, GoalFollow } } = require('mineflayer-pathfinder');

const bot = mineflayer.createBot({
  host: process.argv[2] || 'localhost',
  port: parseInt(process.argv[3]) || 25565,
  username: process.argv[4] || 'bot',
  password: process.argv[5]
})

interface ItemCache {
	present: boolean;
	id: number;
}
interface CacheChest {
	item: ItemCache;
	pos: Vec3;
	chests?: Array<Vec3>;
}

const caches = new Set<CacheChest>();

bot.loadPlugin(pathfinder)

bot.once('spawn', async () => {
	await bot.waitForChunksToLoad()
	bot.loadPlugin(pathfinder)
	const defaultMove = new Movements(bot)

	// @ts-expect-error
	bot.pathfinder.setMovements(defaultMove)

	bot.on('chat', async (username: string, message: string) => {
		if (username === bot.username) return

		switch (message.split(' ')[0]) {
			case 'stop':
				bot.clearControlStates()
				break
			case 'tri':
			{
				
			} break;
		}
	})

})

enum Rotation {
	Down	= 0,
	Up		= 1,
	North	= 2,
	South	= 3,
	West	= 4,
	East	= 5
}

const getChestNearest = (itemFrame: Entity): Block | null => {
	let chest: Block | null = null;
	// @ts-expect-error
	let rotation: Number = itemFrame.objectData;
	const isUpOrDown = ():boolean => {return rotation == Rotation.Up || rotation == Rotation.Down};
	if (rotation == Rotation.West || isUpOrDown())
		chest = bot.blockAt(itemFrame.position.offset(1, 0, 0), false);
	if ((chest == null || chest.name != "chest") && (rotation == Rotation.East || isUpOrDown()))
		chest = bot.blockAt(itemFrame.position.offset(-1, 0, 0), false);
	if ((chest == null || chest.name != "chest") && (rotation == Rotation.North || isUpOrDown()))
		chest = bot.blockAt(itemFrame.position.offset(0, 0, 1), false);
	if ((chest == null || chest.name != "chest") && (rotation == Rotation.South || isUpOrDown()))
		chest = bot.blockAt(itemFrame.position.offset(0, 0, -1), false);
	if (chest == null || chest.name != "chest")
		return (null);
	return (chest);
};

function getAllChest(originChest: Block | null) {
	let chests: Block[] = [];
	if (originChest == null) return null;
	do {
		chests.push(originChest);
		originChest = bot.blockAt(originChest.position.offset(0, 1, 0), false);
	} while (originChest != null && originChest.name == "chest");
	return chests;
}

// bot.on("entitySpawn", (entity) => {
// 	if (entity.name?.toLowerCase() != "item_frame") return;
// 	if (entity == null) return;
// 	let chest = getChestNearest(entity);
// 	if (chest == null) {console.log("Chest not found"); return;}
// 	// { present: true, itemId: 28, itemCount: 1, nbtData: undefined },
// });
bot.on("entityGone", (entity) => {
	if (entity == null) return;
	if (entity.name != "item_frame") return;

	let metadata: metadata = entity.metadata.slice(-2)[0] as metadata;
	let cache: CacheChest = { item: {present: metadata.present, id: metadata.itemId}, pos: entity.position };

	caches.forEach((element) => {
		if (element.pos == cache.pos) //&& (!element.item.present || element.item.id == cache.item.id))
			caches.delete(element)
	});
	console.log(caches);
	console.log("Entity dead");
	// console.log("Entity dead", entity);
});
interface metadata {
	present: boolean;
	itemId: number;
	itemCount: number;
	nbtData: number;
}
bot.on("entityUpdate", (entity: Entity) => {
	if (entity == null) return;
	if (entity.name != "item_frame") return;
	let chests = getAllChest(getChestNearest(entity)); // NOTE: Dont do this when entity exist already
	if (chests == null) return;

	let chestsPosition = chests.map(chest => { return chest.position });
	let metadata: metadata = entity.metadata.slice(-2)[0] as metadata;
	let cache: CacheChest = { item: {present: metadata.present, id: metadata.itemId}, pos: entity.position, chests: chestsPosition };
	let AlreadyExist: boolean = false;
	caches.forEach((element) => {
		if (element.pos == cache.pos) //&& (!element.item.present || element.item.id == cache.item.id))
		{
			element.item = cache.item
			element.chests = cache.chests
			AlreadyExist = true;
		}
	});
	console.log(AlreadyExist)
	if (!AlreadyExist)
		caches.add(cache);
	console.log(caches)
	console.log("Entity updated");
});

// bot.on("entityGone", (ent: Entity) => {
// 	if (ent == null) return;
// 	if (ent.name != "item_frame") return;
// 	console.log("Item drop", ent);
// });


const equalsXZ = function (a: Vec3, b: Vec3) {
	return a.x == b.x && a.z == b.z;
}

bot.on("blockUpdate", (oldBlock: Block | null, newBlock: Block): void | Promise<void> => {
	
	if (oldBlock != null && oldBlock.name == "chest") {
		caches.forEach((element) => {
			if (element.chests != null)
				element.chests = element.chests.filter((chest) => !chest.equals(oldBlock.position));
		});
	}
	if (newBlock.name == "chest") {
		console.log(newBlock.getProperties().type)
		caches.forEach((element) => {
			if (element.chests != undefined)
			{
				if (equalsXZ(element.chests[0], newBlock.position) && element.chests.some((chest) => { return chest.equals(newBlock.position.offset(0, -1, 0)) }))
					element.chests?.push(newBlock.position);
			}
		});
	}
})