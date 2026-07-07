import { useEffect, useRef } from "react";
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import "./CircularGallery.css";

export interface CircularGalleryItem {
  image: string;
  text: string;
}

interface CircularGalleryProps {
  items?: CircularGalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  onItemClick?: (index: number) => void;
}

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function lerp(p1: number, p2: number, t: number) {
  return p1 + (p2 - p1) * t;
}

function getFontSize(font: string) {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(gl: any, text: string, font = "bold 30px sans-serif", color = "#ffffff") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const fontSize = getFontSize(font);
  const textHeight = Math.ceil(fontSize * 1.4);
  canvas.width = textWidth + 24;
  canvas.height = textHeight + 24;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class TitleMesh {
  constructor(gl: any, plane: any, text: string, textColor: string, font: string) {
    const { texture, width, height } = createTextTexture(gl, text, font, textColor);
    const geometry = new Plane(gl);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    const mesh = new Mesh(gl, { geometry, program });
    const aspect = width / height;
    const textHeightScaled = plane.scale.y * 0.18;
    const textWidthScaled = textHeightScaled * aspect;
    mesh.scale.set(textWidthScaled, textHeightScaled, 1);
    mesh.position.y = -plane.scale.y * 0.5 - textHeightScaled * 0.65;
    mesh.setParent(plane);
  }
}

class Media {
  extra = 0;
  speed = 0;
  isBefore = false;
  isAfter = false;
  x = 0;
  width = 0;
  widthTotal = 0;
  scale = 1;
  plane: any;
  program: any;

  constructor(private opts: {
    geometry: any; gl: any; image: string; index: number; length: number;
    scene: any; screen: { width: number; height: number };
    viewport: { width: number; height: number }; text: string;
    bend: number; textColor: string; borderRadius: number; font: string;
    onClick?: () => void;
  }) {
    this.createShader();
    this.createMesh();
    new TitleMesh(opts.gl, this.plane, opts.text, opts.textColor, opts.font);
    this.onResize({ screen: opts.screen, viewport: opts.viewport });
  }

  createShader() {
    const { gl, image, borderRadius } = this.opts;
    const texture = new Texture(gl, { generateMipmaps: true });
    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.002, 0.002, d);
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uBorderRadius: { value: borderRadius },
      },
      transparent: true,
    });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.opts.gl, { geometry: this.opts.geometry, program: this.program });
    this.plane.setParent(this.opts.scene);
  }

  update(scroll: { current: number; last: number }, direction: "left" | "right") {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.opts.viewport.width / 2;

    if (this.opts.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const bendAbs = Math.abs(this.opts.bend);
      const R = (H * H + bendAbs * bendAbs) / (2 * bendAbs);
      const effectiveX = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(Math.max(R * R - effectiveX * effectiveX, 0));
      if (this.opts.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.opts.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen: { width: number; height: number }; viewport: { width: number; height: number } }) {
    this.opts.screen = screen;
    this.opts.viewport = viewport;
    this.scale = screen.height / 1500;
    this.plane.scale.y = (viewport.height * (900 * this.scale)) / screen.height;
    this.plane.scale.x = (viewport.width * (700 * this.scale)) / screen.width;
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    const padding = 2;
    this.width = this.plane.scale.x + padding;
    this.widthTotal = this.width * this.opts.length;
    this.x = this.width * this.opts.index;
  }
}

class GalleryApp {
  gl: any;
  renderer: Renderer;
  camera: Camera;
  scene: Transform;
  planeGeometry: any;
  medias: Media[] = [];
  screen = { width: 0, height: 0 };
  viewport = { width: 0, height: 0 };
  scroll = { ease: 0.05, current: 0, target: 0, last: 0 };
  raf = 0;
  isDown = false;
  hasDragged = false;
  start = 0;
  scrollPosition = 0;
  itemCount = 0;
  onCheckDebounce: () => void;
  resizeObserver: ResizeObserver | null = null;
  boundOnResize = () => this.onResize();
  boundOnWheel = (e: WheelEvent) => this.onWheel(e);
  boundOnTouchDown = (e: MouseEvent | TouchEvent) => this.onTouchDown(e);
  boundOnTouchMove = (e: MouseEvent | TouchEvent) => this.onTouchMove(e);
  boundOnTouchUp = (e: MouseEvent | TouchEvent) => this.onTouchUp(e);

