import { Bot, ICacheChest, ItemCache, Metadata } from "../../declarations";
import { AutoSortBotStatus } from "./auto-sort-bot-status";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
import { Block } from "prismarine-block";
import { Item } from "prismarine-item";
import { CacheChest, cacheChests } from "./cache-chest";
import { goals } from "mineflayer-pathfinder";
import { Rotation } from "./rotation";
import { customMinecraftData } from "../../minecraft-data";
import { directions } from "./directions";

let status: AutoSortBotStatus = AutoSortBotStatus.Idle;

export function startSorting(bot: Bot) {
  const repeatIntervalMs = 10000;
  setInterval(async () => {
		await sort(bot);
	}, repeatIntervalMs);

}

async function sort(bot: Bot) {
  if (bot.pathfinder.isMoving() || status != AutoSortBotStatus.Idle) return;
  status = AutoSortBotStatus.Working;
  let invalidItems: Item[] = [];
  bot.setQuickBarSlot(0);
  let barrel = await findAndGoToBlock(bot, "barrel");
  if (barrel == null) return;
  await withdrawAllFromBlock(bot, barrel);

  // NOTE: Seperate function
  let botInventory = bot.inventory.items();
  for (
    let indexInv = bot.inventory.inventoryStart;
    indexInv < bot.inventory.inventoryEnd;
    indexInv++
  ) {
    const item = bot.inventory.slots[indexInv];
    if (item == null) continue;

    // console.log(item);

    // Check if item.type is already in InvalidItem
    if (invalidItems.find((e) => e.type == item.type) != undefined) {
      invalidItems.push(item);
      continue;
    }
    // console.log(cacheChest)
    let cacheChestItem = cacheChests.filter(
      (e) => e.regex.test(item.name) || e.regex.test(item.displayName)
    );
    let cacheItem = cacheChestItem[0];
    if (!cacheItem?.chests?.length) {
      console.log(`Reject ${item.name}`);
      invalidItems.push(item);
      continue;
    }
    await goToVec(bot, cacheItem.pos);
    // For all chests and find empty chest
    for (
      let indexChest = 0;
      indexChest < cacheItem.chests.length;
      indexChest++
    ) {
      const chest = cacheItem.chests[indexChest];
      let chestBlock = bot.blockAt(chest, false);
      if (chestBlock == null) continue;
      const chestIsFull = await depositItemToChest(bot, chestBlock, item);
      if (!chestIsFull) break;
    }
    if (bot.inventory.slots[indexInv] != null)
      invalidItems.push(bot.inventory.slots[indexInv]!);
  }
  if (invalidItems.length != 0) {
    // bot.chat(`J'ai trouvé ${invalidItem.length} chose de manière incorrecte. Leur existence me rend nerveux.`)
    // NOTE: Deposite all invaliditem to barrel maybe set to Config.InvalidChest
    await goToVec(bot, barrel?.position);
    const barrelContainer = await bot.openChest(barrel);
    // For invalid item
    for (let index = 0; index < invalidItems.length; index++) {
      const item = invalidItems[index];
      try {
        await barrelContainer.deposit(item.type, null, item.count);
      } catch (error) {
        console.log("Chest full InvalidItemToBarrel");
        break;
      }
    }
    barrelContainer.close();
  }
  status = AutoSortBotStatus.Idle;
}

let onGoal = false;
async function goToBlock(bot: Bot, block: Block) {
  bot.on("goal_reached", (goal) => {
    onGoal = false;
    console.log("Goal reached");
  });

  if (block == null) return false;
  if (block.position.distanceTo(bot.entity.position) < 5) return block;
  if (onGoal) bot.pathfinder.stop();
  onGoal = true;
  bot.pathfinder.setGoal(
    new goals.GoalGetToBlock(
      block.position.x,
      block.position.y,
      block.position.z
    )
  );
  console.log("Goal set to " + block.position.toString());
  do {
    await bot.waitForTicks(10);
  } while (onGoal);
  return true;
}

async function goToVec(bot: Bot, pos: Vec3) {
  if (pos == null) return false;
  if (pos.distanceTo(bot.entity.position) < 5) return pos;
  if (onGoal) bot.pathfinder.stop();
  onGoal = true;
  bot.pathfinder.setGoal(new goals.GoalGetToBlock(pos.x, pos.y, pos.z));
  console.log("Goal set to " + pos.toString());
  do {
    await bot.waitForTicks(10);
  } while (onGoal);
  return true;
}

async function findAndGoToBlock(bot: Bot, name: string) {
  const botPos = bot.entity.position;
  // bot.chat(`Je cherche ${name}`)
  if (botPos == undefined) return null;

  if (name == undefined || bot.registry.blocksByName[name] == undefined)
    return null;
  const ids = [bot.registry.blocksByName[name].id];

  const block = bot.findBlock({ matching: ids, maxDistance: 24, count: 1 });
  if (block == null) return null;
  await goToBlock(bot, block);
  return block;
}

async function withdrawAllFromBlock(bot: Bot, block: Block) {
  if (block.name == "chest") return;
  // bot.chat(`Je prends tout ce que je peux. La source - ${block?.displayName}`)
  let chest = await bot.openChest(block);
  let containerItems = chest.containerItems();
  let len = containerItems.length;
  // console.log(len, containerItems, chest.slots)
  for (let index = 0; index < len; index++) {
    const element = containerItems[index];
    if (
      element != null &&
      cacheChests.find(
        (e) => e.regex.test(element.name) || e.regex.test(element.displayName)
      )
    ) {
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

// // Return true is full
async function depositItemToChest(
  bot: Bot,
  block: Block,
  item: Item
): Promise<boolean> {
  //bot.chat(`Je mets ${item?.name} dans ${block?.position}`);
  let chest = await bot.openChest(block);
  if (chest == null) return false;
  let chestIsFull = false;
  const inv = bot.inventory
    .items()
    .filter((element) => element.name == item.name);
  for (let index = 0; index < inv.length; index++) {
    const element = inv[index];
    if (element != null && element.type == item.type) {
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
  return chestIsFull;
}
