import { position, rotate, type Camera, type Point3 } from "./lunarGeometry";

// Decorative particles never contribute to the real skill count or graph.
const particles = Array.from({ length: 2600 }, (_, index) => {
  const point = position(index, 2600);
  const shell = index % 5 === 0 ? 0.72 + (index % 19) / 100 : 1;
  return { x: point.x * shell, y: point.y * shell, z: point.z * shell, shell };
});

export function createParticleRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  let disposed = false;
  return {
    draw(camera: Camera, focus?: Point3) {
      if (disposed) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixels = Math.round(width * dpr);
      if (
        canvas.width !== pixels ||
        canvas.height !== Math.round(height * dpr)
      ) {
        canvas.width = pixels;
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(canvas.width / 600, 0, 0, canvas.height / 500, 0, 0);
      context.clearRect(0, 0, 600, 500);
      const radius = 170 * camera.zoom;
      const glow = context.createRadialGradient(
        300,
        250,
        radius * 0.45,
        300,
        250,
        radius * 1.22,
      );
      glow.addColorStop(0, "rgba(196,218,203,0)");
      glow.addColorStop(0.78, "rgba(196,218,203,0.025)");
      glow.addColorStop(1, "rgba(196,218,203,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, 600, 500);
      // Fine meridians make rotation legible without a solid globe surface.
      for (let ring = 0; ring < 6; ring++) {
        let previous: Point3 | null = null;
        for (let step = 0; step <= 96; step++) {
          const angle = (step / 96) * Math.PI * 2;
          const longitude = (ring / 6) * Math.PI;
          const point = rotate(
            {
              x: Math.cos(angle) * Math.cos(longitude),
              y: Math.sin(angle),
              z: Math.cos(angle) * Math.sin(longitude),
            },
            camera,
          );
          if (previous) {
            context.beginPath();
            context.moveTo(
              300 + previous.x * radius,
              250 + previous.y * radius,
            );
            context.lineTo(300 + point.x * radius, 250 + point.y * radius);
            context.strokeStyle = `rgba(200,222,207,${point.z > 0 ? 0.11 : 0.035})`;
            context.lineWidth = 0.45;
            context.stroke();
          }
          previous = point;
        }
      }
      const view = particles
        .map((point) => ({ ...rotate(point, camera), source: point }))
        .sort((a, b) => a.z - b.z);
      for (const point of view) {
        const front = (point.z + 1) / 2;
        const alignment = focus
          ? point.source.x * focus.x +
            point.source.y * focus.y +
            point.source.z * focus.z
          : -1;
        const highlight = Math.max(0, (alignment - 0.88) / 0.12);
        const opacity =
          (0.12 + front * front * 0.66 + highlight * 0.2) *
          (point.source.shell < 1 ? 0.38 : 1);
        const size = (0.38 + front * 0.44 + highlight * 0.25) * camera.zoom;
        context.fillStyle = `rgba(211,227,217,${Math.min(opacity, 1)})`;
        context.beginPath();
        context.arc(
          300 + point.x * radius,
          250 + point.y * radius,
          size,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    },
    dispose() {
      disposed = true;
    },
  };
}
