/**
 * A side-on outline of the vehicle's body style, standing in for a photo.
 *
 * The placeholder used to be a small car glyph in the middle of an empty box, which read
 * as "missing" (dogfooding, 2026-10-02). An outline the size of the slot says what the
 * car is instead. The nine styles are the vehicle form's own `BODY_STYLES`; anything
 * else, or nothing, draws the sedan.
 *
 * Every style shares one system so they read as a set: the ground at y 88, wheels of
 * radius 13 centred at y 75, arches cut 4 units clear of the tyre, front to the right.
 * A style is only its wheelbase, sill height and two point lists: the profile from the
 * front bumper over the roof to the rear, and its side windows.
 */

type Point = readonly [number, number];

interface Shape {
	rear: number;
	front: number;
	wheels: readonly [number, number];
	sill: number;
	profile: readonly Point[];
	windows: readonly (readonly Point[])[];
	/** Open strokes a closed outline cannot draw: a windscreen frame, a folded top. */
	details?: readonly (readonly Point[])[];
}

const GROUND = 88;
const WHEEL_Y = 75;
const WHEEL_R = 13;
const ARCH_R = WHEEL_R + 4;

const SEDAN: Shape = {
	rear: 12,
	front: 228,
	wheels: [60, 180],
	sill: 78,
	profile: [
		[229, 66],
		[222, 58],
		[196, 54],
		[160, 50],
		[140, 32],
		[100, 30],
		[74, 48],
		[30, 52],
		[14, 58]
	],
	windows: [
		[
			[156, 50],
			[138, 35],
			[122, 34],
			[122, 50]
		],
		[
			[116, 50],
			[116, 34],
			[102, 33],
			[80, 49]
		]
	]
};

const SHAPES: Record<string, Shape> = {
	sedan: SEDAN,
	coupe: {
		rear: 14,
		front: 226,
		wheels: [62, 178],
		sill: 78,
		profile: [
			[228, 66],
			[220, 58],
			[192, 54],
			[156, 50],
			[132, 34],
			[104, 33],
			[66, 50],
			[28, 54],
			[16, 60]
		],
		windows: [
			[
				[150, 50],
				[130, 37],
				[108, 36],
				[84, 50]
			]
		]
	},
	hatchback: {
		rear: 22,
		front: 218,
		wheels: [64, 170],
		sill: 78,
		profile: [
			[220, 66],
			[212, 58],
			[186, 54],
			[152, 50],
			[130, 32],
			[64, 30],
			[34, 40],
			[24, 56]
		],
		windows: [
			[
				[148, 50],
				[128, 35],
				[104, 34],
				[104, 50]
			],
			[
				[98, 50],
				[98, 34],
				[68, 33],
				[46, 48]
			]
		]
	},
	wagon: {
		rear: 12,
		front: 228,
		wheels: [60, 180],
		sill: 78,
		profile: [
			[229, 66],
			[222, 58],
			[196, 54],
			[160, 50],
			[140, 32],
			[30, 30],
			[16, 36],
			[12, 56]
		],
		windows: [
			[
				[156, 50],
				[138, 35],
				[116, 34],
				[116, 50]
			],
			[
				[110, 50],
				[110, 34],
				[72, 33],
				[72, 50]
			],
			[
				[66, 50],
				[66, 33],
				[34, 33],
				[24, 50]
			]
		]
	},
	convertible: {
		rear: 14,
		front: 226,
		wheels: [62, 178],
		sill: 78,
		profile: [
			[228, 66],
			[220, 58],
			[192, 54],
			[150, 50],
			[28, 52],
			[16, 58]
		],
		windows: [],
		details: [
			[
				[154, 51],
				[138, 34]
			],
			[
				[44, 51],
				[52, 44],
				[74, 44],
				[80, 51]
			]
		]
	},
	suv: {
		rear: 14,
		front: 226,
		wheels: [58, 182],
		sill: 72,
		profile: [
			[228, 56],
			[222, 48],
			[190, 46],
			[166, 42],
			[150, 22],
			[24, 20],
			[16, 26]
		],
		windows: [
			[
				[162, 42],
				[148, 25],
				[124, 24],
				[124, 42]
			],
			[
				[118, 42],
				[118, 24],
				[80, 24],
				[80, 42]
			],
			[
				[74, 42],
				[74, 24],
				[30, 24],
				[26, 42]
			]
		]
	},
	truck: {
		rear: 10,
		front: 230,
		wheels: [52, 188],
		sill: 72,
		profile: [
			[231, 56],
			[224, 48],
			[196, 46],
			[176, 42],
			[160, 22],
			[118, 22],
			[116, 44],
			[12, 44],
			[10, 50]
		],
		windows: [
			[
				[172, 42],
				[158, 25],
				[140, 24],
				[140, 42]
			],
			[
				[134, 42],
				[134, 24],
				[122, 24],
				[122, 42]
			]
		]
	},
	van: {
		rear: 12,
		front: 228,
		wheels: [56, 184],
		sill: 74,
		profile: [
			[229, 56],
			[222, 46],
			[206, 42],
			[190, 20],
			[20, 16],
			[14, 22]
		],
		windows: [
			[
				[200, 42],
				[188, 24],
				[176, 23],
				[176, 42]
			]
		],
		details: [
			[
				[150, 20],
				[150, 70]
			]
		]
	},
	minivan: {
		rear: 14,
		front: 226,
		wheels: [58, 180],
		sill: 76,
		profile: [
			[228, 60],
			[220, 52],
			[196, 48],
			[168, 24],
			[40, 20],
			[22, 26],
			[16, 44]
		],
		windows: [
			[
				[164, 46],
				[160, 28],
				[134, 26],
				[134, 46]
			],
			[
				[128, 46],
				[128, 25],
				[88, 24],
				[88, 46]
			],
			[
				[82, 46],
				[82, 24],
				[44, 23],
				[28, 40],
				[28, 46]
			]
		]
	}
};

