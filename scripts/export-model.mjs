import { mkdirSync, writeFileSync } from 'node:fs';
import {
  createHeroVoxels,
  palette,
  PART_ROTATIONS,
} from '../lib/voxel-model.ts';
mkdirSync('.artifacts', { recursive: true });
const voxels = createHeroVoxels();
writeFileSync(
  '.artifacts/voxels.json',
  JSON.stringify({ voxels, palette, rotations: PART_ROTATIONS }),
);
console.log(
  `Exported ${voxels.length} surface voxels to .artifacts/voxels.json`,
);
