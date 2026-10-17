import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  RotateCcw,
  Move,
  Pause,
  Play,
  Plus,
  Minus,
  Search,
  Network,
  ScanLine,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  arc,
  clamp,
  focusCamera,
  INITIAL_CAMERA,
  position,
  project,
  visibleArc,
  type Camera,
} from "./lunarGeometry";
import { createParticleRenderer } from "./particleRenderer";
import "../lunar.css";

type Node = {
  id: string;
  name: string;
  description: string;
  domain: string;
  tools: string[];
  relations?: [string, string][];
};
type Motion = { from: Camera; to: Camera; started: number };
export default function SkillSphere({
  nodes,
  onOpen,
  onRun,
  semantic,
  statusError,
}: {
  nodes: Node[];
  onOpen: (node: Node) => void;
  onRun: (node: Node) => void;
  semantic?: { encoder: { kind: string; degraded?: boolean } };
  statusError?: boolean;
}) {
  const [camera, setCamera] = useState(INITIAL_CAMERA),
    [selected, setSelected] = useState("scientific-plotting"),
    [hover, setHover] = useState(""),
    [query, setQuery] = useState(""),
    [domain, setDomain] = useState("全部"),
    [auto, setAuto] = useState(false),
    [relations, setRelations] = useState(true),
    [labels, setLabels] = useState(true),
    [active, setActive] = useState(true),
    [reduced, setReduced] = useState(false),
    [surface, setSurface] = useState(false);
  const stage = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    currentCamera = useRef(camera),
    renderer = useRef<ReturnType<typeof createParticleRenderer>>(null),
    animation = useRef<Motion | null>(null),
    velocity = useRef({ x: 0, y: 0 }),
    frame = useRef(0),
    lastPaint = useRef(0),
    drag = useRef<{
      id: number;
      x: number;
      y: number;
      moved: number;
      skill: string | null;
    } | null>(null),
    options = useRef({ auto, active, reduced, hover });
  options.current = { auto, active, reduced, hover };
  const points = useMemo(
    () =>
      nodes.map((node, index) => ({
        ...node,
        point: position(index, nodes.length),
      })),
    [nodes],
  );
  const byId = useMemo(
    () => new Map(points.map((node) => [node.id, node])),
    [points],
  );
  const edges = useMemo(
    () =>
      points.flatMap((node) =>
        (node.relations || [])
          .filter(([type, target]) => type === "depend_on" && byId.has(target))
          .map(([type, target]) => ({
            source: node.id,
            target,
            type,
            points: arc(node.point, byId.get(target)!.point),
          })),
      ),
    [points, byId],
  );
  const tick = useRef<(now: number) => void>(() => {});
  const schedule = useCallback(() => {
    if (!frame.current && options.current.active && !document.hidden)
      frame.current = requestAnimationFrame((now) => tick.current(now));
  }, []);
  const commit = useCallback((next: Camera) => {
    currentCamera.current = next;
    setCamera(next);
  }, []);
  tick.current = (now: number) => {
    frame.current = 0;
    if (!options.current.active || document.hidden) return;
    if (now - lastPaint.current < 32) {
      schedule();
      return;
    }
    lastPaint.current = now;
    const motion = animation.current;
    if (motion) {
      const progress = clamp((now - motion.started) / 520, 0, 1),
        eased = 1 - Math.pow(1 - progress, 3);
      commit({
        yaw: motion.from.yaw + (motion.to.yaw - motion.from.yaw) * eased,
        pitch:
          motion.from.pitch + (motion.to.pitch - motion.from.pitch) * eased,
        zoom: motion.from.zoom + (motion.to.zoom - motion.from.zoom) * eased,
      });
      if (progress === 1) animation.current = null;
    } else if (!drag.current) {
      const v = velocity.current;
      if (!options.current.reduced && Math.abs(v.x) + Math.abs(v.y) > 0.0004) {
        commit({
          ...currentCamera.current,
          yaw: currentCamera.current.yaw + v.x,
          pitch: clamp(currentCamera.current.pitch + v.y, -1.55, 1.55),
        });
        v.x *= 0.87;
        v.y *= 0.87;
      } else if (
        options.current.auto &&
        !options.current.reduced &&
        !options.current.hover
      ) {
        commit({
          ...currentCamera.current,
          yaw: currentCamera.current.yaw + 0.003,
        });
      } else return;
    }
    if (!drag.current) schedule();
  };
  const moveTo = useCallback(
    (to: Camera) => {
      velocity.current = { x: 0, y: 0 };
      if (options.current.reduced) {
        animation.current = null;
        commit(to);
      } else {
        animation.current = {
          from: currentCamera.current,
          to,
          started: performance.now(),
        };
        schedule();
      }
    },
    [commit, schedule],
  );
  const choose = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    setSelected(id);
    setAuto(false);
    setHover("");
    moveTo(focusCamera(node.point, currentCamera.current));
  };
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(media.matches);
      if (media.matches) {
        setAuto(false);
        velocity.current = { x: 0, y: 0 };
        if (animation.current) {
          commit(animation.current.to);
          animation.current = null;
        }
      }
    };
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver((entries) =>
      setActive(entries[0].isIntersecting),
    );
    if (stage.current) observer.observe(stage.current);
    const visibility = () => {
      if (document.hidden) {
        if (frame.current) cancelAnimationFrame(frame.current);
        frame.current = 0;
      } else schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [commit, schedule]);
  useEffect(() => {
    if (
      (auto && !reduced) ||
      animation.current ||
      Math.abs(velocity.current.x) + Math.abs(velocity.current.y) > 0.0004
    )
      schedule();
  }, [auto, active, reduced, hover, schedule]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    renderer.current = createParticleRenderer(element);
    setSurface(Boolean(renderer.current));
    const resize = new ResizeObserver(() =>
      renderer.current?.draw(currentCamera.current),
    );
    resize.observe(element);
    renderer.current?.draw(currentCamera.current);
    return () => {
      resize.disconnect();
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    renderer.current?.draw(camera, byId.get(hover || selected)?.point);
  }, [camera, hover, selected, byId]);
  useEffect(() => {
    if (!nodes.some((node) => node.id === selected))
      setSelected(nodes[0]?.id || "");
  }, [nodes, selected]);
  const filtered = nodes.filter(
    (node) =>
      (domain === "全部" || node.domain === domain) &&
      [node.name, node.description, node.domain, node.id]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const visibleIds = new Set(filtered.map((node) => node.id));
  const current = byId.get(selected),
    index = nodes.findIndex((node) => node.id === selected);
  const projected = points
    .map((node) => ({ ...node, ...project(node.point, camera) }))
    .sort((a, b) => a.z - b.z);
  const labelIds = new Set<string>();
  const labelBoxes: { left: number; right: number; y: number }[] = [];
  for (const node of projected
    .filter((node) => node.z > 0.15 && visibleIds.has(node.id))
    .sort(
      (a, b) =>
        Number(b.id === selected || b.id === hover) -
          Number(a.id === selected || a.id === hover) || b.z - a.z,
    )) {
    const width = node.name.length * 9 + 55;
    const left =
      node.x > 430 || (node.x > 170 && node.x < 300)
        ? node.x - 10 - width
        : node.x + 10;
    const box = { left, right: left + width, y: node.y };
    if (
      labelIds.size < 4 &&
      !labelBoxes.some(
        (other) =>
          Math.abs(other.y - box.y) < 35 &&
          box.left < other.right + 8 &&
          box.right + 8 > other.left,
      )
    ) {
      labelIds.add(node.id);
      labelBoxes.push(box);
    }
  }
  function zoom(delta: number) {
    setAuto(false);
    moveTo({
      ...currentCamera.current,
      zoom: clamp(
        (animation.current?.to.zoom ?? currentCamera.current.zoom) + delta,
        0.75,
        1.28,
      ),
    });
  }
  function release(event: React.PointerEvent<HTMLDivElement>) {
    const dragging = drag.current;
    if (!dragging || event.pointerId !== dragging.id) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.type === "pointerup" && dragging.moved < 6 && dragging.skill)
      choose(dragging.skill);
    else if (event.type === "pointerup" && !reduced) schedule();
    else velocity.current = { x: 0, y: 0 };
  }
  return (
    <section className="lunar-explorer" aria-label="Xinxin 的交互能力星图">
      <div className="atlas-stage" ref={stage}>
        <header className="atlas-stage-heading">
          <div>
            <span className="atlas-kicker">XINXIN / CAPABILITY ATLAS</span>
            <h2>小小星球，大有可为。</h2>
          </div>
          <span className="atlas-live">
            <i />
            {nodes.length} 个能力
          </span>
        </header>
        <div
          className="atlas-viewport"
          data-renderer={surface ? "particle-canvas" : "node-map"}
          tabIndex={0}
          role="group"
          aria-label="粒子技能星球，拖动旋转，方向键调整，Home 复位，加减号缩放，空格切换旋转"
          aria-describedby="atlas-help"
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (
              ![
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "+",
                "=",
                "-",
                " ",
              ].includes(event.key)
            )
              return;
            event.preventDefault();
            if (event.key === " ") {
              setAuto((value) => !value && !reduced);
              return;
            }
            setAuto(false);
            if (event.key === "Home") moveTo(INITIAL_CAMERA);
            else if (event.key === "+" || event.key === "=") zoom(0.12);
            else if (event.key === "-") zoom(-0.12);
            else
              moveTo({
                ...currentCamera.current,
                yaw:
                  currentCamera.current.yaw +
                  (event.key === "ArrowLeft"
                    ? -0.25
                    : event.key === "ArrowRight"
                      ? 0.25
                      : 0),
                pitch: clamp(
                  currentCamera.current.pitch +
                    (event.key === "ArrowUp"
                      ? -0.2
                      : event.key === "ArrowDown"
                        ? 0.2
                        : 0),
                  -1.55,
                  1.55,
                ),
              });
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 || drag.current) return;
            animation.current = null;
            velocity.current = { x: 0, y: 0 };
            setAuto(false);
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              moved: 0,
              skill:
                (event.target as Element)
                  .closest("[data-skill]")
                  ?.getAttribute("data-skill") || null,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const d = drag.current;
            if (!d || event.pointerId !== d.id) return;
            const dx = event.clientX - d.x,
              dy = event.clientY - d.y;
            d.moved += Math.abs(dx) + Math.abs(dy);
            d.x = event.clientX;
            d.y = event.clientY;
            velocity.current = { x: dx * 0.005, y: dy * 0.005 };
            commit({
              ...currentCamera.current,
              yaw: currentCamera.current.yaw + dx * 0.006,
              pitch: clamp(
                currentCamera.current.pitch + dy * 0.006,
                -1.55,
                1.55,
              ),
            });
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div className="atlas-stars" aria-hidden="true" />
          <canvas className="atlas-particles" ref={canvas} aria-hidden="true" />
          <svg
            className="atlas-orbits"
            viewBox="0 0 600 500"
            aria-hidden="true"
          >
            <ellipse
              cx="300"
              cy="250"
              rx={220 * camera.zoom}
              ry="76"
              transform="rotate(-25 300 250)"
              className="atlas-orbit-line"
            />
            <circle
              cx="300"
              cy="250"
              r={192 * camera.zoom}
              className="atlas-guide-ring"
            />
            {edges
              .filter(
                (edge) =>
                  relations &&
                  visibleIds.has(edge.source) &&
                  visibleIds.has(edge.target),
              )
              .map((edge) => (
                <path
                  key={edge.source + edge.target}
                  d={visibleArc(edge.points, camera)}
                  className={
                    edge.source === selected || edge.target === selected
                      ? "atlas-edge selected"
                      : "atlas-edge"
                  }
                />
              ))}
            {projected
              .filter((node) => node.z <= 0 && visibleIds.has(node.id))
              .map((node) => (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r="2"
                  className="atlas-far-node"
                />
              ))}
            <path
              d="M45 82h12M51 76v12M543 418h12M549 412v12"
              className="atlas-crosshair"
            />
          </svg>
          {projected
            .filter((node) => node.z > 0 && visibleIds.has(node.id))
            .map((node) => (
              <button
                key={node.id}
                type="button"
                data-skill={node.id}
                className={`atlas-node ${node.id === selected ? "selected" : ""} ${node.x > 430 || (node.x > 170 && node.x < 300) ? "label-left" : ""}`}
                style={{ left: `${node.x / 6}%`, top: `${node.y / 5}%` }}
                aria-label={`聚焦 ${node.name}`}
                aria-pressed={node.id === selected}
                onMouseEnter={() => setHover(node.id)}
                onMouseLeave={() => setHover("")}
                onClick={(event) => {
                  if (event.detail === 0) choose(node.id);
                }}
              >
                <span className="atlas-node-dot" />
                {((labels && labelIds.has(node.id)) ||
                  node.id === selected ||
                  node.id === hover) && (
                  <span className="atlas-node-label">
                    {node.name}
                    <small>{node.domain}</small>
                  </span>
                )}
              </button>
            ))}
          <div className="atlas-scale" aria-hidden="true">
            <i />
            <span>{Math.round(camera.zoom * 100)}%</span>
          </div>
          <p className="atlas-coordinate" aria-hidden="true">
            {(((camera.yaw * 180) / Math.PI) % 360).toFixed(1)}° /{" "}
            {((camera.pitch * 180) / Math.PI).toFixed(1)}°
          </p>
        </div>
        <div className="atlas-controls" aria-label="星图显示控制">
          <div>
            <button
              title={
                auto
                  ? "暂停旋转"
                  : reduced
                    ? "系统已开启减少动态效果"
                    : "缓慢旋转"
              }
              aria-label={auto ? "暂停旋转" : "缓慢旋转"}
              aria-pressed={auto}
              disabled={reduced}
              onClick={() => setAuto((value) => !value)}
            >
              {auto ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <span className="atlas-control-divider" />
            <button
              aria-label="缩小星球"
              disabled={camera.zoom <= 0.75}
              onClick={() => zoom(-0.12)}
            >
              <Minus size={16} />
            </button>
            <button
              aria-label="放大星球"
              disabled={camera.zoom >= 1.28}
              onClick={() => zoom(0.12)}
            >
              <Plus size={16} />
            </button>
            <button
              aria-label="复位星图"
              onClick={() => {
                setAuto(false);
                moveTo(INITIAL_CAMERA);
              }}
            >
              <RotateCcw size={15} />
            </button>
          </div>
          <div>
            <button
              className={relations ? "active" : ""}
              aria-label="显示依赖连线"
              aria-pressed={relations}
              onClick={() => setRelations((value) => !value)}
            >
              <Network size={16} />
            </button>
            <button
              className={labels ? "active" : ""}
              aria-label="显示技能标签"
              aria-pressed={labels}
              onClick={() => setLabels((value) => !value)}
            >
              <ScanLine size={16} />
            </button>
          </div>
        </div>
        <footer className="atlas-stage-footer">
          <span id="atlas-help">
            <Move size={12} />
            拖动探索 · 点选聚焦
          </span>
          <span>
            {surface ? "PARTICLE FIELD" : "技能节点视图"} / {edges.length}{" "}
            项依赖
          </span>
        </footer>
      </div>
      <aside className="atlas-directory">
        <header>
          <span className="eyebrow">A LITTLE HELP, A LOT DONE.</span>
          <h2>有事，尽管交给我。</h2>
          <p>选一个能力，看看 Xinxin 能怎么帮你。</p>
        </header>
        <label className="atlas-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="寻找一种能力"
            aria-label="搜索星图技能"
            onKeyDown={(event) => {
              if (event.key === "Enter" && filtered.length)
                choose(filtered[0].id);
            }}
          />
          <kbd>{filtered.length}</kbd>
        </label>
        <div className="atlas-filters" aria-label="筛选技能领域">
          {["全部", ...new Set(nodes.map((node) => node.domain))].map(
            (item) => (
              <button
                key={item}
                aria-pressed={domain === item}
                onClick={() => setDomain(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <div className="atlas-directory-list" aria-label="技能列表">
          {filtered.map((node) => (
            <button
              key={node.id}
              aria-pressed={node.id === selected}
              className={node.id === selected ? "selected" : ""}
              onClick={() => choose(node.id)}
            >
              <span className="atlas-list-dot" />
              <strong>{node.name}</strong>
              <small>{node.domain}</small>
              <ArrowUpRight size={13} />
            </button>
          ))}
          {!filtered.length && (
            <p className="atlas-no-results" role="status">
              还没找到，换个关键词试试呀。
            </p>
          )}
        </div>
        {current ? (
          <section
            className="atlas-inspector"
            aria-label="当前技能"
            aria-live="polite"
          >
            <div className="atlas-selection-count">
              <span>
                {String(index + 1).padStart(2, "0")}{" "}
                <i>/ {String(nodes.length).padStart(2, "0")}</i>
              </span>
              <div>
                <button
                  aria-label="上一个技能"
                  onClick={() =>
                    choose(nodes[(index - 1 + nodes.length) % nodes.length].id)
                  }
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="下一个技能"
                  onClick={() => choose(nodes[(index + 1) % nodes.length].id)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <span className="atlas-domain">
              {current.domain} · {current.tools.length} 个工具
            </span>
            <h3>{current.name}</h3>
            <p>{current.description}</p>
            {(current.relations || [])
              .filter(([type]) => type === "depend_on")
              .map(([, target]) => (
                <button
                  className="atlas-dependency"
                  key={target}
                  onClick={() => choose(target)}
                >
                  <Network size={13} />
                  需要 {byId.get(target)?.name || target}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            <div className="atlas-inspector-actions">
              <button className="button primary" onClick={() => onRun(current)}>
                和 Xinxin 开始
                <ArrowRight size={15} />
              </button>
              <button className="text-button" onClick={() => onOpen(current)}>
                了解能力
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>
        ) : (
          <p>选择一个能力后，在这里查看用途与工具。</p>
        )}
        <footer className="atlas-model-status">
          <i />
          {semantic
            ? semantic.encoder.kind === "dense-onnx"
              ? "语义模型已连接"
              : semantic.encoder.degraded
                ? "语义模型未就绪 · 当前使用词法检索"
                : "轻量词法检索"
            : statusError
              ? "检索状态暂不可用，稍后重试"
              : "正在读取检索状态…"}
          <span>SkillNet</span>
        </footer>
      </aside>
    </section>
  );
}