const line = (points: readonly Point[]) => points.map(([x, y]) => `${x} ${y}`).join(' L ');

/** Sill, both wheel arches, then up the front and over the profile to the rear. */
function bodyPath({ rear, front, wheels, sill, profile }: Shape) {
	const arch = (x: number) =>
		`L ${x - ARCH_R} ${sill} A ${ARCH_R} ${ARCH_R} 0 0 1 ${x + ARCH_R} ${sill}`;
	return `M ${rear} ${sill} ${arch(wheels[0])} ${arch(wheels[1])} L ${front} ${sill} L ${line(profile)} L ${rear} ${sill} Z`;
}

export function VehicleOutline({
	bodyStyle,
	className
}: {
	bodyStyle: string | null;
	className?: string;
}) {
	const shape = SHAPES[bodyStyle?.toLowerCase() ?? ''] ?? SEDAN;
	const stroke = {
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.75,
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
		vectorEffect: 'non-scaling-stroke'
	} as const;

	return (
		<svg viewBox="0 0 240 96" aria-hidden className={className}>
			<line
				x1={shape.rear - 4}
				x2={shape.front + 4}
				y1={GROUND}
				y2={GROUND}
				{...stroke}
				strokeOpacity={0.35}
			/>
			<path d={bodyPath(shape)} {...stroke} />
			{shape.windows.map((window) => (
				<path
					key={line(window)}
					d={`M ${line(window)} Z`}
					{...stroke}
					fill="currentColor"
					fillOpacity={0.08}
				/>
			))}
			{shape.details?.map((detail) => (
				<path key={line(detail)} d={`M ${line(detail)}`} {...stroke} />
			))}
			{shape.wheels.map((x) => (
				<g key={x}>
					<circle cx={x} cy={WHEEL_Y} r={WHEEL_R} {...stroke} />
					<circle cx={x} cy={WHEEL_Y} r={4.5} {...stroke} />
				</g>
			))}
		</svg>
	);
}
