import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  RotateCcw,
  MoveHorizontal,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
type Node = {
  id: string;
  name: string;
  description: string;
  domain: string;
  tools: string[];
};
type Point = { x: number; y: number; z: number };
const TAU = Math.PI * 2;
function rotate(p: Point, yaw: number, pitch: number): Point {
  const x = p.x * Math.cos(yaw) + p.z * Math.sin(yaw),
    z = p.z * Math.cos(yaw) - p.x * Math.sin(yaw);
  return {
    x,
    y: p.y * Math.cos(pitch) - z * Math.sin(pitch),
    z: p.y * Math.sin(pitch) + z * Math.cos(pitch),
  };
}
function project(p: Point) {
  return { x: 250 + p.x * 158, y: 205 + p.y * 158, z: p.z };
}
function loop(points: Point[], yaw: number, pitch: number) {
  return points
    .map((p) => {
      const q = project(rotate(p, yaw, pitch));
      return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    })
    .join(" ");
}
export default function SkillSphere({
  nodes,
  onOpen,
}: {
  nodes: Node[];
  onOpen: (node: Node) => void;
}) {
  const [angle, setAngle] = useState({ yaw: 0.35, pitch: -0.2 }),
    [selected, setSelected] = useState(nodes[0]?.id || ""),
    [auto, setAuto] = useState(false),
    [visible, setVisible] = useState(true);
  const area = useRef<HTMLDivElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      moved: number;
      skill?: string;
    } | null>(null),
    id = useId().replace(/:/g, "");
  useEffect(() => {
    if (!nodes.some((n) => n.id === selected)) setSelected(nodes[0]?.id || "");
  }, [nodes, selected]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (media.matches) setAuto(false);
    };
    media.addEventListener("change", reduce);
    const observer = new IntersectionObserver((entries) =>
      setVisible(entries[0].isIntersecting),
    );
    if (area.current) observer.observe(area.current);
    return () => {
      media.removeEventListener("change", reduce);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (
      !auto ||
      !visible ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(() => {
      if (!document.hidden && !drag.current)
        setAngle((a) => ({ ...a, yaw: a.yaw + 0.009 }));
    }, 60);
    return () => clearInterval(timer);
  }, [auto, visible]);
  const points = nodes
    .map((node, i) => {
      const y = 1 - (2 * (i + 0.5)) / nodes.length,
        r = Math.sqrt(1 - y * y),
        theta = i * Math.PI * (3 - Math.sqrt(5));
      return {
        ...node,
        ...project(
          rotate(
            { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r },
            angle.yaw,
            angle.pitch,
          ),
        ),
      };
    })
    .sort((a, b) => a.z - b.z);
  const current = nodes.find((n) => n.id === selected);
  const rings = Array.from({ length: 7 }, (_, ring) =>
    Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * TAU;
      if (ring < 4) {
        const y = (ring - 1.5) * 0.42,
          r = Math.sqrt(1 - y * y);
        return { x: r * Math.cos(a), y, z: r * Math.sin(a) };
      }
      const b = ((ring - 4) * Math.PI) / 3;
      return {
        x: Math.cos(a) * Math.cos(b),
        y: Math.sin(a),
        z: Math.cos(a) * Math.sin(b),
      };
    }),
  );
  const craters = Array.from({ length: 34 }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / 34,
      r = Math.sqrt(1 - y * y),
      theta = i * 2.39996;
    return {
      ...project(
        rotate(
          { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r },
          angle.yaw,
          angle.pitch,
        ),
      ),
      size: 4 + ((i * 7) % 13),
    };
  }).filter((p) => p.z > 0);
  return (
    <section
      className="sphere-explorer desk-panel"
      ref={area}
      aria-label="交互能力星图"
    >
      <div className="sphere-stage">
        <header>
          <span className="eyebrow">YOUR CAPABILITY ORBIT</span>
          <span className="sphere-counter">{nodes.length} SKILLS / LOCAL</span>
        </header>
        <svg
          className="skill-sphere"
          viewBox="0 0 500 410"
          role="img"
          aria-label="可拖动旋转的技能月球。方向键旋转，Home 键复位；也可使用右侧技能列表。"
          tabIndex={0}
          onKeyDown={(e) => {
            if (
              [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
              ].includes(e.key)
            ) {
              e.preventDefault();
              setAuto(false);
              setAngle((a) =>
                e.key === "Home"
                  ? { yaw: 0.35, pitch: -0.2 }
                  : {
                      yaw:
                        a.yaw +
                        (e.key === "ArrowLeft"
                          ? -0.18
                          : e.key === "ArrowRight"
                            ? 0.18
                            : 0),
                      pitch: Math.max(
                        -1.4,
                        Math.min(
                          1.4,
                          a.pitch +
                            (e.key === "ArrowUp"
                              ? -0.14
                              : e.key === "ArrowDown"
                                ? 0.14
                                : 0),
                        ),
                      ),
                    },
              );
            }
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              moved: 0,
              skill:
                (e.target as Element)
                  .closest("[data-skill]")
                  ?.getAttribute("data-skill") || undefined,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
            setAuto(false);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x,
              dy = e.clientY - d.y;
            d.moved += Math.abs(dx) + Math.abs(dy);
            d.x = e.clientX;
            d.y = e.clientY;
            setAngle((a) => ({
              yaw: a.yaw + dx * 0.009,
              pitch: Math.max(-1.4, Math.min(1.4, a.pitch + dy * 0.009)),
            }));
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (d && d.moved < 6) {
              if (d.skill) setSelected(d.skill);
            }
            drag.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <defs>
            <radialGradient id={`${id}-moon`} cx="30%" cy="24%" r="83%">
              <stop offset="0" stopColor="#f0f1e8" />
              <stop offset=".58" stopColor="#d5dcd0" />
              <stop offset="1" stopColor="#879b8c" />
            </radialGradient>
            <clipPath id={`${id}-clip`}>
              <circle cx="250" cy="205" r="158" />
            </clipPath>
          </defs>
          <ellipse
            cx="250"
            cy="205"
            rx="215"
            ry="84"
            fill="none"
            stroke="currentColor"
            strokeWidth=".65"
            strokeDasharray="2 7"
            transform="rotate(-23 250 205)"
            opacity=".2"
          />
          <circle
            cx="250"
            cy="205"
            r="174"
            fill="none"
            stroke="currentColor"
            strokeWidth=".6"
            opacity=".13"
          />
          <circle cx="250" cy="205" r="158" fill={`url(#${id}-moon)`} />
          <g clipPath={`url(#${id}-clip)`}>
            {craters.map((p, i) => (
              <g
                key={i}
                transform={`translate(${p.x} ${p.y}) rotate(${(p.x - 250) * 0.25})`}
                opacity={0.04 + p.z * 0.1}
              >
                <ellipse
                  rx={p.size * (0.35 + p.z * 0.6)}
                  ry={p.size}
                  fill="#657d6c"
                />
                <ellipse
                  cx="-1"
                  cy="-1.4"
                  rx={p.size * (0.25 + p.z * 0.5)}
                  ry={p.size * 0.82}
                  fill="#dbe2d4"
                />
                <path
                  d={`M ${-p.size * 0.5},${-p.size * 0.5} Q 0,${-p.size * 1.2} ${p.size * 0.5},${-p.size * 0.5}`}
                  fill="none"
                  stroke="#6f8371"
                  strokeWidth="1"
                />
              </g>
            ))}
          </g>
          <g fill="none" stroke="currentColor" strokeWidth=".65" opacity=".13">
            {rings.map((points, i) => (
              <polyline key={i} points={loop(points, angle.yaw, angle.pitch)} />
            ))}
          </g>
          {points.map((p) => (
            <g
              key={p.id}
              data-skill={p.id}
              className="sphere-point"
              style={{ opacity: p.z < -0.1 ? 0.28 : 1 }}
            >
              <circle cx={p.x} cy={p.y} r="17" fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={p.id === selected ? 8 : 4.5}
                fill={p.id === selected ? "var(--accent)" : "var(--surface)"}
                stroke="var(--accent)"
                strokeWidth="1.2"
              />
              {p.id === selected && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="13"
                  fill="none"
                  stroke="var(--accent)"
                  opacity=".35"
                />
              )}
              <text
                x={p.x + 13}
                y={p.y + 4}
                fontSize="10"
                fill="var(--ink)"
                paintOrder="stroke"
                stroke="#f3f5ee"
                strokeWidth="3"
                strokeLinejoin="round"
              >
                {p.name}
              </text>
            </g>
          ))}
          <path
            d="M30 46h16M38 38v16M454 362h16M462 354v16"
            stroke="currentColor"
            strokeWidth=".6"
            opacity=".45"
          />
        </svg>
        <footer>
          <span>
            <MoveHorizontal size={13} />
            拖动旋转 · 点击节点
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="向左旋转星图"
              onClick={() => setAngle((a) => ({ ...a, yaw: a.yaw - 0.3 }))}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="向右旋转星图"
              onClick={() => setAngle((a) => ({ ...a, yaw: a.yaw + 0.3 }))}
            >
              <ChevronRight size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="复位星图"
              onClick={() => {
                setAngle({ yaw: 0.35, pitch: -0.2 });
                setAuto(false);
              }}
            >
              <RotateCcw size={14} />
            </button>
            <button
              className="icon-button"
              aria-label={auto ? "暂停星图旋转" : "自动旋转星图"}
              aria-pressed={auto}
              onClick={() => setAuto(!auto)}
            >
              {auto ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        </footer>
      </div>
      <aside className="sphere-directory">
        <p className="eyebrow">CONNECTED CAPABILITIES</p>
        <h2>围绕你的目标，各司其职。</h2>
        <p>选一个节点，了解它能完成什么。</p>
        <div className="sphere-node-list">
          {nodes.map((node) => (
            <button
              key={node.id}
              className={selected === node.id ? "selected" : ""}
              onClick={() => setSelected(node.id)}
              aria-pressed={selected === node.id}
            >
              <span className="connection-dot ready" />
              <strong>{node.name}</strong>
              <small>{node.domain}</small>
            </button>
          ))}
        </div>
        {current && (
          <div className="sphere-selected">
            <span className="eyebrow">{current.domain}</span>
            <h3>{current.name}</h3>
            <p>{current.description}</p>
            <button className="text-button" onClick={() => onOpen(current)}>
              查看能力与工具 <ArrowUpRight size={15} />
            </button>
          </div>
        )}
      </aside>
    </section>
  );
}
