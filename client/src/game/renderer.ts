import {
  Color, DirectionalLight, Fog, HalfFloatType, HemisphereLight,
  Mesh, MeshBasicMaterial, OrthographicCamera, PCFShadowMap, PlaneGeometry,
  Scene, SRGBColorSpace, WebGLRenderer, WebGLRenderTarget, LinearToneMapping,
  Material,
} from 'three';
import { COLORS, CONFIG, QUALITY, QUALITY_DEGRADE, SOLO, STREET, VIEW } from '../../../shared/config';
import { CameraRig, gameplayDistance } from './camera';
import type { Station } from './camera';
import { Particles } from './particles';
import { QualityController } from './quality';
import type { GraphicsChoice, Tier } from './quality';
import { WorldView } from './world-view';
import { HomeScene } from './home-scene';
import { createSky } from './sky';
import { prepareDesaturation } from './desaturation';

export class GameRenderer {
  readonly desaturation = { value: 0 };
  private readonly preparedMaterials = new WeakSet<Material>();
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;
  readonly rig: CameraRig;
  readonly world = new WorldView();
  readonly home = new HomeScene();
  readonly sky = createSky(this.desaturation);
  readonly particles = new Particles();
  readonly quality: QualityController;
  readonly sun = new DirectionalLight(COLORS.sun, VIEW.SUN_INTENSITY);
  readonly rim = new DirectionalLight(STREET.RIM_COLOR, STREET.RIM_INTENSITY);
  readonly metrics = { frames: 0, calls: 0, triangles: 0, geometries: 0, textures: 0, delta: 0 };
  readonly target = new WebGLRenderTarget(1, 1, { samples: QUALITY.high.samples, type: HalfFloatType });
  private readonly output = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({ map: this.target.texture, depthTest: false, depthWrite: false }));
  private readonly outputCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly highShadow;
  private readonly mediumShadow;
  private readonly reducedShadow;
  private width = 1;
  private height = 1;
  private previous = 0;
  private clockStart = 0;
  private nextFrame = 0;
  private resizeTimer = 0;
  private frameId = 0; private started = false; private background = false;
  private appliedTier: Tier | null = null;
  playing = false;
  onFrame: ((now: number) => void) | null = null;
  beforeFrame: ((now: number, dt: number) => void) | null = null;
  onDiscontinuity: (() => void) | null = null;
  worldTime: number | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!context) throw new Error('WEBGL_UNSUPPORTED');
    this.renderer = new WebGLRenderer({ canvas, context, antialias: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = LinearToneMapping;
    this.renderer.info.autoReset = false;
    const mobile = navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches;
    this.quality = new QualityController(mobile);
    this.width = window.innerWidth; this.height = window.innerHeight;
    this.rig = new CameraRig(this.width / this.height);
    this.scene.background = new Color(COLORS.sky);
    this.scene.fog = new Fog(COLORS.sky, VIEW.LOBBY_DISTANCE, VIEW.FAR / 2);
    this.scene.add(this.sky, this.world.root, this.particles.mesh, new HemisphereLight(COLORS.sky, COLORS.groundSide, VIEW.HEMISPHERE_INTENSITY), this.sun, this.sun.target);
    this.rim.position.set(...STREET.RIM_POSITION); this.rim.target.position.set(4, 0, -1);
    this.scene.add(this.rim, this.rim.target);
    this.sun.castShadow = true;
    this.sun.shadow.bias = VIEW.SHADOW_BIAS;
    this.sun.shadow.normalBias = VIEW.SHADOW_NORMAL_BIAS;
    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = -CONFIG.COLUMNS / 2 - VIEW.SHADOW_MARGIN;
    shadowCamera.right = CONFIG.COLUMNS / 2 + VIEW.SHADOW_MARGIN;
    shadowCamera.top = CONFIG.VIEW_ROWS / 2 + VIEW.SHADOW_MARGIN;
    shadowCamera.bottom = -CONFIG.VIEW_ROWS / 2 - VIEW.SHADOW_MARGIN;
    shadowCamera.far = VIEW.FAR;
    shadowCamera.updateProjectionMatrix();
    this.highShadow = this.sun.shadow;
    this.highShadow.mapSize.setScalar(QUALITY.high.shadowSize);
    this.mediumShadow = this.highShadow.clone();
    this.mediumShadow.mapSize.setScalar(QUALITY.medium.shadowSize);
    this.reducedShadow = this.highShadow.clone();
    this.reducedShadow.mapSize.setScalar(QUALITY_DEGRADE.SHADOW_SIZE_REDUCED);
    this.resize();
    // Start the resolve shader while asset bytes are still arriving.
    this.renderer.compile(this.output, this.outputCamera);
    window.addEventListener('resize', this.queueResize);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('pagehide', this.hide);
    window.addEventListener('pageshow', this.visibility);
  }

  private readonly queueResize = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(this.resize, VIEW.RESIZE_DEBOUNCE_MS);
  };
  private readonly resize = (): void => {
    this.width = Math.max(1, window.innerWidth); this.height = Math.max(1, window.innerHeight);
    this.rig.resize(this.width / this.height);
    this.updateFog();
    if (this.home.root.children.length) this.home.layout(this.rig.camera);
    this.applyQuality();
  };
  private readonly hide = (): void => {
    this.background = true; cancelAnimationFrame(this.frameId); this.frameId = 0;
  };
  private readonly visibility = (): void => {
    if (document.hidden) { this.hide(); return; }
    this.background = false;
    this.home.finishIntro(); this.onDiscontinuity?.();
    if (this.started && !this.frameId) this.frameId = requestAnimationFrame(this.frame);
    this.previous = 0; this.nextFrame = 0;
    this.quality.reset();
  };

  applyQuality(): void {
    const tier = this.quality.tier;
    if (tier !== this.appliedTier) {
      this.world.applyTier(tier);
      this.home.applyTier(tier);
      this.particles.tier = tier;
      this.renderer.shadowMap.enabled = tier !== 'low';
      this.renderer.shadowMap.autoUpdate = tier !== 'low';
      // r182+ PCF includes soft filtering; the former PCFSoft enum is removed.
      this.renderer.shadowMap.type = PCFShadowMap;
      this.sun.shadow = tier === 'high' ? this.highShadow : this.mediumShadow;
      this.appliedTier = tier;
    }
    this.particles.density = this.quality.particleScale;
    for (const outlines of [this.world.outlines, this.home.outlines, this.home.arena?.outlines]) {
      outlines?.applyTier(tier);
      if (!this.quality.propOutlines) for (const entry of outlines?.entries ?? []) if (entry.kind === 'prop') entry.shell.visible = false;
    }
    this.renderer.shadowMap.enabled = this.renderer.shadowMap.autoUpdate = this.quality.shadowSize > 0;
    this.sun.shadow = this.quality.shadowSize === QUALITY_DEGRADE.SHADOW_SIZE_REDUCED ? this.reducedShadow
      : tier === 'high' ? this.highShadow : this.mediumShadow;
    const ratio = this.quality.pixelRatio(window.devicePixelRatio, this.playing);
    const width = Math.ceil(this.width * ratio), height = Math.ceil(this.height * ratio);
    this.renderer.setDrawingBufferSize(width / ratio, height / ratio, ratio);
    this.target.setSize(width, height);
  }

  setGraphics(choice: GraphicsChoice): void { this.quality.setChoice(choice); this.applyQuality(); }
  go(station: Station): void {
    this.world.station = station; this.rig.go(station);
    this.updateFog();
    this.home.root.visible = station !== 'gameplay' && station !== 'soloEnd';
    this.world.root.visible = !this.home.root.visible;
  }
  private updateFog(): void {
    if (!(this.scene.fog instanceof Fog)) return;
    const playing = this.rig.station === 'gameplay' || this.rig.station === 'soloEnd';
    this.scene.fog.near = playing ? gameplayDistance(this.width / this.height) + SOLO.FOG_MARGIN : VIEW.LOBBY_DISTANCE;
    this.scene.fog.far = playing ? this.scene.fog.near + VIEW.FAR / 2 : VIEW.FAR / 2;
  }
  setReducedMotion(value: boolean): void { this.rig.reducedMotion = value; this.particles.reducedMotion = value; this.home.setReduced(value); }

  async warmup(): Promise<void> {
    await this.home.load();
    this.world.installModels(this.home.models);
    performance.mark('hop-assets-ready');
    this.scene.add(this.home.root);
    this.home.layout(this.rig.camera);
    this.home.warmAll(true);
    const initialTier = this.quality.tier;
    for (const tier of ['high', 'medium', 'low'] as const) {
      this.quality.tier = tier; this.applyQuality();
      this.world.update(0);
      prepareDesaturation(this.scene, this.desaturation, this.preparedMaterials);
      await this.renderer.compileAsync(this.scene, this.rig.camera);
      this.draw();
      performance.mark(`hop-warm-${tier}`);
    }
    this.home.warmAll(false);
    this.world.root.visible = false;
    this.quality.tier = initialTier; this.applyQuality();
    this.draw();
  }

  private draw(): void {
    this.sky.position.copy(this.rig.camera.position);
    const z = this.rig.camZ;
    this.sun.position.set(-3, 14, -z + 6);
    this.sun.target.position.set(4, 0, -z - 6);
    this.renderer.info.reset();
    if (this.quality.tier === 'high') {
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(this.scene, this.rig.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.output, this.outputCamera);
    } else { this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.rig.camera); }
    this.metrics.calls = this.renderer.info.render.calls;
    this.metrics.triangles = this.renderer.info.render.triangles;
    this.metrics.geometries = this.renderer.info.memory.geometries;
    this.metrics.textures = this.renderer.info.memory.textures;
  }

  start(intro = true): void {
    if (this.started) return;
    this.started = true;
    this.clockStart = performance.now();
    if (intro) this.home.playIntro();
    if (!document.hidden && !this.background) this.frameId = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    this.frameId = 0;
    if (this.background || document.hidden) return;
    this.frameId = requestAnimationFrame(this.frame);
    if (now + VIEW.FRAME_TOLERANCE_MS < this.nextFrame) return;
    const step = 1000 / VIEW.FPS_CAP;
    this.nextFrame = now + step - (this.nextFrame ? Math.max(0, now - this.nextFrame) % step : 0);
    const delta = this.previous ? now - this.previous : step;
    if (delta > VIEW.PAUSE_GAP_MS) { this.home.finishIntro(); this.onDiscontinuity?.(); }
    this.previous = now;
    this.metrics.delta = delta;
    const dt = Math.min(VIEW.MAX_DELTA_MS, delta) / 1000;
    const time = (now - this.clockStart) / 1000;
    this.beforeFrame?.(now, dt);
    if (time * 1000 > VIEW.FRAME_WINDOW_MS && this.quality.sample(now, delta, this.playing)) this.applyQuality();
    this.rig.update(dt, time);
    this.world.requestWindow(this.rig.camZ);
    this.world.setView(this.rig.camera);
    this.world.update(this.worldTime ?? time);
    if (this.home.root.visible) this.home.update(time);
    this.particles.mesh.boundingSphere!.center.set(4, 0, -this.rig.camZ);
    this.particles.mesh.boundingSphere!.radius = VIEW.POOL_ROWS;
    this.particles.update(dt);
    this.draw();
    this.metrics.frames++;
    this.onFrame?.(now);
  };
}
