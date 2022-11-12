const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals: { GoalGetToBlock, GoalNear, GoalFollow } } = require('mineflayer-pathfinder');
const { textSpanContainsPosition } = require('typescript');


// if (process.argv.length < 4 || process.argv.length > 6) {
// 	console.log('Usage : node jumper.js <host> <port> [<name>] [<password>]')
// 	process.exit(1)
// }
const bot = mineflayer.createBot({
  host: process.argv[2] || 'localhost',
  port: parseInt(process.argv[3]) || 25565,
  username: process.argv[4] || 'bot',
  password: process.argv[5]
})

let target = null

let cache = [];

bot.loadPlugin(pathfinder)

bot.once('spawn', async () => {
	await bot.waitForChunksToLoad()
	bot.loadPlugin(pathfinder)
	const defaultMove = new Movements(bot)
	// defaultMove.canDig = true;
	// defaultMove.allowFreeMotion = true;
	// defaultMove.allowParkour = true;
	// defaultMove.allowSprinting = true;

	bot.pathfinder.setMovements(defaultMove)
	// setInterval(watchTarget, 50);
	// setInterval(HugNearPlayer, 500)
	// GotoBlock("barrel");

	bot.on('chat', async (username, message) => {
		if (username === bot.username) return
		target = bot.players[username].entity
		let entity

		switch (message.split(' ')[0]) {
	//forward back left right sprint jump
			case 'stop':
				bot.clearControlStates()
				break
			case 'attack':
				entity = bot.nearestEntity()
				if (entity) {
				var counter = 0;
	
					bot.attack(entity, true)
				// var looper = setInterval(function(){ 
				// 	counter++;
				// 	if (counter >= 5)
				// 		clearInterval(looper);
	
				// }, 500);
				} else {
					bot.chat('no nearby entities')
				}
				break
			case 'tri':
			{
				let InvalidItem = [];
				bot.setQuickBarSlot(0);
				let barrel = await FindGotoBlock("barrel");
				if (barrel == false)
					return;
				await WithdrawAllFromChest(barrel);
				let botInventory =  bot.inventory.items();
				for (let index = 0; index < botInventory.length; index++) {
					const itemElement = botInventory[index];
					if (itemElement.name == "air")
						continue;
					// await bot.moveSlotItem(itemElement.slot, 36);
					// Check if itemElement name is in cache
					// console.log("To find :", itemElement.name);
					let block = cache.find(e => e.block.name == itemElement.name);
					if (block == undefined)
					{
						console.time("Finding@"+itemElement.name);
						let findBlock = null;
						{
							const listBlocks = bot.findBlocks({
								matching: (block) => {
									return (block.name == itemElement.name);
								},
								useExtraInfo: false,
								point: barrel.position,
								maxDistance: 32,
								count: 16
							});
							for (let index = 0; index < listBlocks.length; index++) {
								const element = listBlocks[index];
								if (findNearChest(element) != null)
								{
									findBlock = bot.blockAt(element);
									break;
								}
							}
						}
						console.timeEnd("Finding@"+itemElement.name);
						// console.log(findBlock?.name);
						if (findBlock == null)
						{
							InvalidItem.push(itemElement);
							console.log("Invalid Item: " + itemElement.name);
							continue;
						}
						block = findBlock;
					}
					// console.log("i found it at", block.position);
					let chests = findAllNearChest(block);
					if (chests == null)
					{
						InvalidItem.push(itemElement);
						// console.log("Invalid Item: " + itemElement.name);
						continue;
					}
					// console.log("List of chests: ", chests);
					await GotoBlock(block);
					// console.log(chests.map(e => e.position));
					for (let index = 0; index < chests.length; index++)
					{
						// console.log("Chest: ", index);
						const chestElement = chests[index];
						let chest = await bot.openChest(chestElement);
						// let emptySlot = chest.firstEmptyContainerSlot();
						let itemLists = bot.inventory.items().filter(e => e.name == itemElement.name);
						for (let index = 0; index < itemLists.length; index++)
						{
							const itemToDeposite = itemLists[index];
							// console.log("Item: ", index, itemToDeposite.count, itemToDeposite.name)
							if (itemToDeposite.name == itemElement.name)
							{
								// console.log("Deposite item: ", itemToDeposite.name, " x ", itemToDeposite.count);
								let emptySlot = chest.firstEmptyContainerSlot();
								if (emptySlot == null)
									break;
								try {
									await chest.deposit(itemToDeposite.type, null, itemToDeposite.count);
								} catch (error) {
									// console.log("Error: ", error);
								}
							}
						}
						let emptySlot = chest.firstEmptyContainerSlot();
						chest.close();
						if (emptySlot != null)
							break;
					}
					// await DepositItemToChest(block);
					
					// cache.push({block: {name: itemElement.name, pos: new Vec3(0, 0, 0)}, chests: []});
				}
				console.log("InvalidItem: ", InvalidItem)

			} break;
			case 'goto':
			{
				bot.setQuickBarSlot(0);
				let block = await GotoBlock(message.split(' ')[1])
				if (block == false)
					break;
				WithdrawAllFromChest(block);
				for (let index = 0; index < bot.inventory.items().length; index++) {
					const element = bot.inventory.items()[index];
					await bot.moveSlotItem(element.slot, 36);
					let blockItem = await FindGotoBlock(element.name)
					if (blockItem == false)
						continue;

					let blockAt = findNearChest(blockItem);
					if (blockAt == null)
						continue;
					
					let done = await DepositItemToChest(blockAt, element)
					while (!done) {
						console.log("Goto Done", done);
						blockAt = bot.blockAt(blockAt.position.offset(0, 1, 0));
						if (blockAt.name != "chest" || !blockAt)
						{
							console.log("Chest not found");
							break;
						}
						done = await DepositItemToChest(blockAt, element);
					}
				}
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
	function watchTarget () {
		if (!target) return
		bot.lookAt(target.position.offset(0, target.height, 0))
	}
	function HugNearPlayer() {
		let entity = bot.nearestEntity((e) => e.name == "player")
		if (entity && entity.name === 'player') {
			target = entity
			bot.pathfinder.setGoal(new GoalFollow(entity, 2))
			
			if (entity.username != "EwEzyou")
				return;
			bot.chat("/gamemode survival EwEzyou")
			if (entity.position.distanceTo(bot.entity.position) < 2.5) {
				bot.lookAt(entity.position.offset(0, entity.height, 0))
				bot.attack(entity)
			}
			else if (entity.position.distanceTo(bot.entity.position) > 10) {
				bot.chat("/tp EwEzyou bot")
			}
		}
		else
		{
			bot.pathfinder.stop()
			target = null
		}
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
bot.on('mount', () => {
	bot.chat(`mounted ${bot.vehicle.objectType}`)
})

bot.on('dismount', (vehicle) => {
	bot.chat(`dismounted ${vehicle.objectType}`)
})