  constructor(
    private container: HTMLDivElement,
    private opts: {
      items: CircularGalleryItem[]; bend: number; textColor: string;
      borderRadius: number; font: string; scrollSpeed: number; scrollEase: number;
      onItemClick?: (index: number) => void;
    }
  ) {
    this.scroll.ease = opts.scrollEase;
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    container.appendChild(this.gl.canvas);

    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;

    this.scene = new Transform();
    this.planeGeometry = new Plane(this.gl, { heightSegments: 20, widthSegments: 20 });

    this.onCheckDebounce = debounce(() => this.onCheck(), 200);

    this.onResize();
    this.createMedias();
    this.update();
    this.addEventListeners();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);
  }

  createMedias() {
    const items = this.opts.items.length ? this.opts.items : [];
    this.itemCount = items.length;
    const doubled = items.concat(items);
    this.medias = doubled.map(
      (data, index) =>
        new Media({
          geometry: this.planeGeometry,
          gl: this.gl,
          image: data.image,
          index,
          length: doubled.length,
          scene: this.scene,
          screen: this.screen,
          viewport: this.viewport,
          text: data.text,
          bend: this.opts.bend,
          textColor: this.opts.textColor,
          borderRadius: this.opts.borderRadius,
          font: this.opts.font,
        })
    );
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true;
    this.hasDragged = false;
    this.scrollPosition = this.scroll.current;
    this.start = "touches" in e ? e.touches[0].clientX : e.clientX;
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return;
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    const distance = (this.start - x) * (this.opts.scrollSpeed * 0.025);
    if (Math.abs(distance) > 2) this.hasDragged = true;
    this.scroll.target = this.scrollPosition + distance;
  }

  onTouchUp(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return;
    this.isDown = false;
    this.onCheck();

    if (!this.hasDragged && this.opts.onItemClick && this.itemCount > 0) {
      const clientX = "changedTouches" in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      const rect = this.container.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const worldX = ndcX * (this.viewport.width / 2) + this.scroll.current;
      const width = this.medias[0]?.width || 1;
      let index = Math.round(worldX / width) % this.itemCount;
      if (index < 0) index += this.itemCount;
      this.opts.onItemClick(index);
    }
  }

  onWheel(e: WheelEvent) {
    const delta = e.deltaY || 0;
    this.scroll.target += delta > 0 ? this.opts.scrollSpeed : -this.opts.scrollSpeed;
    this.onCheckDebounce();
  }

  onCheck() {
    if (!this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  onResize() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    if (this.screen.width === 0 || this.screen.height === 0) return;
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    this.medias.forEach((media) => media.onResize({ screen: this.screen, viewport: this.viewport }));
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias.forEach((media) => media.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(() => this.update());
  }

  addEventListeners() {
    window.addEventListener("resize", this.boundOnResize);
    this.container.addEventListener("wheel", this.boundOnWheel, { passive: true });
    this.container.addEventListener("mousedown", this.boundOnTouchDown);
    window.addEventListener("mousemove", this.boundOnTouchMove);
    window.addEventListener("mouseup", this.boundOnTouchUp);
    this.container.addEventListener("touchstart", this.boundOnTouchDown, { passive: true });
    window.addEventListener("touchmove", this.boundOnTouchMove, { passive: true });
    window.addEventListener("touchend", this.boundOnTouchUp);
  }

  destroy() {
    window.cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.boundOnResize);
    this.container.removeEventListener("wheel", this.boundOnWheel);
    this.container.removeEventListener("mousedown", this.boundOnTouchDown);
    window.removeEventListener("mousemove", this.boundOnTouchMove);
    window.removeEventListener("mouseup", this.boundOnTouchUp);
    this.container.removeEventListener("touchstart", this.boundOnTouchDown);
    window.removeEventListener("touchmove", this.boundOnTouchMove);
    window.removeEventListener("touchend", this.boundOnTouchUp);
    if (this.gl.canvas.parentNode) this.gl.canvas.parentNode.removeChild(this.gl.canvas);
  }
}

export default function CircularGallery({
  items = [],
  bend = 3,
  textColor = "#ffffff",
  borderRadius = 0.05,
  font = "bold 28px 'Bebas Neue', sans-serif",
  scrollSpeed = 2,
  scrollEase = 0.05,
  onItemClick,
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onItemClickRef = useRef(onItemClick);
  onItemClickRef.current = onItemClick;

  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;
    const app = new GalleryApp(containerRef.current, {
      items,
      bend,
      textColor,
      borderRadius,
      font,
      scrollSpeed,
      scrollEase,
      onItemClick: (index) => onItemClickRef.current?.(index),
    });
    return () => app.destroy();
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase]);

  return <div className="circular-gallery" ref={containerRef} />;
}
