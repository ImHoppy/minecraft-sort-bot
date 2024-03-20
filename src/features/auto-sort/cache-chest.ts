import { ItemCache, ICacheChest } from "../../declarations";
import { Vec3 } from "vec3"

export class CacheChest implements ICacheChest
{
	
	item: ItemCache;
	pos: Vec3;
	chests?: Array<Vec3>;
	regex: RegExp;

	constructor(item: ItemCache, pos: Vec3, chests?: Array<Vec3>, regex?: RegExp) {
		this.item = item;
		this.pos = pos;
		this.chests = chests;
		if (regex != null)
			this.regex = regex;
		else
			this.regex = new RegExp(`^${item.id}$`);
	}
	equal(cacheChest: CacheChest): boolean {

		return this.item.id == cacheChest.item.id && this.pos.equals(cacheChest.pos);
	}
}

export const cacheChests = new Array<CacheChest>();
