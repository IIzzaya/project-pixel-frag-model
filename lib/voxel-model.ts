/** Procedural, editable voxel sculpture. Coordinates are in 1/13 world units. */
export type Form = 'hero' | 'shadow';
export type MaterialKey = keyof typeof palette;
export const palette = {
  green: ['#438b30', '#303735'],
  greenLight: ['#63a73d', '#494e49'],
  greenDark: ['#235b35', '#242b2b'],
  skin: ['#efbc88', '#8983aa'],
  skinLight: ['#ffcf9d', '#a5a0ba'],
  skinDark: ['#cf9466', '#65607f'],
  hair: ['#efac24', '#a7aaa5'],
  hairLight: ['#ffcf43', '#c3c6bc'],
  hairDark: ['#c88215', '#727871'],
  white: ['#e9f1de', '#aaaeb0'],
  whiteShade: ['#b4c7be', '#757e82'],
  leather: ['#723b38', '#493b47'],
  leatherLight: ['#99594b', '#69515d'],
  leatherDark: ['#492c32', '#302b37'],
  belt: ['#a77543', '#79656c'],
  gold: ['#f8c441', '#e52a52'],
  blue: ['#265fb3', '#252d38'],
  blueDark: ['#293e82', '#171e2b'],
  blueLight: ['#387bce', '#536775'],
  steel: ['#c5e5e8', '#b1c6ce'],
  steelLight: ['#eaf8f4', '#dde4e3'],
  steelDark: ['#89aab9', '#607f8d'],
  eye: ['#1289d2', '#f22e51'],
  eyeLight: ['#62c9f2', '#ff6e7c'],
  ink: ['#293b37', '#191b29'],
} as const;

export interface Voxel {
  x: number;
  y: number;
  z: number;
  material: MaterialKey;
  shade: number;
  part: string;
}
type Cell = { x: number; y: number; z: number; material: MaterialKey };
const STEP = 1 / 13;

class Part {
  cells = new Map<string, Cell>();
  constructor(
    public name: string,
    public origin: [number, number, number],
    public rotation: [number, number, number] = [0, 0, 0],
  ) {}
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: MaterialKey,
  ) {
    for (let i = x; i < x + w; i++)
      for (let j = y; j < y + h; j++)
        for (let k = z; k < z + d; k++)
          this.cells.set(`${i},${j},${k}`, { x: i, y: j, z: k, material });
    return this;
  }
  build(): Voxel[] {
    const [rx, ry, rz] = this.rotation;
    const neighbors = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    return [...this.cells.values()]
      .filter((c) =>
        neighbors.some(
          ([x, y, z]) => !this.cells.has(`${c.x + x},${c.y + y},${c.z + z}`),
        ),
      )
      .map((c) => {
        let x = c.x + 0.5,
          y = c.y + 0.5,
          z = c.z + 0.5;
        [y, z] = [
          y * Math.cos(rx) - z * Math.sin(rx),
          y * Math.sin(rx) + z * Math.cos(rx),
        ];
        [x, z] = [
          x * Math.cos(ry) + z * Math.sin(ry),
          -x * Math.sin(ry) + z * Math.cos(ry),
        ];
        [x, y] = [
          x * Math.cos(rz) - y * Math.sin(rz),
          x * Math.sin(rz) + y * Math.cos(rz),
        ];
        // Sparse broad patches preserve the hand-built look without noisy checkerboarding.
        const n =
          Math.abs(
            Math.sin(
              Math.floor(c.x / 3) * 127.1 +
                Math.floor(c.y / 3) * 311.7 +
                Math.floor(c.z / 3) * 74.7,
            ) * 43758.5453,
          ) % 1;
        return {
          x: (x + this.origin[0]) * STEP,
          y: (y + this.origin[1] - 28) * STEP,
          z: (z + this.origin[2]) * STEP,
          material: c.material,
          shade: n > 0.85 ? 0.94 : n < 0.12 ? 1.025 : 1,
          part: this.name,
        };
      });
  }
}

export const VOXEL_SIZE = STEP;
export const PART_ROTATIONS: Record<string, [number, number, number]> = {
  head: [0, -0.06, -0.035],
  body: [0, 0, 0],
  leftLeg: [-0.22, 0, -0.13],
  rightLeg: [0.27, 0, 0.17],
  leftArm: [-0.23, 0, -0.34],
  rightArm: [-0.48, 0, 0.38],
  sword: [0.17, -0.12, 1.08],
  shield: [0, 0.06, 0],
};

