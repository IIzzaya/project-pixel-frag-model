'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  CircleHelp,
  Expand,
  Focus,
  Layers3,
  Minus,
  Moon,
  MousePointer2,
  MoveUpRight,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { HeroViewer, type ViewerHandle } from '@/components/hero-viewer';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { SceneStats } from '@/lib/scene';
import type { Form } from '@/lib/voxel-model';
import Link from 'next/link';
const subscribeMotion = (callback: () => void) => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
const getMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Home() {
  const [form, setForm] = useState<Form>('hero');
  const [wantsRotation, setRotating] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getMotion,
    () => false,
  );
  const rotating = wantsRotation ?? !reducedMotion;
  const [speed, setSpeed] = useState(1);
  const [fragments, setFragments] = useState(0);
  const [pixelSize, setPixelSize] = useState(1);
  const [fairy, setFairy] = useState(true);
  const [stats, setStats] = useState<SceneStats>({
    backend: 'INITIALIZING',
    voxels: 0,
    fps: 0,
  });
  const [reference, setReference] = useState(false);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState('');
  const [replaying, setReplaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const viewer = useRef<ViewerHandle>(null);
  const stage = useRef<HTMLDivElement>(null);
  const replayFrame = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settings = useMemo(
    () => ({ form, rotating, speed, fragments, pixelSize, fairy }),
    [form, rotating, speed, fragments, pixelSize, fairy],
  );
  const isShadow = form === 'shadow';
  const notify = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3500);
  }, []);
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', change);
    return () => {
      cancelAnimationFrame(replayFrame.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      document.removeEventListener('fullscreenchange', change);
    };
  }, []);
  const stopReplay = () => {
    cancelAnimationFrame(replayFrame.current);
    setReplaying(false);
  };
  function chooseForm(next: Form) {
    stopReplay();
    setFragments(0);
    setForm(next);
  }
  function replay() {
    if (reducedMotion) {
      chooseForm(form === 'hero' ? 'shadow' : 'hero');
      return;
    }
    stopReplay();
    setReplaying(true);
    setFragments(0);
    const start = performance.now();
    let changed = false;
    const original = form;
    const animate = (now: number) => {
      const p = Math.min((now - start) / 1800, 1);
      setFragments(Math.round(Math.sin(p * Math.PI) * 85));
      if (p >= 0.48 && !changed) {
        changed = true;
        setForm(original === 'hero' ? 'shadow' : 'hero');
      }
      if (p < 1) replayFrame.current = requestAnimationFrame(animate);
      else {
        setFragments(0);
        setReplaying(false);
      }
    };
    replayFrame.current = requestAnimationFrame(animate);
  }
  function reset() {
    stopReplay();
    setFragments(0);
    setSpeed(1);
    setPixelSize(1);
    setFairy(true);
    setRotating(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    viewer.current?.reset();
    notify('视角与展示参数已重置');
  }
  async function capture() {
    try {
      const blob = await viewer.current!.capture();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frag-${form}-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify('模型快照已保存为透明 PNG');
    } catch {
      notify('画面尚未就绪，请稍后重试');
    }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch {
      notify('此浏览器不支持全屏，可使用浏览器的全屏功能');
    }
  }
  const ready = stats.voxels > 0;
  return (
    <div className={`studio-page ${isShadow ? 'shadow-form' : ''}`}>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="FRAG 首页">
          <span className="brand-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            FRAG<span className="brand-period">.</span>
          </span>
          <span className="brand-caption">
            PIXEL OBJECTS
            <br />
            IN THREE DIMENSIONS
          </span>
        </Link>
        <div className="header-center">
          <span className="status-dot" /> INTERACTIVE OBJECT ARCHIVE
        </div>
        <button
          className="text-button reference-link"
          onClick={() => setReference(true)}
        >
          创作参考 <ArrowUpRight size={16} />
        </button>
      </header>
      <main>
        <div className="page-intro">
          <div>
            <div className="eyebrow">
              <span>COLLECTION 001</span>
              <span className="tiny-divider" /> THE LEGEND, IN PIXELS
            </div>
            <h1>
              小小像素，<span>无畏勇者。</span>
              <span className="title-square" />
            </h1>
          </div>
          <p>
            熟悉的英雄，全新的维度。
            <br />
            <span>旋转、探索，或让一切重新组合。</span>
          </p>
        </div>
        <section className="workspace" aria-label="像素英雄展示工作台">
          <div className="display-column">
            <div className="stage" ref={stage}>
              <div className="stage-topline">
                <span className="live-badge">
                  <span className="status-dot" />
                  {ready ? 'LIVE VIEW' : 'LOADING'}
                </span>
                <span className="stage-object-id">
                  OBJECT / {isShadow ? '002' : '001'}
                </span>
                <button
                  className="icon-button"
                  title={fullscreen ? '退出全屏' : '全屏展示'}
                  aria-label={fullscreen ? '退出全屏' : '全屏展示'}
                  onClick={toggleFullscreen}
                >
                  {fullscreen ? <X size={18} /> : <Expand size={18} />}
                </button>
              </div>
              <div className="stage-word" aria-hidden="true">
                {isShadow ? 'SHADOW' : 'COURAGE'}
              </div>
              <div className="stage-art" aria-hidden="true">
                <div className="art-outline" />
                <div className="art-panel">
                  <span />
                  <span />
                </div>
                <div className="art-stripes">
                  <i />
                  <i />
                  <i />
                  <b>△</b>
                </div>
              </div>
              <div className="stage-cross cross-tl" aria-hidden="true">
                +
              </div>
              <div className="stage-cross cross-br" aria-hidden="true">
                +
              </div>
              <div className="stage-side-label" aria-hidden="true">
                A HERO IN EVERY FRAGMENT
              </div>
              <HeroViewer ref={viewer} settings={settings} onStats={setStats} />
              <div className="stage-bottomline">
                <span>
                  <MousePointer2 size={14} /> 拖动旋转
                  <span className="hint-divider">/</span>滚轮缩放
                </span>
                <div className="zoom-controls">
                  <button
                    className="icon-button"
                    title="缩小"
                    aria-label="缩小"
                    disabled={!ready}
                    onClick={() => viewer.current?.zoom(1 / 1.15)}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    className="icon-button"
                    title="重置视角"
                    aria-label="重置视角"
                    disabled={!ready}
                    onClick={() => viewer.current?.reset()}
                  >
                    <Focus size={17} />
                  </button>
                  <button
                    className="icon-button"
                    title="放大"
                    aria-label="放大"
                    disabled={!ready}
                    onClick={() => viewer.current?.zoom(1.15)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="transport">
              <button
                className="play-button"
                disabled={!ready}
                aria-label={rotating ? '暂停自动旋转' : '开始自动旋转'}
                onClick={() => setRotating(!rotating)}
              >
                {rotating ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </button>
              <div className="transport-copy">
                <strong>360° 环绕展示</strong>
                <span>{rotating ? '正在自动旋转' : '旋转已暂停'}</span>
              </div>
              <div
                className={`rotation-track ${rotating ? 'running' : ''}`}
                aria-hidden="true"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
              <RadioGroup
                className="speed-options"
                value={speed}
                onValueChange={(v) => setSpeed(Number(v))}
                aria-label="自动旋转速度"
              >
                {[0.5, 1, 2].map((v) => (
                  <label key={v} className={speed === v ? 'selected' : ''}>
                    <RadioGroupItem value={v} />
                    <span>{v}×</span>
                  </label>
                ))}
              </RadioGroup>
              <button
                className="icon-button transport-reset"
                title="重置所有展示参数"
                aria-label="重置所有展示参数"
                onClick={reset}
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>
          <aside className="inspector" aria-label="模型设置">
            <div className="object-heading">
              <div className="eyebrow">
                {isShadow ? 'THE OTHER SIDE' : 'THE HERO OF TIME'}
                <span>0{isShadow ? '2' : '1'}</span>
              </div>
              <div className="object-title">
                <h2>{isShadow ? '暗影林克' : '林克'}</h2>
                <span className="object-tag">
                  {isShadow ? 'DARK LINK' : 'LINK'}
                </span>
              </div>
              <p>
                {isShadow
                  ? '当勇气投下影子，另一个自己悄然苏醒。'
                  : '一顶绿帽，一柄长剑。冒险从未结束。'}
              </p>
            </div>
            <div className="control-section">
              <div className="section-label">
                <span>角色形态</span>
                <span>APPEARANCE</span>
              </div>
              <RadioGroup
                className="form-options"
                value={form}
                onValueChange={(v) => chooseForm(v as Form)}
                aria-label="角色形态"
              >
                <label className={`form-option ${!isShadow ? 'selected' : ''}`}>
                  <RadioGroupItem value="hero" />
                  <span className="form-emblem hero-emblem">
                    <Sun size={22} />
                  </span>
                  <span>
                    <strong>时之勇者</strong>
                    <small>Original</small>
                  </span>
                  {!isShadow && <Check className="form-check" size={15} />}
                </label>
                <label className={`form-option ${isShadow ? 'selected' : ''}`}>
                  <RadioGroupItem value="shadow" />
                  <span className="form-emblem shadow-emblem">
                    <Moon size={20} />
                  </span>
                  <span>
                    <strong>暗影形态</strong>
                    <small>Shadow</small>
                  </span>
                  {isShadow && <Check className="form-check" size={15} />}
                </label>
              </RadioGroup>
            </div>
            <div className="control-section fragment-section">
              <div className="section-label">
                <span id="fragment-label">碎片解构</span>
                <output>
                  {String(fragments).padStart(2, '0')}
                  <span>%</span>
                </output>
              </div>
              <Slider
                aria-labelledby="fragment-label"
                value={[fragments]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => {
                  stopReplay();
                  setFragments(Array.isArray(v) ? v[0] : v);
                }}
                className="fragment-slider"
              />
              <div className="range-captions">
                <span>完整形态</span>
                <span>像素散落</span>
              </div>
            </div>
            <div className="control-section switches">
              <div>
                <label htmlFor="fairy-switch">
                  <Sparkles size={16} /> 精灵相伴
                </label>
                <Switch
                  id="fairy-switch"
                  checked={fairy}
                  onCheckedChange={setFairy}
                />
              </div>
              <div>
                <label htmlFor="pixel-switch">
                  <Box size={16} /> 复古像素
                </label>
                <Switch
                  id="pixel-switch"
                  checked={pixelSize === 2.5}
                  onCheckedChange={(v) => setPixelSize(v ? 2.5 : 1)}
                />
              </div>
            </div>
            <div className="palette-section">
              <div className="section-label">
                <span>角色配色</span>
                <span>{isShadow ? 'SHADOW TONES' : 'HYRULE TONES'}</span>
              </div>
              <div className="swatches">
                {(isShadow
                  ? [
                      '#333b38',
                      '#a9ada6',
                      '#847898',
                      '#733e52',
                      '#e52a52',
                      '#b2c8ce',
                    ]
                  : [
                      '#3f812f',
                      '#eeb129',
                      '#edbd90',
                      '#793e38',
                      '#2c549e',
                      '#bedfe5',
                    ]
                ).map((c) => (
                  <span key={c} style={{ background: c }} title={c} />
                ))}
                <span className="palette-note">
                  06
                  <br />
                  COLORS
                </span>
              </div>
            </div>
            <div className="inspector-actions">
              <button
                className="primary-button"
                disabled={!ready || replaying}
                onClick={replay}
              >
                <Layers3 size={18} />
                {replaying ? '像素重组中…' : '解构，切换另一面'}
                <MoveUpRight size={18} />
              </button>
              <button
                className="secondary-button"
                disabled={!ready}
                onClick={capture}
              >
                <ArrowDownToLine size={16} /> 保存模型快照 <span>PNG</span>
              </button>
            </div>
          </aside>
        </section>
        <div className="archive-details">
          <div className="detail-item">
            <span className="detail-icon">
              <Box size={20} />
            </span>
            <div>
              <span>构成方式</span>
              <strong>VOXEL SCULPTURE</strong>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">
              <Layers3 size={20} />
            </span>
            <div>
              <span>表面体素</span>
              <strong>
                {ready ? stats.voxels.toLocaleString('en-US') : '—'}{' '}
                <small>BLOCKS</small>
              </strong>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-icon">
              <span className="status-dot" />
            </span>
            <div>
              <span>实时渲染</span>
              <strong>
                {stats.backend}{' '}
                <small>{stats.fps > 0 ? `${stats.fps} FPS` : ''}</small>
              </strong>
            </div>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            操作指南 <CircleHelp size={17} />
          </button>
        </div>
      </main>
      <footer className="site-footer">
        <span>
          FRAG. <span className="footer-muted">用像素，重塑想象。</span>
        </span>
        <span className="footer-credit">
          视觉灵感{' '}
          <button onClick={() => setReference(true)}>
            @ARTOFSULLY <ArrowUpRight size={12} />
          </button>
        </span>
        <span className="footer-index">
          EXPERIMENT 001 <span>© 2026</span>
        </span>
      </footer>
      {notice && (
        <output className="notice">
          <Check size={16} />
          {notice}
        </output>
      )}
      <Dialog open={reference} onOpenChange={setReference}>
        <DialogContent className="reference-dialog">
          <DialogTitle>创作参考</DialogTitle>
          <DialogDescription>
            原始参考视频 ·
            @ARTOFSULLY。此页面为基于视频的三维再创作，模型使用程序化体素构建。
          </DialogDescription>
          <video controls playsInline preload="metadata" src="/ref.mp4">
            <track
              kind="captions"
              src="/reference.vtt"
              srcLang="zh"
              label="画面描述"
            />
          </video>
          <div className="dialog-meta">
            <span>REFERENCE / 17 SECONDS</span>
            <span>750 × 750</span>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog">
          <DialogTitle>探索这个小小世界</DialogTitle>
          <DialogDescription>
            鼠标、触摸和键盘都可以控制模型。
          </DialogDescription>
          <dl>
            <div>
              <dt>旋转视角</dt>
              <dd>拖动 / 方向键 ← →</dd>
            </div>
            <div>
              <dt>俯仰视角</dt>
              <dd>上下拖动 / ↑ ↓</dd>
            </div>
            <div>
              <dt>缩放模型</dt>
              <dd>滚轮 / 双指缩放 / + −</dd>
            </div>
            <div>
              <dt>重置视角</dt>
              <dd>取景框按钮 / Home</dd>
            </div>
            <div>
              <dt>切换形态</dt>
              <dd>选择角色，或播放解构动画</dd>
            </div>
          </dl>
          <p>
            使用键盘控制前，请先点选模型画面。拖动时自动旋转会暂缓，松开后 5
            秒恢复。
          </p>
          <div className="quick-views">
            <button
              onClick={() => {
                viewer.current?.view('front');
                setHelp(false);
              }}
            >
              查看正面 <ChevronRight size={16} />
            </button>
            <button
              onClick={() => {
                viewer.current?.view('back');
                setHelp(false);
              }}
            >
              查看背面 <ChevronRight size={16} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
