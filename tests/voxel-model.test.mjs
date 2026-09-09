import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHeroVoxels,
  fragmentOffset,
  palette,
  PART_ROTATIONS,
} from '../lib/voxel-model.ts';

const voxels = createHeroVoxels();
test('sculpture has finite geometry, valid materials, and all eight modeled parts', () => {
  assert.ok(voxels.length > 5000 && voxels.length < 12000);
  assert.deepEqual(
    [...new Set(voxels.map((v) => v.part))].sort(),
    Object.keys(PART_ROTATIONS).sort(),
  );
  for (const v of voxels) {
    assert.ok([v.x, v.y, v.z, v.shade].every(Number.isFinite));
    assert.ok(palette[v.material]);
    assert.ok(Math.abs(v.x) < 4 && Math.abs(v.y) < 3 && Math.abs(v.z) < 3);
  }
});
test('both forms have complete, distinct color palettes', () => {
  for (const colors of Object.values(palette)) {
    assert.equal(colors.length, 2);
    colors.forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/i));
    assert.notEqual(colors[0], colors[1]);
  }
});
test('reassembly restores every voxel exactly with no accumulated displacement', () => {
  for (let i = 0; i < voxels.length; i++) {
    fragmentOffset(voxels[i], i, 1, 500);
    assert.deepEqual(fragmentOffset(voxels[i], i, 0, 1000), [0, 0, 0]);
  }
});
test('fragmentation is deterministic, bounded, and proportional to its control', () => {
  for (let i = 0; i < voxels.length; i += 31) {
    const full = fragmentOffset(voxels[i], i, 1, 12);
    assert.deepEqual(full, fragmentOffset(voxels[i], i, 1, 12));
    const half = fragmentOffset(voxels[i], i, 0.5, 12);
    full.forEach((value, axis) => {
      assert.ok(Number.isFinite(value) && Math.abs(value) < 4);
      assert.ok(Math.abs(half[axis] - value * 0.5) < 1e-12);
    });
  }
});
test('model generation is repeatable and both equipment pieces have full volume', () => {
  assert.deepEqual(createHeroVoxels(), voxels);
  for (const part of ['sword', 'shield']) {
    const vertices = voxels.filter((v) => v.part === part);
    assert.ok(vertices.length > 200);
    for (const axis of ['x', 'y', 'z'])
      assert.ok(
        Math.max(...vertices.map((v) => v[axis])) -
          Math.min(...vertices.map((v) => v[axis])) >
          0.1,
      );
  }
});
