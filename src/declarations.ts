
import { Bot as MineflayerBot, BotEvents as MineflayerBotEvents } from "mineflayer"

import TypedEventEmitter from 'typed-emitter';

import { Vec3 } from "vec3"
import { Entity } from "prismarine-entity";
import { Block } from "prismarine-block";
import { Item } from "prismarine-item";

export type BotEvents = MineflayerBotEvents & {
	'chat:come': () => void;
	'chat:stop': () => void;
	'chat:tri': () => void;
}

export interface AutoEatOptions {
	priority: 'saturation' | 'foodPoints';
	startAt: number;
	bannedFood: string[];
	eatingTimeout: number;
	ignoreInventoryCheck: boolean;
	checkOnItemPickup: boolean;
	useOffhand: boolean;
	equipOldItem: boolean;
}
export interface AutoEat {
	disabled: boolean;
	isEating: boolean;
	options: Partial<AutoEatOptions>;
	eat: (offhand?: boolean) => Promise<void>;
	disable: () => void;
	enable: () => void;
};
export type Bot = MineflayerBot & {
	pathfinder: any;
	autoEat: AutoEat;
	registry: any;
}
& TypedEventEmitter<BotEvents>;

export interface ItemCache {
	present: boolean;
	id: number;
}
export interface ICacheChest{
	item: ItemCache;
	pos: Vec3;
	chests?: Array<Vec3>;
	regex: RegExp;
	equal(cacheChest: ICacheChest): boolean;
}
export interface Metadata {
	present: boolean;
	itemId: number;
	itemCount: number;
	nbtData: any;
}