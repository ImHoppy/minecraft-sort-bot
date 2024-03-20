import { Rotation } from './rotation';



export const directions = {
	[Rotation.Up]: {
		yaw: Math.round(Math.PI),
		pitch: Math.round(Math.PI/2),
	},
	[Rotation.Down]: {
		yaw: Math.round(Math.PI),
		pitch: -Math.round(Math.PI/2),
	},
	[Rotation.North]: {
		yaw: 0,
		pitch: 0,
	},
	[Rotation.South]: {
		yaw: Math.round(Math.PI),
		pitch: 0,
	},
	[Rotation.West]: {
		yaw: Math.round(Math.PI/2),
		pitch: 0,
	},
	[Rotation.East]: {
		yaw: Math.round(3*Math.PI/2),
		pitch: 0,
	},
};