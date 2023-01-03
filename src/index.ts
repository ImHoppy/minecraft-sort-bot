import { Vec3 } from "vec3"
// import { Entity } from "prismarine-entity";
import { Entity } from "prismarine-entity";
import { Block } from "prismarine-block";
import { Item } from "prismarine-item";

import * as mineflayer from "mineflayer"
// import { pathfinder, Movements } from "mineflayer-pathfinder";
import {} from "mineflayer-pathfinder";
import { pathfinder, Movements, goals} from "mineflayer-pathfinder";
import { IndexedData } from "minecraft-data";

// import autoeat from "mineflayer-auto-eat";
const autoeat = require('mineflayer-auto-eat').default

// @ts-nocheck

// const { pathfinder, Movements, goals: { GoalGetToBlock, GoalNear, GoalFollow } } = require('mineflayer-pathfinder');

interface AutoEatOptions {
    priority: 'saturation' | 'foodPoints';
    startAt: number;
    bannedFood: string[];
    eatingTimeout: number;
    ignoreInventoryCheck: boolean;
    checkOnItemPickup: boolean;
    useOffhand: boolean;
    equipOldItem: boolean;
}
interface AutoEat {
	disabled: boolean;
	isEating: boolean;
	options: Partial<AutoEatOptions>;
	eat: (offhand?: boolean) => Promise<void>;
	disable: () => void;
	enable: () => void;
};
type Bot = mineflayer.Bot & {
	pathfinder: any;
	autoEat: AutoEat;
	registry: any;
}
interface ItemCache {
	present: boolean;
	id: number;
}
interface CacheChest {
	item: ItemCache;
	pos: Vec3;
	chests?: Array<Vec3>;
}
interface metadata {
	present: boolean;
	itemId: number;
	itemCount: number;
	nbtData: number;
}
const bot: Bot = <Bot>mineflayer.createBot({
	host: process.argv[2] || 'localhost',
	port: parseInt(process.argv[3]) || 25565,
	username: process.argv[4] || 'bot',
	password: process.argv[5]
});

const caches = new Array<CacheChest>();

bot.loadPlugin(pathfinder)
bot.loadPlugin(autoeat)

bot.once('spawn', async () => {

	bot.autoEat.options = {
		useOffhand: true,
        bannedFood: ['golden_apple', 'enchanted_golden_apple', 'rotten_flesh']
    }

	await bot.waitForChunksToLoad()
	const defaultMove = new Movements(bot)

	bot.pathfinder.setMovements(defaultMove)

	bot.on('chat', async (username: string, message: string) => {
		if (username === bot.username) return

		switch (message.split(' ')[0]) {
			case 'stop':
				bot.clearControlStates()
				break
			case 'tri':
			{
				for (let index = bot.inventory.inventoryStart; index < bot.inventory.inventoryEnd; index++) {
					const element = bot.inventory.slots[index];
					console.log(element);
				}
				console.log(bot.inventory.inventoryEnd, bot.inventory.inventoryStart);
				bot.transfer({
					window: bot.inventory,
					itemType: bot.registry.itemsByName['cooked_beef'].id,
					metadata: null,
					sourceStart: 36,
					sourceEnd: 36,
					destStart: 45,
					destEnd: 45
				});
			} break;
		}
	})
	enum BotStatus {
		Idle = 0,
		Working = 1
	}
	let status: BotStatus = BotStatus.Idle
	setInterval(async () => {
		if (bot.pathfinder.isMoving() || status != BotStatus.Idle) return;
		status = BotStatus.Working;
		let InvalidItem: Item[] = [];
		bot.setQuickBarSlot(0);
		let barrel = await FindGotoBlock("barrel");
		if (barrel == null)
			return;
		await WithdrawAllFromBlock(barrel);

		// NOTE: Seperate function
		let botInventory = bot.inventory.items();
		for (let indexInv = bot.inventory.inventoryStart; indexInv < bot.inventory.inventoryEnd; indexInv++) {
			const item = bot.inventory.slots[indexInv];
			if (item == null)
				continue;

			// Check if item.type is already in InvalidItem
			if (InvalidItem.find((e) => e.type == item.type) != undefined)
			{
				InvalidItem.push(item);
				continue;
			}
			// console.log(caches)
			let cachesItem = caches.filter(e => e.item.id == item.type);
			let cacheItem = cachesItem[0]; 
			if (cacheItem == undefined || cacheItem.chests == undefined || !cacheItem.chests.length) {
				InvalidItem.push(item);
				continue;
			}
			await GotoVec(cacheItem.pos);
			for (let indexChest = 0; indexChest < cacheItem.chests.length; indexChest++) {
				const chest = cacheItem.chests[indexChest];
				let chestBlock = bot.blockAt(chest);
				if (chestBlock == null)
					continue;
				const chestIsEmpty = await DepositItemToChest(chestBlock, item);
				console.log(item.name, chestIsEmpty);
				if (!chestIsEmpty)
					break;
			}
			if (bot.inventory.slots[indexInv] != null)
				InvalidItem.push(bot.inventory.slots[indexInv]);
		}
		if (InvalidItem.length != 0)
		{
			// NOTE: Deposite all invaliditem to barrel maybe set to Config.InvalidChest
			await GotoVec(barrel?.position);
			const barrelContainer = await bot.openChest(barrel);
			// For invalid item
			for (let index = 0; index < InvalidItem.length; index++) {
				const item = InvalidItem[index];
				try {
					await barrelContainer.deposit(item.type, null, item.count);
				} catch (error) {
					console.log("Chest full InvalidItemToBarrel");
					break;
				}
			}
			// TODO: Close before finish to deposit ???
			barrelContainer.close();
		}

		status = BotStatus.Idle;
	}, 10000);

	// console.log(bot.inventory)
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

	// Remove the CacheChest if pos is the same as cache.pos
	caches.forEach((cacheChest, index) => {
		// if (cacheChest.pos.equals(cache.pos)) { // NOTE: maybe equals because its the same memory address ?
		if (cacheChest.pos == cache.pos) {
			caches.splice(index, 1);
		}
	});
	console.log("Entity dead");
});

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
		// if (cacheChest.pos.equals(cache.pos)) { // NOTE: maybe equals because its the same memory address ?
		if (element.pos == cache.pos) //&& (!element.item.present || element.item.id == cache.item.id))
		{
			element.item = cache.item
			element.chests = cache.chests
			AlreadyExist = true;
		}
	});
	if (!AlreadyExist)
		caches.push(cache);
	console.log("Entity updated");
});

