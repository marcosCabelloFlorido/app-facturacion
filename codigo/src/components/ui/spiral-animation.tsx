import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './spiral-animation.css';

type Point = { x: number; y: number };
const TAU = Math.PI * 2;
const CAMERA_Z = -400;
const CAMERA_TRAVEL = 3400;
const VIEW_ZOOM = 100;
const CHANGE_TIME = 0.32;
const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const lerp = (start: number, end: number, progress: number) =>
  start * (1 - progress) + end * progress;

function ease(progress: number, power: number) {
  return progress < 0.5
    ? 0.5 * Math.pow(2 * progress, power)
    : 1 - 0.5 * Math.pow(2 * (1 - progress), power);
}

function easeOutElastic(progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return Math.pow(2, -8 * progress) * Math.sin(((progress * 8 - 0.75) * TAU) / 4.5) + 1;
}

function spiralPath(progress: number): Point {
  const position = Math.sqrt(ease(clamp(1.2 * progress), 1.8));
  const angle = TAU * 6 * position;
  return { x: 170 * position * Math.cos(angle), y: 170 * position * Math.sin(angle) + 28 };
}

class Star {
  private angle: number;
  private distance: number;
  private direction: number;
  private expansion: number;
  private finalScale: number;
  private dx: number;
  private dy: number;
  private location: number;
  private position: Point;
  private z: number;
  private weight: number;

  constructor(random: () => number) {
    this.angle = random() * TAU;
    this.distance = 30 * random() + 15;
    this.direction = random() > 0.5 ? 1 : -1;
    this.expansion = 1.2 + random() * 0.8;
    this.finalScale = 0.7 + random() * 0.6;
    this.dx = this.distance * Math.cos(this.angle);
    this.dy = this.distance * Math.sin(this.angle);
    this.location = (1 - Math.pow(1 - random(), 3)) / 1.3;
    this.position = spiralPath(this.location);
    this.z = lerp(
      lerp(0.5 * CAMERA_Z, CAMERA_TRAVEL + CAMERA_Z, random()),
      CAMERA_TRAVEL / 2,
      0.3 * this.location,
    );
    this.weight = Math.pow(random(), 2);
  }

  render(progress: number, controller: AnimationController) {
    const delta = progress - this.location;
    if (delta <= 0) return;
    const displacement = clamp(4 * delta);
    let x: number;
    let y: number;

    if (displacement < 0.3) {
      const easing = lerp(displacement, displacement * displacement, displacement / 0.3);
      x = this.position.x + this.dx * easing;
      y = this.position.y + this.dy * easing;
    } else if (displacement < 0.7) {
      const middle = (displacement - 0.3) / 0.4;
      const curve = Math.sin(middle * Math.PI) * this.direction * 1.5;
      x = this.position.x + this.dx * (0.3 + 0.4 * middle) - this.dy * 0.4 * curve * middle;
      y = this.position.y + this.dy * (0.3 + 0.4 * middle) + this.dx * 0.4 * curve * middle;
    } else {
      const final = (displacement - 0.7) / 0.3;
      const distance = this.distance * this.expansion * 1.5;
      const angle = this.angle + 1.2 * this.direction * final * Math.PI;
      x = this.position.x + lerp(this.dx * 0.7, distance * Math.cos(angle), final);
      y = this.position.y + lerp(this.dy * 0.7, distance * Math.sin(angle), final);
    }

    const size =
      displacement < 0.6
        ? 1 + displacement * 0.2
        : lerp(1.2, this.finalScale, (displacement - 0.6) / 0.4);
    controller.project(
      ((this.z - CAMERA_Z) * x) / VIEW_ZOOM,
      ((this.z - CAMERA_Z) * y) / VIEW_ZOOM,
      this.z,
      8.5 * this.weight * size,
    );
  }
}