export function createHeroVoxels(): Voxel[] {
  const parts: Part[] = [];
  const part = (name: string, origin: [number, number, number]) => {
    const p = new Part(name, origin, PART_ROTATIONS[name]);
    parts.push(p);
    return p;
  };
  const head = part('head', [0, 43, 0]);
  head.box(-8, -7, -5, 16, 15, 12, 'skin');
  head.box(-7, -6, 7, 14, 11, 1, 'skinLight');
  head.box(-6, -8, -3, 12, 2, 9, 'skin');
  // Pointed ears, layered in pixel steps.
  for (const s of [-1, 1]) {
    head.box(s === 1 ? 8 : -12, -2, -1, 4, 4, 3, 'skin');
    head.box(s === 1 ? 11 : -14, 0, -1, 3, 3, 2, 'skinLight');
    head.box(s === 1 ? 8 : -11, -1, 2, 3, 2, 1, 'skinDark');
  }
  // Brows, whites, sapphire irises, and tiny specular pixels.
  for (const x of [-6, 2]) {
    head.box(x, -2, 8, 5, 5, 1, 'white');
    head.box(x + 1, -2, 9, 3, 5, 1, 'eye');
    head.box(x + 1, 1, 10, 1, 2, 1, 'eyeLight');
    head.box(x - 1, 3, 8, 6, 1, 1, 'hairDark');
  }
  head.box(-1, -4, 8, 2, 2, 2, 'skin');
  head.box(-1, -6, 8, 3, 1, 1, 'skinDark');
  // A swept, asymmetrical fringe with longer side locks.
  head.box(-9, 5, -6, 18, 5, 14, 'hair');
  head.box(-8, 8, -5, 15, 3, 12, 'hairLight');
  head.box(-9, 1, 6, 4, 7, 3, 'hair');
  head.box(-8, -1, 7, 2, 4, 2, 'hairLight');
  head.box(-5, 4, 8, 4, 4, 2, 'hairLight');
  head.box(-2, 2, 8, 3, 5, 2, 'hair');
  head.box(2, 5, 7, 4, 4, 3, 'hairLight');
  head.box(6, 0, 6, 3, 7, 3, 'hair');
  head.box(7, -3, 4, 3, 6, 3, 'hairDark');
  head.box(-10, -6, 1, 2, 8, 4, 'hair');
  head.box(8, -6, 1, 2, 8, 4, 'hair');
  head.box(-9, -5, -6, 3, 12, 4, 'hairDark');
  head.box(6, -5, -6, 3, 12, 4, 'hair');
  // The characteristic long green cap tapers down the back.
  head.box(-8, -5, -7, 16, 3, 2, 'hairDark');
  head.box(-8, -2, -8, 16, 10, 3, 'green');
  head.box(-9, 7, -8, 18, 4, 12, 'green');
  head.box(-7, 10, -8, 14, 3, 10, 'greenLight');
  head.box(-6, 8, -12, 13, 3, 5, 'green');
  head.box(-5, 5, -15, 11, 5, 5, 'green');
  head.box(-3, 2, -18, 8, 5, 5, 'greenDark');
  head.box(-1, -1, -20, 6, 4, 4, 'green');
  head.box(1, -3, -21, 3, 3, 3, 'greenDark');

  const body = part('body', [0, 28, 0]);
  body.box(-3, 5, -2, 6, 5, 6, 'skin');
  body.box(-7, -6, -5, 14, 14, 10, 'green');
  body.box(-6, 3, 5, 12, 5, 1, 'greenDark');
  body.box(-3, 4, 6, 6, 4, 1, 'white');
  body.box(-2, 2, 6, 4, 3, 1, 'white');
  body.box(-1, 0, 6, 2, 3, 1, 'whiteShade');
  body.box(-6, 5, 6, 3, 3, 1, 'greenLight');
  body.box(3, 5, 6, 3, 3, 1, 'greenLight');
  // Leather cross-body strap, brass fastener.
  for (let i = 0; i < 13; i++) body.box(5 - i, 5 - i, 6, 2, 2, 1, 'leather');
  body.box(-1, -2, 7, 3, 3, 1, 'gold').box(0, -1, 8, 1, 1, 1, 'leather');
  body.box(-7, -5, -5, 14, 2, 11, 'belt');
  body.box(-2, -5, 6, 4, 3, 1, 'gold').box(-1, -4, 7, 2, 1, 1, 'leatherDark');
  body.box(-8, -9, -5, 16, 4, 11, 'green');
  body.box(-9, -11, -5, 18, 2, 11, 'greenDark');
  body.box(-7, -9, 6, 4, 3, 1, 'greenLight');
  body.box(3, -9, 6, 4, 3, 1, 'greenLight');
  body.box(6, -6, -2, 3, 5, 5, 'leather').box(7, -3, 3, 2, 2, 1, 'gold');

  for (const [name, x] of [
    ['leftLeg', -4.5],
    ['rightLeg', 4.5],
  ] as const) {
    const leg = part(name, [x, 18, 0]);
    leg.box(-3, -7, -3, 6, 8, 6, 'white');
    leg.box(-3, -7, 3, 2, 6, 1, 'whiteShade');
    leg.box(-4, -10, -4, 8, 4, 8, 'belt');
    leg.box(-3, -16, -3, 6, 7, 7, 'leather');
    leg.box(-3, -16, 4, 6, 4, 3, 'leatherLight');
    leg.box(-3, -17, -3, 6, 2, 10, 'leatherDark');
    leg.box(-4, -11, -4, 8, 2, 8, 'leatherDark');
    leg.box(-3, -14, 4, 6, 1, 1, 'leather');
  }
  for (const [name, x] of [
    ['leftArm', -8],
    ['rightArm', 8],
  ] as const) {
    const arm = part(name, [x, 32, 0]);
    arm.box(-3, -4, -4, 6, 6, 8, 'green');
    arm.box(-3, -5, -4, 6, 2, 8, 'white');
    arm.box(-3, -11, -3, 6, 6, 6, 'leather');
    arm.box(-3, -10, 3, 6, 3, 1, 'leatherLight');
    arm.box(-3, -12, -3, 6, 2, 7, 'leatherDark');
    arm.box(-2, -16, -2, 5, 4, 6, 'skin');
    arm.box(-2, -14, 4, 5, 2, 1, 'leather');
    for (let i = 0; i < 3; i++)
      arm.box(-2 + i * 2, -16, 4, 1, 2, 1, 'skinLight');
  }

  const sword = part('sword', [-13, 19, 4]);
  sword.box(-1, -5, -1, 2, 8, 2, 'blueDark');
  for (let y = -4; y < 2; y += 2) sword.box(-1, y, 1, 2, 1, 1, 'blueLight');
  sword.box(-2, -6, -2, 4, 2, 4, 'blue');
  sword.box(-6, 2, -2, 12, 2, 4, 'blue');
  sword.box(-7, 0, -2, 3, 3, 4, 'blueDark');
  sword.box(4, 0, -2, 3, 3, 4, 'blueDark');
  sword.box(-2, 1, 2, 4, 4, 1, 'gold');
  sword.box(-2, 4, -1, 4, 23, 2, 'steel');
  sword.box(-2, 4, 1, 2, 23, 1, 'steelLight');
  sword.box(1, 4, 1, 1, 23, 1, 'steelDark');
  sword.box(-1, 27, -1, 2, 3, 2, 'steelLight');
  sword.box(0, 30, -1, 1, 2, 2, 'steelLight');

  const shield = part('shield', [0, 27, -8]);
  // Stepped kite shield, completely modeled on both sides.
  for (let y = -15; y <= 11; y++) {
    const w =
      y < -5 ? Math.max(1, 10 - Math.floor((-y - 5) * 0.82)) : y > 8 ? 9 : 11;
    shield.box(-w, y, -2, w * 2, 1, 3, 'belt');
    shield.box(-w, y, -3, w * 2, 1, 1, 'steel');
    if (w > 2) shield.box(-w + 2, y, -4, (w - 2) * 2, 1, 1, 'blue');
    shield.box(-w, y, -4, 1, 1, 1, 'steelLight');
    shield.box(w - 1, y, -4, 1, 1, 1, 'steelDark');
  }
  shield.box(-8, 10, -4, 16, 2, 1, 'steel');
  const crest = [
    '........G........',
    '.......GGG.......',
    '......GGGGG......',
    '.....G.....G.....',
    '....GGG...GGG....',
    '...GGGGG.GGGGG...',
    '.................',
    '.R.....RRR.....R.',
    '..RR..RRRRR..RR..',
    '...RRRRRRRRRRR...',
    '.RR..RRRRRRR..RR.',
    '..RRRR.RRR.RRRR..',
    '....R..RRR..R....',
    '.......RRR.......',
    '......RRRRR......',
  ];
  crest.forEach((row, j) =>
    row.split('').forEach((c, i) => {
      if (c !== '.')
        shield.box(
          i - 8,
          7 - j,
          -5,
          1,
          1,
          1,
          c === 'G' ? 'gold' : 'leatherLight',
        );
    }),
  );
  shield.box(-7, -6, 1, 2, 13, 1, 'leatherDark');
  shield.box(5, -6, 1, 2, 13, 1, 'leatherDark');
  return parts.flatMap((p) => p.build());
}

/** Deterministic offsets keep every transition reversible and reproducible. */
export function fragmentOffset(
  v: Voxel,
  index: number,
  amount: number,
  time: number,
): [number, number, number] {
  if (amount === 0) return [0, 0, 0];
  const band = Math.floor((v.y + 3) * 10);
  const wave = Math.sin(band * 127.1 + 3.7);
  const r = (Math.sin(index * 78.233) * 43758.5453) % 1;
  return [
    wave * amount * (1.8 + Math.abs(v.y) * 0.65),
    Math.sin(index * 0.93) * amount * 0.22,
    Math.cos(band * 7.13) * amount * 0.65 +
      Math.sin(time * 0.5 + r) * amount * 0.08,
  ];
}