bot.on("blockUpdate", (oldBlock: Block | null, newBlock: Block): void | Promise<void> => {
	if (oldBlock?.name == "chest" && newBlock?.name == "chest") return;
	if (oldBlock != null && oldBlock.name == "chest") {
		caches.forEach((element) => {
			if (element.chests != null)
				element.chests = element.chests.filter((chest) => !chest.equals(oldBlock.position));
		});
		console.log("old chest updated");
	}
	if (newBlock.name == "chest") {
		console.log(newBlock.getProperties().type)
		caches.forEach((element) => {
			if (element.chests != undefined && element.chests[0] != undefined)
			{
				if (equalsXZ(element.chests[0], newBlock.position) && element.chests.some((chest) => { return chest.equals(newBlock.position.offset(0, -1, 0)) }))
					element.chests?.push(newBlock.position);
			}
		});
		console.log("new chest updated");
	}
})


let onGoal = false
bot.on("goal_reached", (goal) => {
	onGoal = false;
	console.log("Goal reached")
});

const equalsXZ = function (a: Vec3, b: Vec3) {
	return a.x == b.x && a.z == b.z;
}

async function GotoBlock(block: Block) {
	if (block == null) return false;
	if (block.position.distanceTo(bot.entity.position) < 5) return block;
	if (onGoal)
		bot.pathfinder.stop();
	onGoal = true;
	bot.pathfinder.setGoal(new goals.GoalGetToBlock(block.position.x, block.position.y, block.position.z));
	console.log("Goal set to " + block.position.toString())
	do {
		await bot.waitForTicks(10);
	} while (onGoal)
	return (true);
};

async function GotoVec(pos: Vec3) {
	if (pos == null) return false;
	if (pos.distanceTo(bot.entity.position) < 5) return pos;
	if (onGoal)
		bot.pathfinder.stop();
	onGoal = true;
	bot.pathfinder.setGoal(new goals.GoalGetToBlock(pos.x, pos.y, pos.z));
	console.log("Goal set to " + pos.toString())
	do {
		await bot.waitForTicks(10);
	} while (onGoal)
	return (true);
};

async function FindGotoBlock(name: string) {
	
	const botPos = bot.entity.position;
	if (botPos == undefined) return null;
	
	if (name == undefined || bot.registry.blocksByName[name] == undefined) return null;
	const ids = [bot.registry.blocksByName[name].id]

	const block = bot.findBlock({ matching: ids, maxDistance: 24, count: 1 })
	if (block == null) return null;
	await GotoBlock(block);
	return (block);
};

async function WithdrawAllFromBlock(block: Block) {
	if (block.name == "chest") return;
	let chest = await bot.openChest(block);
	let containerItems = chest.containerItems();
	let len = containerItems.length;
	// console.log(len, containerItems, chest.slots)
	for (let index = 0; index < len; index++) {
		const element = containerItems[index];
		if (element != null)
		{
			try {
				await chest.withdraw(element.type, element.metadata, element.count);
			} catch (error) {
				bot.chat("Inventory full");
				break;					
			}
			// await chest.withdraw(element.type, element.metadata, element.count);
		}
	}
	chest.close();
}

// Return true is full
async function DepositItemToChest(block: Block, item: Item) {
	let chest = await bot.openChest(block);
	if (chest == null) return false;
	let chestIsFull = false;
	const inv = bot.inventory.items().filter((element) => element.name == item.name);
	for (let index = 0; index < inv.length; index++) {
		const element = inv[index];
		if (element != null && element.type == item.type)
		{
			try {
				await chest.deposit(element.type, element.metadata, element.count);
			} catch (error) {
				console.log("Chest full DepositItemToChest");
				chestIsFull = true;
				break;
			}
		}
		if (chestIsFull) break;
	}
	chest.close();
	// console.log(emptySlot, emptySlot != null)
	return (!chestIsFull);
}