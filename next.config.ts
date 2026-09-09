import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // GitHub Pages serves this project under https://iizzaya.github.io/project-pixel-frag-model/
  basePath: '/project-pixel-frag-model',
  // NOTE: `output: 'export'` is intentionally NOT set (same as project-jelly /
  // project-qing-font): vinext cannot combine basePath with build-time
  // prerendering (the prerenderer requests basePath-less URLs and the RSC
  // handler answers 404). Instead, `scripts/prerender.mjs` boots the built
  // worker with `wrangler dev` and freezes the SSR HTML into
  // dist/client/project-pixel-frag-model/, which the Pages workflow deploys.
  //
  // Public assets referenced from JSX (`/favicon.svg`, `/ref.mp4`,
  // `/reference.vtt`) are NOT rewritten by basePath — they are prefixed via
  // `BASE_PATH` from `lib/paths.ts`.
};

export default nextConfig;
