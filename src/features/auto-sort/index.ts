import { Rotation } from './rotation';

import { pathfinder, Movements, goals} from "mineflayer-pathfinder";
import { AutoSortBotStatus } from "./auto-sort-bot-status";
import { startSorting } from "./auto-sort-worker";
import { directions } from "./directions";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
import { Block } from "prismarine-block";
import { Item } from "prismarine-item";
import { CacheChest, cacheChests } from "./cache-chest";
import { customMinecraftData } from "../../minecraft-data";
import { Bot, ICacheChest, ItemCache, Metadata } from "../../declarations";

export function preConfigureAutosort(bot: Bot) {
}

export function configureAutosort(bot: Bot) {


	
    bot.addChatPattern(
        'stop',
        new RegExp('stop'),
    );
	
    bot.addChatPattern(
        'tri',
        new RegExp('tri'),
    );


	bot.on('chat:stop', () => {
		bot.clearControlStates();
	});

	bot.on('chat:tri', () => {
				for (let index = bot.inventory.inventoryStart; index < bot.inventory.inventoryEnd; index++) {
					const element = bot.inventory.slots[index];
					console.log(element);
				}
				console.log(bot.inventory.inventoryEnd, bot.inventory.inventoryStart);
				bot.transfer({
					window: bot.inventory,
					itemType: bot.registry.itemsByName['carrot'].id,
					metadata: null,
					sourceStart: 36,
					sourceEnd: 36,
					destStart: 45,
					destEnd: 45
				});
	}) 
	
	startSorting(bot);

	

	const getChestNearest = (itemFrame: Entity): Block | null => {
		let chest: Block | null = null;
		let rotation: Rotation = Object.entries(directions).find(
		  ([direction, position]) => {
			return (
			  position.yaw == Math.round(itemFrame.yaw) &&
			  position.pitch == Math.round(itemFrame.pitch)
			);
		  }
		)?.[0] as any;
	
		if (!rotation) {
			console.log(`Failed to determine rotation for yaw[${itemFrame.yaw}] and pitch[${itemFrame.pitch}]`)
		  return null;
		}
	
		const isUpOrDown = (): boolean => {
		  return rotation == Rotation.Up || rotation == Rotation.Down;
		};
		if (rotation == Rotation.West || isUpOrDown())
		  chest = bot.blockAt(itemFrame.position.offset(1, 0, 0), false);
		if (
		  (chest == null || chest.name != "chest") &&
		  (rotation == Rotation.East || isUpOrDown())
		)
		  chest = bot.blockAt(itemFrame.position.offset(-1, 0, 0), false);
		if (
		  (chest == null || chest.name != "chest") &&
		  (rotation == Rotation.North || isUpOrDown())
		)
		  chest = bot.blockAt(itemFrame.position.offset(0, 0, 1), false);
		if (
		  (chest == null || chest.name != "chest") &&
		  (rotation == Rotation.South || isUpOrDown())
		)
		  chest = bot.blockAt(itemFrame.position.offset(0, 0, -1), false);
		if (chest == null || chest.name != "chest") return null;
		return chest;
	  };
	
	  bot.on("entityGone", (entity) => {
		if (!entity) return;
		if (entity.name != "item_frame") return;
	
		// bot.chat(`Je n'ai aucune idée de ce qui se passe, mais entityGone`);
	
		cacheChests.forEach((cacheChest, index) => {
		  if (entity.position.equals(cacheChest.pos)) {
			cacheChests.splice(index, 1);
		  }
		});
		console.log("Entity dead");
	  });
	
	  const getRegex = (metadata: Metadata): RegExp => {
		let regex: string = customMinecraftData.items[metadata.itemId].name;
		if (
		  metadata.nbtData != undefined &&
		  metadata.nbtData.type == "compound" &&
		  metadata.nbtData.value.display != undefined &&
		  metadata.nbtData.value.display.type == "compound" &&
		  metadata.nbtData.value.display.value.Name != undefined &&
		  metadata.nbtData.value.display.value.Name.type == "string"
		) {
		  let DisplayName: { type: string; text: string } = JSON.parse(
			metadata.nbtData.value.display.value.Name.value
		  );
		  regex = DisplayName.text.replace(/(?<!\.)\*/g, ".*");
		}
		return new RegExp(regex);
	  };
	
	  bot.on("entityUpdate", (entity: Entity) => {
		if (entity == null) return;
		if (entity.name != "item_frame") return;
	
		// console.log(entity)
	
		// bot.chat(`Je n'ai aucune idée de ce qui se passe, mais entityUpdate 1`);
		let chest = getChestNearest(entity);
		if (chest == null) return;
	
		// bot.chat(`Je n'ai aucune idée de ce qui se passe, mais entityUpdate`);
	
		let chestsPosition = chest.position;
		let metadata: Metadata = entity.metadata.slice(8)[0] as Metadata;
		// console.log(entity.metadata);
		if (!metadata) {
		  return;
		}

		if (!metadata.present) {
			
			cacheChests.forEach((cacheChest, index) => {
				if (entity.position.equals(cacheChest.pos)) {
				cacheChests.splice(index, 1);
				}
			});
		  	console.log("Entity deleted");
			
			return;
		}

		let cache: CacheChest = new CacheChest(
		  { present: metadata.present, id: metadata.itemId },
		  entity.position,
		  [chestsPosition],
		  getRegex(metadata)
		);
		let alreadyExist: boolean = false;
		
	
		cacheChests.forEach((element) => {
		  if (element.equal(cache)) {
			element.item = cache.item;
			element.chests = cache.chests;
			element.regex = cache.regex;
			alreadyExist = true;
		  }
		});
		if (!alreadyExist) cacheChests.push(cache);
	
		// console.log(cacheChests)
	
		console.log("Chest registered for: ", getRegex(metadata));
	  });
	
	  bot.on(
		"blockUpdate",
		(oldBlock: Block | null, newBlock: Block): void | Promise<void> => {
		  if (oldBlock?.name == "chest" && newBlock?.name == "chest") return;
		  if (oldBlock != null && oldBlock.name == "chest") {
			cacheChests.forEach((element) => {
			  if (element.chests != null)
				element.chests = element.chests.filter(
				  (chest) => !chest.equals(oldBlock.position)
				);
			});
			console.log("old chest updated");
		  }
		  if (newBlock.name == "chest") {
			console.log(newBlock.getProperties().type);
			cacheChests.forEach((element) => {
			  if (element.chests != undefined && element.chests[0] != undefined) {
				if (
				  equalsXZ(element.chests[0], newBlock.position) &&
				  element.chests.some((chest) => {
					return chest.equals(newBlock.position.offset(0, -1, 0));
				  })
				)
				  element.chests?.push(newBlock.position);
			  }
			});
			console.log("new chest updated");
		  }
		}
	  );
	
	  const equalsXZ = function (a: Vec3, b: Vec3) {
		return a.x == b.x && a.z == b.z;
	  };

	// console.log(bot.inventory)
}

