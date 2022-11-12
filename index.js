const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals: { GoalGetToBlock, GoalNear, GoalFollow } } = require('mineflayer-pathfinder');

const bot = mineflayer.createBot({
  host: process.argv[2] || 'localhost',
  port: parseInt(process.argv[3]) || 25565,
  username: process.argv[4] || 'bot',
  password: process.argv[5]
})

const cache = new Set();

bot.loadPlugin(pathfinder)

bot.once('spawn', async () => {
	await bot.waitForChunksToLoad()
	bot.loadPlugin(pathfinder)
	const defaultMove = new Movements(bot)

	bot.pathfinder.setMovements(defaultMove)

	bot.on('chat', async (username, message) => {
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
	function findNearChest(blockPos) {
		console.time("findNearChest")
		let blockAt = bot.blockAt(blockPos.offset(1, 1, 0));
		if (blockAt.name != "chest")
			blockAt = bot.blockAt(blockPos.offset(-1, 1, 0));
		if (blockAt.name != "chest")
			blockAt = bot.blockAt(blockPos.offset(0, 1, 1));
		if (blockAt.name != "chest")
			blockAt = bot.blockAt(blockPos.offset(0, 1, -1));
		console.timeEnd("findNearChest")
		if (blockAt == null || blockAt.name != "chest")
			return (null);
		return blockAt;
	}
	function findAllNearChest(block) {
		let chests = [];
		let originChest = findNearChest(block.position);
		if (originChest == null)
			return null;
		do {
			chests.push(originChest);
			originChest = bot.blockAt(originChest.position.offset(0, 1, 0));
		} while (originChest != null && originChest.name == "chest");
		return chests;
	}
	var onGoal = false;
	async function GotoBlock(block) {
		if (block == null || block == undefined) return false;
		if (onGoal)
			bot.pathfinder.stop();
		onGoal = true;
		bot.pathfinder.setGoal(new GoalGetToBlock(block.position.x, block.position.y, block.position.z, 1));
		bot.chat("Goal set to " + block.position.toString())
		await bot.waitForTicks(10);
		while (onGoal) {
			await bot.waitForTicks(10);
		}
		return (true);
	};
	async function FindGotoBlock(name) {
		if (name == undefined || bot.registry.blocksByName[name] == undefined || defaultMove == null) return false;

		const ids = [bot.registry.blocksByName[name].id]

		const block = bot.findBlock({ matching: ids, maxDistance: 24, count: 1 })
		if (block == null) return false;
		if (onGoal)
			bot.pathfinder.stop();
		onGoal = true;
		bot.pathfinder.setGoal(new GoalGetToBlock(block.position.x, block.position.y, block.position.z, 1));
		bot.chat("Goal set to " + block.position.toString())
		await bot.waitForTicks(10);
		while (onGoal) {
			await bot.waitForTicks(10);
		}
		return (block);
	};
	bot.on('goal_reached', (goal) => {
		onGoal = false;
		bot.chat("Goal reached")
	});
	async function WithdrawAllFromChest(block) {
		let chest = await bot.openChest(block);
		let containerItems = chest.containerItems();
		let len = containerItems.length;
		// console.log(len, containerItems, chest.slots)
		for (let index = 0; index < len; index++) {
			const element = containerItems[index];
			if (element != null)
			{
				// Check if bot has space in inventory
				if (bot.inventory.firstEmptyInventorySlot() != null)
				{
					await chest.withdraw(element.type, element.metadata, element.count);
					// await bot.waitForTicks(10);
				}
				else
				{
					bot.chat("Inventory full");
					break;
				}
				// await chest.withdraw(element.type, element.metadata, element.count);
			}
		}
		chest.close();
	}
	async function DepositItemToChest(block, item) {
		let chest = await bot.openChest(block);
		let emptySlot = chest.firstEmptyContainerSlot()
		console.log("DepositItemToChest", emptySlot);
		if (emptySlot != null)
		{
			for (let index = 0; index < 36; index++) {
				const element = bot.inventory.slots[index];
				if (element != null && element.type == item.type)
				{
					await chest.deposit(element.type, element.metadata, element.count);
					emptySlot = chest.firstEmptyContainerSlot();
					if (emptySlot == null)
						break;
				}
			}
		}
		chest.close();
		return (emptySlot != null);
	}
})

bot.on("blockUpdate", (oldBlock, newBlock) => {
	
	// Delete chest from cache
	if (oldBlock.name != "chest") return;
	let cacheElement = cache.find(e => e.chests[oldBlock.position] != null);
	// Add chest to cache
	if (newBlock.name != "chest") return;
})
bot.on('mount', () => {
	bot.chat(`mounted ${bot.vehicle.objectType}`)
})

bot.on('dismount', (vehicle) => {
	bot.chat(`dismounted ${vehicle.objectType}`)
})