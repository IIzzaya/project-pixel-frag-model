import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createHeroVoxels,
  fragmentOffset,
  palette,
  PART_ROTATIONS,
  VOXEL_SIZE,
  type Form,
} from './voxel-model';

export interface SceneSettings {
  form: Form;
  rotating: boolean;
  speed: number;
  fragments: number;
  pixelSize: number;
  fairy: boolean;
}
export interface SceneStats {
  backend: string;
  voxels: number;
  fps: number;
}
export interface SceneController {
  update: (settings: SceneSettings) => void;
  reset: () => void;
  zoom: (factor: number) => void;
  view: (direction: 'front' | 'back') => void;
  capture: () => Promise<Blob>;
  dispose: () => void;
}

export async function createScene(
  host: HTMLElement,
  initial: SceneSettings,
  report: (stats: SceneStats) => void,
): Promise<SceneController> {
  let settings = { ...initial };
  let renderer = new THREE.WebGPURenderer({ alpha: true, antialias: false });
  try {
    await renderer.init();
  } catch {
    renderer?.dispose();
    renderer = new THREE.WebGPURenderer({
      alpha: true,
      antialias: false,
      forceWebGL: true,
    });
    await renderer.init();
  }
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute(
    'aria-label',
    '可交互的像素英雄 3D 模型；拖动旋转，滚轮缩放，方向键调整视角',
  );
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.tabIndex = 0;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3.5, -3.5, 0.1, 100);
  const cameraHome = new THREE.Vector3(5.8, 3.1, 14);
  camera.position.copy(cameraHome);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-0.18, -0.04, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minZoom = 0.7;
  controls.maxZoom = 2.2;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = Math.PI - 0.3;
  controls.autoRotate = false;
  controls.update();
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const keyLight = new THREE.DirectionalLight(0xfff7dc, 3.1);
  keyLight.position.set(-4, 8, 7);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xd1e8ff, 1.7);
  fillLight.position.set(5, 2, -4);
  scene.add(fillLight);

  const voxels = createHeroVoxels();
  const geometry = new THREE.BoxGeometry(
    VOXEL_SIZE * 1.002,
    VOXEL_SIZE * 1.002,
    VOXEL_SIZE * 1.002,
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.92,
    metalness: 0,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, voxels.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const sculpture = new THREE.Group();
  sculpture.add(mesh);
  scene.add(sculpture);
  sculpture.rotation.z = -0.055;
  const dummy = new THREE.Object3D();
  const rotations = new Map<string, THREE.Quaternion>();
  Object.entries(PART_ROTATIONS).forEach(([part, r]) =>
    rotations.set(
      part,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...r, 'ZYX')),
    ),
  );
  const heroColors = voxels.map((v) =>
    new THREE.Color(palette[v.material][0]).multiplyScalar(v.shade),
  );
  const shadowColors = voxels.map((v) =>
    new THREE.Color(palette[v.material][1]).multiplyScalar(v.shade),
  );
  const color = new THREE.Color();
  let shadeMix = initial.form === 'shadow' ? 1 : 0;
  let spread = initial.fragments / 100;
  let lastSpread = -1;
  let lastMix = -1;
  function updateVoxels(time: number) {
    const matricesChanged =
      spread > 0.0001 || Math.abs(lastSpread - spread) > 0.00001;
    const colorsChanged = Math.abs(lastMix - shadeMix) > 0.0001;
    if (matricesChanged || lastSpread === -1)
      voxels.forEach((v, i) => {
        const [dx, dy, dz] = fragmentOffset(v, i, spread, time);
        dummy.position.set(v.x + dx, v.y + dy, v.z + dz);
        dummy.quaternion.copy(rotations.get(v.part)!);
        const shrink = 1 - spread * 0.28;
        dummy.scale.setScalar(shrink);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
    if (colorsChanged)
      voxels.forEach((_, i) => {
        color.copy(heroColors[i]).lerp(shadowColors[i], shadeMix);
        mesh.setColorAt(i, color);
      });
    if (matricesChanged) mesh.instanceMatrix.needsUpdate = true;
    if (colorsChanged && mesh.instanceColor)
      mesh.instanceColor.needsUpdate = true;
    lastSpread = spread;
    lastMix = shadeMix;
  }
  updateVoxels(0);

  const fairy = new THREE.Group();
  scene.add(fairy);
  const fairyCoreMaterial = new THREE.MeshBasicMaterial({ color: 0xf6ffff });
  const fairyWingMaterial = new THREE.MeshBasicMaterial({
    color: 0xa2d2f5,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  const fairyHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0x71bafd,
    transparent: true,
    opacity: 0.22,
  });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const core = new THREE.Mesh(cube, fairyCoreMaterial);
  core.scale.set(0.17, 0.21, 0.15);
  fairy.add(core);
  const halo = new THREE.Mesh(cube, fairyHaloMaterial);
  halo.scale.set(0.27, 0.3, 0.22);
  fairy.add(halo);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    for (const [x, y, w, h] of [
      [0.19, 0.16, 0.2, 0.16],
      [0.33, 0.24, 0.16, 0.18],
      [0.14, -0.15, 0.17, 0.11],
    ]) {
      const bit = new THREE.Mesh(cube, fairyWingMaterial);
      bit.scale.set(w, h, 0.035);
      bit.position.set(x * side, y, 0);
      wing.add(bit);
    }
    fairy.add(wing);
    wings.push(wing);
  }
  const dustMaterial = new THREE.MeshBasicMaterial({
    color: 0x8bba6a,
    transparent: true,
    opacity: 0.48,
  });
  const dust = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.026, 0.026, 0.026),
    dustMaterial,
    24,
  );
  dust.frustumCulled = false;
  scene.add(dust);
  const backend = (renderer.backend as unknown as { isWebGPUBackend?: boolean })
    .isWebGPUBackend
    ? 'WEBGPU'
    : 'WEBGL 2';
  let disposed = false,
    raf = 0,
    lastTime = performance.now(),
    lastReport = lastTime,
    frames = 0,
    elapsed = 0;
  let formTransition = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let interactedUntil = 0;
  function onStart() {
    interactedUntil = performance.now() + 5000;
  }
  controls.addEventListener('start', onStart);

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height,
      h = Math.max(6.2, 6.1 / aspect);
    camera.left = (-h * aspect) / 2;
    camera.right = (h * aspect) / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 1.75) / settings.pixelSize,
    );
    renderer.setSize(width, height);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  function keydown(e: KeyboardEvent) {
    if (
      ![
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        '+',
        '-',
        'Home',
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    interactedUntil = performance.now() + 5000;
    if (e.key === 'ArrowLeft') sculpture.rotation.y -= 0.15;
    if (e.key === 'ArrowRight') sculpture.rotation.y += 0.15;
    if (e.key === 'ArrowUp')
      camera.position.y = Math.min(12, camera.position.y + 1);
    if (e.key === 'ArrowDown')
      camera.position.y = Math.max(-10, camera.position.y - 1);
    if (e.key === '+' || e.key === '-') setZoom(e.key === '+' ? 1.1 : 1 / 1.1);
    if (e.key === 'Home') reset();
  }
  renderer.domElement.addEventListener('keydown', keydown);
  function setZoom(factor: number) {
    camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.7, 2.2);
    camera.updateProjectionMatrix();
  }
  function reset() {
    camera.position.copy(cameraHome);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    sculpture.rotation.y = 0;
    controls.target.set(-0.18, -0.04, 0);
    controls.update();
  }

  function render(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    if (document.hidden) {
      lastTime = now;
      return;
    }
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += dt;
    if (settings.rotating && now > interactedUntil)
      sculpture.rotation.y += dt * 0.34 * settings.speed;
    sculpture.position.y = reducedMotion.matches
      ? 0
      : Math.sin(elapsed * 1.6) * 0.055;
    formTransition = Math.max(0, formTransition - dt);
    const burst = reducedMotion.matches
      ? 0
      : Math.sin((Math.max(0, formTransition) / 0.8) * Math.PI) * 0.85;
    const target = Math.max(settings.fragments / 100, burst);
    spread = THREE.MathUtils.damp(spread, target, 12, dt);
    if (spread < 0.0001 && target === 0) spread = 0;
    shadeMix = THREE.MathUtils.damp(
      shadeMix,
      settings.form === 'shadow' ? 1 : 0,
      8,
      dt,
    );
    updateVoxels(elapsed);
    fairy.visible = settings.fairy;
    const motionTime = reducedMotion.matches ? 0 : elapsed;
    fairy.position.set(
      1.3 + Math.sin(motionTime * 0.65) * 0.28,
      1.75 + Math.sin(motionTime * 2.1) * 0.12,
      0.6 + Math.cos(motionTime * 0.65) * 0.35,
    );
    fairy.rotation.y = Math.sin(motionTime * 0.6) * 0.35;
    wings[0].rotation.y = Math.sin(motionTime * 22) * 0.45;
    wings[1].rotation.y = -Math.sin(motionTime * 22) * 0.45;
    fairyWingMaterial.color.set(settings.form === 'hero' ? 0xa2d2f5 : 0xffa0b3);
    fairyHaloMaterial.color.set(settings.form === 'hero' ? 0x71bafd : 0xff507c);
    for (let i = 0; i < 24; i++) {
      dummy.position.set(
        Math.sin(i * 37.8) * 2.4,
        ((i * 0.41 + motionTime * 0.08) % 5) - 2.5,
        Math.cos(i * 71.3) * 1.5 - 1,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.6 + (i % 3) * 0.3);
      dummy.updateMatrix();
      dust.setMatrixAt(i, dummy.matrix);
    }
    dust.instanceMatrix.needsUpdate = true;
    controls.update();
    renderer.render(scene, camera);
    frames++;
    if (now - lastReport > 1000) {
      report({
        backend,
        voxels: voxels.length,
        fps: Math.round((frames * 1000) / (now - lastReport)),
      });
      frames = 0;
      lastReport = now;
    }
  }
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  report({ backend, voxels: voxels.length, fps: 0 });
  raf = requestAnimationFrame(render);
  return {
    update(next) {
      if (next.form !== settings.form) formTransition = 0.8;
      const resized = next.pixelSize !== settings.pixelSize;
      settings = { ...next };
      if (resized) resize();
    },
    reset,
    zoom: setZoom,
    view(direction) {
      camera.position.set(0, 1, direction === 'front' ? 15 : -15);
      sculpture.rotation.y = 0;
      interactedUntil = performance.now() + 5000;
      controls.update();
    },
    async capture() {
      // Render and encode in the same task so both backends retain the drawing buffer.
      renderer.render(scene, camera);
      return new Promise<Blob>((resolve, reject) =>
        renderer.domElement.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('无法导出图像'))),
          'image/png',
        ),
      );
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onStart);
      controls.dispose();
      renderer.domElement.removeEventListener('keydown', keydown);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const mats = Array.isArray(object.material)
            ? object.material
            : [object.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