class AnimationController {
  private timeline: gsap.core.Timeline;
  private time = 0;
  private width = 0;
  private height = 0;
  private cameraZ = CAMERA_Z;
  private stars: Star[];
  private reducedMotion = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
  ) {
    // Keep the reference's repeatable distribution local to this animation.
    let seed = 1234;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    this.stars = Array.from({ length: 5000 }, () => new Star(random));
    this.timeline = gsap.timeline({ repeat: -1, paused: true }).to(this, {
      time: 1,
      duration: 15,
      ease: 'none',
      onUpdate: () => this.render(),
    });
    this.timeline.progress(0.04);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  project(x: number, y: number, z: number, size: number) {
    const depth = z - this.cameraZ;
    if (depth <= 1) return;
    const projectedX = (VIEW_ZOOM * x) / depth;
    const projectedY = (VIEW_ZOOM * y) / depth;
    const radius = clamp((200 * size) / depth, 0.25, 1.3);
    this.ctx.moveTo(projectedX + radius, projectedY);
    this.ctx.arc(projectedX, projectedY, radius, 0, TAU);
  }

  private drawTrail(progress: number, time: number) {
    const rotation = Math.sin(time * TAU) * 0.5 + 0.5;
    const bounce = Math.sin(rotation * Math.PI) * 0.05 * (1 - rotation);
    for (let i = 0; i < 80; i++) {
      const factor = lerp(1.1, 0.1, i / 80);
      const radius = ((1.3 * (1 - progress) + 3 * Math.sin(Math.PI * progress)) * factor) / 2;
      const position = spiralPath(progress - 0.00015 * i);
      const angle = -0.75 * Math.PI + (i % 2 === 0 ? -1 : 1) * Math.PI * easeOutElastic(rotation);
      const distance = Math.hypot(2.5, 2.5) * (1 + bounce);
      const x = position.x + 2.5 + distance * Math.cos(angle);
      const y = position.y + 2.5 + distance * Math.sin(angle);
      this.ctx.moveTo(x + radius, y);
      this.ctx.arc(x, y, radius, 0, TAU);
    }
  }

  private render() {
    if (!this.width || !this.height) return;
    const time = this.reducedMotion ? 0.52 : this.time;
    const trailProgress = clamp(time / (CHANGE_TIME + 0.25));
    const travelProgress = clamp((time - CHANGE_TIME) / (1 - CHANGE_TIME));
    this.cameraZ = CAMERA_Z + ease(Math.pow(travelProgress, 1.2), 1.8) * CAMERA_TRAVEL;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    // Use one scale for both axes so the spiral stays circular in any panel.
    const scale = Math.min(this.width, this.height) / 500;
    ctx.scale(scale, scale);
    ctx.rotate(-Math.PI * ease(travelProgress, 2.7));
    ctx.fillStyle = 'white';
    ctx.beginPath();
    this.drawTrail(trailProgress, time);
    for (const star of this.stars) star.render(trailProgress, this);
    if (time > CHANGE_TIME) this.project(0, (CAMERA_Z * 28) / VIEW_ZOOM, CAMERA_TRAVEL, 2.5);
    ctx.fill();
    ctx.restore();
  }

  setPlayback(reducedMotion: boolean, visible: boolean) {
    this.reducedMotion = reducedMotion;
    if (reducedMotion || !visible) this.timeline.pause();
    else this.timeline.play();
    this.render();
  }

  destroy() {
    this.timeline.kill();
  }
}

export function SpiralAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!container || !canvas || !ctx) return;

    const animation = new AnimationController(canvas, ctx);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePlayback = () => animation.setPlayback(motion.matches, !document.hidden);
    const resize = () => animation.resize(container.clientWidth, container.clientHeight);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('resize', resize);
    motion.addEventListener('change', updatePlayback);
    document.addEventListener('visibilitychange', updatePlayback);
    resize();
    updatePlayback();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      motion.removeEventListener('change', updatePlayback);
      document.removeEventListener('visibilitychange', updatePlayback);
      animation.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="spiral-animation" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
