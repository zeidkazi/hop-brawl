import {
  ACESFilmicToneMapping, Color, DirectionalLight, Fog, HalfFloatType, HemisphereLight,
  Mesh, MeshBasicMaterial, OrthographicCamera, PCFShadowMap, PCFSoftShadowMap, PlaneGeometry,
  Scene, SRGBColorSpace, WebGLRenderer, WebGLRenderTarget,
} from 'three';
import { COLORS, CONFIG, QUALITY, VIEW } from '../../../shared/config';
import { CameraRig } from './camera';
import type { Station } from './camera';
import { Particles } from './particles';
import { QualityController } from './quality';
import type { GraphicsChoice, Tier } from './quality';
import { WorldView } from './world-view';

export class GameRenderer {
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;
  readonly rig: CameraRig;
  readonly world = new WorldView();
  readonly particles = new Particles();
  readonly quality: QualityController;
  readonly sun = new DirectionalLight(COLORS.sun, VIEW.SUN_INTENSITY);
  readonly metrics = { frames: 0, calls: 0, triangles: 0, geometries: 0, textures: 0, delta: 0 };
  readonly target = new WebGLRenderTarget(1, 1, { samples: QUALITY.high.samples, type: HalfFloatType });
  private readonly output = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({ map: this.target.texture, depthTest: false, depthWrite: false }));
  private readonly outputCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly highShadow;
  private readonly mediumShadow;
  private width = 1;
  private height = 1;
  private previous = 0;
  private clockStart = 0;
  private nextFrame = 0;
  private resizeTimer = 0;
  private frameId = 0;
  private appliedTier: Tier | null = null;
  playing = false;
  onFrame: ((now: number) => void) | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!context) throw new Error('WEBGL_UNSUPPORTED');
    this.renderer = new WebGLRenderer({ canvas, context, antialias: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.info.autoReset = false;
    const mobile = navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches;
    this.quality = new QualityController(mobile);
    this.width = window.innerWidth; this.height = window.innerHeight;
    this.rig = new CameraRig(this.width / this.height);
    this.scene.background = new Color(COLORS.sky);
    this.scene.fog = new Fog(COLORS.sky, VIEW.LOBBY_DISTANCE, VIEW.FAR / 2);
    this.scene.add(this.world.root, this.particles.mesh, new HemisphereLight(COLORS.sky, COLORS.groundSide, VIEW.HEMISPHERE_INTENSITY), this.sun, this.sun.target);
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
    this.resize();
    window.addEventListener('resize', this.queueResize);
    document.addEventListener('visibilitychange', this.visibility);
  }

  private readonly queueResize = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(this.resize, VIEW.RESIZE_DEBOUNCE_MS);
  };
  private readonly resize = (): void => {
    this.width = Math.max(1, window.innerWidth); this.height = Math.max(1, window.innerHeight);
    this.rig.resize(this.width / this.height);
    this.applyQuality();
  };
  private readonly visibility = (): void => {
    this.previous = 0; this.nextFrame = 0;
    this.quality.reset();
  };

  applyQuality(): void {
    const tier = this.quality.tier;
    if (tier !== this.appliedTier) {
      this.world.applyTier(tier);
      this.particles.tier = tier;
      this.renderer.shadowMap.enabled = tier !== 'low';
      this.renderer.shadowMap.autoUpdate = tier !== 'low';
      this.renderer.shadowMap.type = tier === 'high' ? PCFSoftShadowMap : PCFShadowMap;
      this.sun.shadow = tier === 'high' ? this.highShadow : this.mediumShadow;
      this.appliedTier = tier;
    }
    const ratio = this.quality.pixelRatio(window.devicePixelRatio);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.width, this.height, false);
    this.target.setSize(Math.max(1, Math.floor(this.width * ratio)), Math.max(1, Math.floor(this.height * ratio)));
  }

  setGraphics(choice: GraphicsChoice): void { this.quality.setChoice(choice); this.applyQuality(); }
  go(station: Station): void { this.world.station = station; this.rig.go(station); }
  setReducedMotion(value: boolean): void { this.rig.reducedMotion = value; this.particles.reducedMotion = value; }

  async warmup(): Promise<void> {
    const initialTier = this.quality.tier;
    for (const tier of ['high', 'medium', 'low'] as const) {
      this.quality.tier = tier; this.applyQuality();
      this.world.update(0);
      await this.renderer.compileAsync(this.scene, this.rig.camera);
      this.draw();
    }
    this.renderer.compile(this.output, this.outputCamera);
    this.quality.tier = initialTier; this.applyQuality();
    this.draw();
  }

  private draw(): void {
    const z = this.rig.camZ;
    this.sun.position.set(-3, 14, -z + 6);
    this.sun.target.position.set(4, 0, -z - 6);
    this.renderer.info.reset();
    if (this.quality.tier === 'high') {
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(this.scene, this.rig.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.output, this.outputCamera);
    } else this.renderer.render(this.scene, this.rig.camera);
    this.metrics.calls = this.renderer.info.render.calls;
    this.metrics.triangles = this.renderer.info.render.triangles;
    this.metrics.geometries = this.renderer.info.memory.geometries;
    this.metrics.textures = this.renderer.info.memory.textures;
  }

  start(): void {
    if (this.frameId) return;
    this.clockStart = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    this.frameId = requestAnimationFrame(this.frame);
    if (document.hidden || now + VIEW.FRAME_TOLERANCE_MS < this.nextFrame) return;
    const step = 1000 / VIEW.FPS_CAP;
    this.nextFrame = now + step - (this.nextFrame ? Math.max(0, now - this.nextFrame) % step : 0);
    const delta = this.previous ? now - this.previous : step;
    this.previous = now;
    this.metrics.delta = delta;
    const dt = Math.min(VIEW.MAX_DELTA_MS, delta) / 1000;
    const time = (now - this.clockStart) / 1000;
    if (time * 1000 > VIEW.FRAME_WINDOW_MS && this.quality.sample(now, delta, this.playing)) this.applyQuality();
    this.rig.update(dt, time);
    this.world.requestWindow(this.rig.camZ);
    this.world.update(time);
    this.particles.update(dt);
    this.draw();
    this.metrics.frames++;
    this.onFrame?.(now);
  };
}
