# FRAG. / 像素英雄档案

参考 `ref.mp4` 制作的交互式三维像素英雄展示。保留绿帽、金发、尖耳、剑盾、漂浮精灵、暗影形态与横向碎片切换等视觉特征。模型为程序化三维再创作，并非原视频中的模型文件。

## 运行

需要 **Node.js 22.13+**（推荐 Node.js 24）和支持 WebGPU 或 WebGL 2 的现代浏览器。

```sh
npm ci
npm run dev
```

打开终端显示的 Local 地址，默认是 `http://localhost:5173/`。部分 Windows 环境监听 IPv6，请使用 `localhost`，不要替换为 `127.0.0.1`。

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

`npm start` 运行已经构建的生产 Worker。开发环境在 HTTP localhost 下也可以尝试 WebGPU；部署使用 HTTPS。浏览器没有可用的 WebGPU adapter 时，Three.js 自动回退 WebGL 2，页面显示实际使用的后端。

## 部署

线上地址：**https://iizzaya.github.io/project-pixel-frag-model/**（GitHub Pages，纯静态产物）。

管线：push 到 `main` → `.github/workflows/deploy.yml`（npm ci → typecheck → test → `vinext build` → `npm run prerender` → 上传 `dist/client/project-pixel-frag-model/` → deploy-pages）。

由于 vinext 的 `basePath` 与 `output: 'export'` 不能同用，静态化由 `scripts/prerender.mjs` 完成：启动构建出的 Worker（`wrangler dev`），抓取 SSR HTML 冻结为静态 `index.html` / `404.html`，并把 `public/` 资源复制进产物目录。`next.config.ts` 设置 `basePath: '/project-pixel-frag-model'`；JSX 与 metadata 中对 `public/` 资源的引用通过 `lib/paths.ts` 的 `BASE_PATH` 常量手工加前缀（vinext 不改写这些引用；`<Link>` 则相反，必须传不带前缀的路径）。

本地完整自检：

```sh
npm run typecheck && npm test && npm run lint
npm run build && npm run prerender
npx http-server dist/client   # 冒烟测试 /project-pixel-frag-model/ 子路径
```

## 交互

- 鼠标或单指拖动：环绕模型；滚轮或双指：缩放。
- 自动旋转可暂停，支持 0.5×、1×、2× 速度。拖动后 5 秒恢复自动旋转。
- 切换时之勇者 / 暗影形态，或播放 1.8 秒的解构与重组动画。
- 碎片滑杆控制真实体素位置；复古像素降低渲染分辨率，保留清晰像素边缘。
- 精灵开关、全屏展示、视角重置、透明 PNG 快照。
- 点选画布后，用方向键、`+` / `-`、`Home` 控制视角。操作指南中可直接查看正面 / 背面。
- 尊重系统减少动态效果设置；页面不可见时暂停渲染。

## 实现

使用 React 19、TypeScript、Three.js 0.186、Vinext / Vite 与已提供的 Base UI / Shadcn 无障碍控件。

| 文件                         | 作用                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `lib/voxel-model.ts`         | 头部、身体、四肢、剑盾八个部件的体素建模、双形态配色、确定性碎片算法 |
| `lib/scene.ts`               | WebGPU / WebGL 2 渲染、InstancedMesh、正交相机、灯光、精灵与动画     |
| `components/hero-viewer.tsx` | 异步加载、React 生命周期、错误恢复和控制接口                         |
| `app/page.tsx`               | 中文展示页与交互面板                                                 |
| `app/globals.css`            | 舞台视觉、双形态样式、移动端布局与焦点样式                           |
| `tests/voxel-model.test.mjs` | 几何完整性、双配色、碎片确定性与精确重组检查                         |

模型使用仅保留表面体素的单个 InstancedMesh；完整形态下不重复更新实例矩阵。Three.js 按需加载，页面文字和控件先于三维模块显示。像素不是视频贴图，能够自由改变视角。快照导出模型与精灵，背景透明，不包含页面装饰和面板。

## 验证与边界

已运行 TypeScript、项目源码 lint、5 项模型测试及生产构建。预置 UI 组件目录保持原样，不纳入应用源码 lint。

使用独立的正交投影程序检查了模型的正面、背面与暗影轮廓；这是几何验证图，**不是浏览器截图**。未进行浏览器自动化操作或真机 GPU / PNG 下载验证；实际帧率取决于显卡、窗口大小与显示分辨率。页面不包含需要持久化数据的工作流。

可重新生成几何检查图（需要 Python 与 Pillow，仅开发使用）：

```sh
npm run model:export
python scripts/inspect-model.py
```

输出在 `.artifacts/`，不会纳入 Git。测试使用 Node.js 的实验性 TypeScript transform，实验特性提示不代表测试失败。

## 参考与来源

原始参考视频署名 **@ARTOFSULLY**，保留于 `ref.mp4`，页面“创作参考”可播放副本。角色及相关标识归各自权利人所有。该项目为参考视频的学习与视觉再创作。

技术参考：[Three.js WebGPURenderer](https://threejs.org/manual/en/webgpurenderer)、[InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)。

项目使用 Git 的 `main` 分支管理。依赖、构建产物、临时检查图和环境配置不提交；Sites 托管标识保存在 `.openai/hosting.json`，访问凭证不写入仓库。
