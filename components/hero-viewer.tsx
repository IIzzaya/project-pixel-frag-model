'use client';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { SceneController, SceneSettings, SceneStats } from '@/lib/scene';

export type ViewerHandle = Pick<
  SceneController,
  'reset' | 'zoom' | 'view' | 'capture'
>;
export const HeroViewer = forwardRef<
  ViewerHandle,
  { settings: SceneSettings; onStats: (stats: SceneStats) => void }
>(function HeroViewer({ settings, onStats }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneController | null>(null);
  const currentSettings = useRef(settings);
  const report = useRef(onStats);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    currentSettings.current = settings;
    report.current = onStats;
  }, [settings, onStats]);
  useImperativeHandle(
    ref,
    () => ({
      reset: () => scene.current?.reset(),
      zoom: (f) => scene.current?.zoom(f),
      view: (d) => scene.current?.view(d),
      capture: async () => {
        if (!scene.current) throw new Error('模型尚未就绪');
        return scene.current.capture();
      },
    }),
    [],
  );
  useEffect(() => {
    let cancelled = false;
    import('@/lib/scene')
      .then(({ createScene }) =>
        cancelled
          ? null
          : createScene(host.current!, currentSettings.current, (s) =>
              report.current(s),
            ),
      )
      .then((controller) => {
        if (!controller) return;
        if (cancelled) {
          controller.dispose();
          return;
        }
        scene.current = controller;
        controller.update(currentSettings.current);
        setStatus('ready');
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('3D initialization failed:', error);
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [retry]);
  useEffect(() => {
    scene.current?.update(settings);
  }, [settings]);
  return (
    <>
      <div className="canvas-host" ref={host} />
      {status === 'loading' && (
        <output className="viewer-loading">
          <span className="loading-pixels" />
          正在组装像素…
        </output>
      )}
      {status === 'error' && (
        <div className="viewer-error" role="alert">
          <strong>暂时无法启动 3D 画面</strong>
          <p>请开启浏览器硬件加速，或使用支持 WebGL 2 的浏览器。</p>
          <button
            onClick={() => {
              setStatus('loading');
              setRetry((v) => v + 1);
            }}
          >
            重新加载
          </button>
        </div>
      )}
    </>
  );
});
