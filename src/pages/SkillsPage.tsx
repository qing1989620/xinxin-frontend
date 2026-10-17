import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import SkillSphere from "./SkillSphere";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Sparkles,
  Network,
  LayoutGrid,
  List,
  ShieldCheck,
  Check,
  ChevronRight,
  FlaskConical,
  BookOpen,
} from "lucide-react";
import { api } from "../api";
import {
  PageHeader,
  Dialog,
  Empty,
  Loading,
  ErrorState,
  useResource,
  useToast,
} from "../ui";
type Skill = {
  id: string;
  name: string;
  description: string;
  domain: string;
  tools: string[];
  relations: [string, string][];
  score?: number;
};
type Selection = {
  query: string;
  skills: Skill[];
  dependencies: Skill[];
  order: string[];
  algorithm: string;
  learning_updates: number;
};
export default function SkillsPage() {
  const request = useRef(0);
  const { data, error, reload } = useResource<Skill[]>("/skills"),
    [tab, setTab] = useState("library"),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [layout, setLayout] = useState("grid"),
    [detail, setDetail] = useState<any>(null),
    [goal, setGoal] = useState(""),
    [selection, setSelection] = useState<Selection | null>(null),
    [busy, setBusy] = useState(false),
    toast = useToast(),
    navigate = useNavigate();
  async function open(skill: Pick<Skill, "id">) {
    try {
      setDetail({ ...skill, ...(await api(`/skills/${skill.id}`)) });
    } catch (error) {
      toast((error as Error).message, true);
    }
  }
  async function find(value: string) {
    if (!value.trim()) return;
    const revision = ++request.current;
    setBusy(true);
    try {
      const result = await api<Selection>(
        "/skills?q=" + encodeURIComponent(value),
      );
      if (request.current === revision) setSelection(result);
    } catch (error) {
      if (request.current === revision) toast((error as Error).message, true);
    } finally {
      if (request.current === revision) setBusy(false);
    }
  }
  if (error) return <ErrorState message={error} retry={reload} />;
  if (!data) return <Loading />;
  const domains = ["all", ...new Set(data.map((skill) => skill.domain))],
    visible = data.filter(
      (skill) =>
        (filter === "all" || skill.domain === filter) &&
        [skill.name, skill.description, ...skill.tools]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  const byId = new Map(
    [...(selection?.dependencies || []), ...(selection?.skills || [])].map(
      (skill) => [skill.id, skill],
    ),
  );
  return (
    <div className="page-enter skills-v2">
      <PageHeader
        overline="CAPABILITIES, WITH INTENTION"
        title="技能中心"
        description="让合适的能力，在合适的时候参与工作。"
        action={
          <button
            className="button secondary"
            onClick={() => setTab(tab === "library" ? "lab" : "library")}
          >
            <FlaskConical size={16} />
            {tab === "library" ? "试一试技能选择" : "返回技能库"}
          </button>
        }
      />
      <div className="workspace-page-tabs">
        <button
          className={tab === "sphere" ? "active" : ""}
          aria-pressed={tab === "sphere"}
          onClick={() => setTab("sphere")}
        >
          <Sparkles size={15} />
          能力星图
        </button>
        <button
          className={tab === "library" ? "active" : ""}
          aria-pressed={tab === "library"}
          onClick={() => setTab("library")}
        >
          <BookOpen size={15} />
          能力库 <span>{data.length}</span>
        </button>
        <button
          className={tab === "lab" ? "active" : ""}
          aria-pressed={tab === "lab"}
          onClick={() => setTab("lab")}
        >
          <Network size={15} />
          选择预览
        </button>
      </div>
      {tab === "sphere" ? (
        <SkillSphere nodes={data} onOpen={(node) => void open(node)} />
      ) : tab === "library" ? (
        <>
          <div className="skill-library-toolbar">
            <label className="search-field">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索技能、用途或工具"
                aria-label="搜索技能库"
              />
            </label>
            <div className="view-toggle">
              <button
                aria-label="网格视图"
                aria-pressed={layout === "grid"}
                className={layout === "grid" ? "selected" : ""}
                onClick={() => setLayout("grid")}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                aria-label="列表视图"
                aria-pressed={layout === "list"}
                className={layout === "list" ? "selected" : ""}
                onClick={() => setLayout("list")}
              >
                <List size={17} />
              </button>
            </div>
          </div>
          <div className="skill-domains" aria-label="技能领域">
            {domains.map((domain) => (
              <button
                key={domain}
                className={filter === domain ? "selected" : ""}
                aria-pressed={filter === domain}
                onClick={() => setFilter(domain)}
              >
                {domain === "all" ? "全部能力" : domain}
                <span>
                  {domain === "all"
                    ? data.length
                    : data.filter((skill) => skill.domain === domain).length}
                </span>
              </button>
            ))}
          </div>
          <div
            className={`capability-grid ${layout === "list" ? "list-view" : ""}`}
          >
            {visible.map((skill, i) => (
              <button
                className="capability-card"
                key={skill.id}
                onClick={() => void open(skill)}
              >
                <div className="capability-top">
                  <span className="capability-symbol">
                    <Sparkles size={22} strokeWidth={1.2} />
                  </span>
                  <span className="eyebrow">{skill.domain}</span>
                  <ArrowUpRight size={16} />
                </div>
                <h2>{skill.name}</h2>
                <p>{skill.description}</p>
                <div className="capability-bottom">
                  <span>
                    <span className="connection-dot ready" />
                    已登记
                  </span>
                  <span>
                    {skill.tools.length} 个工具
                    {skill.relations.length > 0 &&
                      ` · ${skill.relations.length} 项依赖`}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {!visible.length && (
            <Empty
              title="还没找到合适的能力"
              description="试试不同的用途或领域关键词。"
            />
          )}
          <div className="context-note">
            <ShieldCheck size={19} />
            <p>
              能力通过平台注册工具完成工作。技能说明可以丰富方法，执行范围由本轮任务权限决定。
            </p>
          </div>
        </>
      ) : (
        <div className="routing-lab">
          <section className="routing-input desk-panel">
            <div className="lab-intro">
              <span className="resource-icon">
                <FlaskConical size={25} strokeWidth={1.2} />
              </span>
              <p className="eyebrow">FROM INTENT TO CAPABILITY</p>
              <h2>先看看，这件事需要什么。</h2>
              <p>
                写下一个目标，预览候选能力与依赖顺序，再带着上下文进入对话。
              </p>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void find(goal);
              }}
            >
              <label>
                你想完成的目标
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="例如：从 GitHub 部署一个网站，并验证它能正常访问。"
                  required
                />
              </label>
              <button
                className="button primary"
                disabled={busy || !goal.trim()}
              >
                {busy ? "正在选择…" : "预览技能选择"}
                <ArrowRight size={16} />
              </button>
            </form>
            <div className="lab-examples">
              {[
                "部署 GitHub 网站",
                "阅读私人 PDF 并总结",
                "用 CSV 绘制趋势图",
                "把照片转换为实景拼贴",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setGoal(example);
                    void find(example);
                  }}
                >
                  {example}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
            <div className="routing-method">
              <span className="eyebrow">本地检索 + 反馈学习</span>
              <div>
                <span>
                  BM25<strong>75%</strong>
                </span>
                <span>
                  词法向量<strong>25%</strong>
                </span>
                <span>
                  LinUCB<strong>反馈后参与</strong>
                </span>
              </div>
              <p>此处预览相关度与依赖；执行授权在对话中单独选择。</p>
            </div>
          </section>
          <section className="routing-results desk-panel">
            <header className="desk-panel-header">
              <div>
                <span className="eyebrow">SELECTION & ORDER</span>
                <h2>{selection ? "选择结果" : "等待一个目标"}</h2>
              </div>
              {selection && (
                <span className="subtle-badge">
                  {selection.skills.length} 项候选
                </span>
              )}
            </header>
            {selection ? (
              <>
                <div className="routing-goal">{selection.query}</div>
                <div className="ranked-skills">
                  {selection.skills.map((skill, index) => (
                    <button key={skill.id} onClick={() => void open(skill)}>
                      <span className="rank-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <strong>{skill.name}</strong>
                        <small>{skill.description}</small>
                        <span className="rank-meter">
                          <i
                            style={{
                              width: `${Math.max(2, (Number(skill.score) / Math.max(...selection.skills.map((item) => Number(item.score)), 0.01)) * 100)}%`,
                            }}
                          />
                        </span>
                      </span>
                      <span className="rank-score">
                        {Number(skill.score).toFixed(2)}
                        <ArrowUpRight size={13} />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="routing-order">
                  <p className="eyebrow">考虑依赖后的建议顺序</p>
                  <div>
                    {selection.order.map((id, index) => (
                      <button key={id} onClick={() => void open(byId.get(id)!)}>
                        <span>{index + 1}</span>
                        {byId.get(id)?.name || id}
                        {index < selection.order.length - 1 && (
                          <ChevronRight size={13} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <footer className="routing-result-footer">
                  <span>{selection.learning_updates} 次有证据的反馈学习</span>
                  <button
                    className="button secondary"
                    onClick={() =>
                      navigate("/agent", { state: { prompt: selection.query } })
                    }
                  >
                    带着目标开始对话
                    <ArrowUpRight size={15} />
                  </button>
                </footer>
              </>
            ) : (
              <Empty
                title="让选择有依据"
                description="结果会展示相关能力、评分与依赖顺序。"
              />
            )}
          </section>
        </div>
      )}
      {detail && (
        <Dialog title={detail.name} onClose={() => setDetail(null)} wide>
          <div className="skill-detail-meta">
            <span className="subtle-badge">{detail.domain}</span>
            <span>{detail.tools?.length || 0} 个注册工具</span>
            <button
              className="text-button"
              onClick={() =>
                navigate("/agent", {
                  state: {
                    prompt: `请先加载 ${detail.id} 技能，帮我处理一个与它相关的任务，先明确输入与权限。`,
                  },
                })
              }
            >
              交给 Agent
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="markdown skill-markdown">
            <ReactMarkdown skipHtml>
              {String(detail.markdown || "").replace(
                /^---\r?\n[\s\S]*?\r?\n---\r?\n/,
                "",
              )}
            </ReactMarkdown>
          </div>
          {detail.tools?.length > 0 && (
            <div className="skill-tool-tags">
              {detail.tools.map((tool: string) => (
                <code key={tool}>{tool}</code>
              ))}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
