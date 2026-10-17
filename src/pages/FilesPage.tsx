import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Download,
  FileText,
  Image,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api, upload, remove, download, type FileItem } from "../api";
import {
  Dialog,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  PrivateImage,
  date,
  size,
  useResource,
  useToast,
} from "../ui";

export default function FilesPage() {
  const { data, error, reload } = useResource<FileItem[]>("/files"),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<FileItem | null>(null),
    [text, setText] = useState(""),
    [textBusy, setTextBusy] = useState(false),
    [nextOffset, setNextOffset] = useState<number | null>(null),
    [totalChars, setTotalChars] = useState(0),
    [results, setResults] = useState<any[] | null>(null);
  const picker = useRef<HTMLInputElement>(null),
    previewId = useRef(""),
    toast = useToast(),
    navigate = useNavigate();
  async function receive(files: FileList | File[]) {
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const result = await upload(file);
        if (result.parse_error) toast(result.parse_error, true);
      }
      reload();
      toast("资料已放进私人空间");
    } catch (error) {
      toast((error as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function open(file: FileItem) {
    previewId.current = file.id;
    setPreview(file);
    setText("");
    setNextOffset(null);
    setTotalChars(0);
    setTextBusy(file.indexed);
    if (file.indexed) {
      try {
        const value = await api(`/files/${file.id}/text`);
        if (previewId.current !== file.id) return;
        setText(value.text);
        setNextOffset(value.next_offset);
        setTotalChars(value.total_chars);
      } catch (error) {
        if (previewId.current === file.id)
          toast((error as Error).message, true);
      } finally {
        if (previewId.current === file.id) setTextBusy(false);
      }
    }
  }
  if (error) return <ErrorState message={error} retry={reload} />;
  if (!data) return <Loading />;
  return (
    <div className="page-enter">
      <PageHeader
        overline="PRIVATE KNOWLEDGE"
        title="私人资料"
        description="文档、表格、图片与交付物，成为你和 Agent 的共同上下文。"
        action={
          <button
            className="button primary"
            onClick={() => picker.current?.click()}
            disabled={busy}
          >
            <Plus size={17} />
            {busy ? "正在上传…" : "添加资料"}
          </button>
        }
      />
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) void receive(event.target.files);
          event.target.value = "";
        }}
      />
      <div
        className="file-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void receive(event.dataTransfer.files);
        }}
      >
        <UploadCloud size={24} strokeWidth={1.3} />
        <div>
          <strong>把文件放在这里</strong>
          <p>支持 PDF、Word、Markdown、CSV 和图片 · 单文件最多 24 MB</p>
        </div>
        <button className="text-button" onClick={() => picker.current?.click()}>
          选择文件 <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="toolbar">
        <label className="search-field wide">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setResults(null);
            }}
            placeholder="搜索文件名，或查找资料中的内容"
            aria-label="搜索私人资料"
          />
        </label>
        <button
          className="button secondary"
          disabled={!query.trim()}
          onClick={async () => {
            try {
              setResults(
                await api(`/files/search?q=${encodeURIComponent(query)}`),
              );
            } catch (error) {
              toast((error as Error).message, true);
            }
          }}
        >
          检索正文 <ArrowUpRight size={15} />
        </button>
        <span className="muted small-text">{data.length} 份资料</span>
      </div>
      {results ? (
        <section className="search-results">
          {results.length ? (
            results.map((item, index) => (
              <article key={index} className="citation-result">
                <p className="eyebrow">SOURCE {index + 1}</p>
                <h3>{item.filename}</h3>
                <p>{item.text}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    const file = data.find((file) => file.id === item.file_id);
                    if (file) void open(file);
                  }}
                >
                  回到来源 <ArrowUpRight size={15} />
                </button>
              </article>
            ))
          ) : (
            <Empty
              title="资料中暂未找到相关片段"
              description="试试更具体的关键词，或先上传对应资料。"
            />
          )}
        </section>
      ) : (
        <section className="list-panel">
          {data.filter((file) =>
            file.name.toLowerCase().includes(query.toLowerCase()),
          ).length ? (
            data
              .filter((file) =>
                file.name.toLowerCase().includes(query.toLowerCase()),
              )
              .map((file) => (
                <article className="library-file-row" key={file.id}>
                  <button className="file-open" onClick={() => void open(file)}>
                    <span className="file-type-icon">
                      {file.mime.startsWith("image/") ? (
                        <Image size={22} strokeWidth={1.3} />
                      ) : (
                        <FileText size={22} strokeWidth={1.3} />
                      )}
                    </span>
                    <div>
                      <strong>{file.name}</strong>
                      <small>
                        {size(file.size)} · {date(file.created)}
                      </small>
                    </div>
                  </button>
                  <span
                    className={`index-badge ${file.indexed ? "indexed" : ""}`}
                  >
                    {file.indexed ? "可检索" : "原文件"}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`下载 ${file.name}`}
                    onClick={() =>
                      void download(file).catch((error) =>
                        toast(error.message, true),
                      )
                    }
                  >
                    <Download size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`删除 ${file.name}`}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `删除「${file.name}」？引用它的内容将无法再读取原文件。`,
                        )
                      )
                        return;
                      try {
                        await remove(`/files/${file.id}`);
                        reload();
                      } catch (error) {
                        toast((error as Error).message, true);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))
          ) : (
            <Empty
              title="留一份资料，开始建立上下文"
              description="上传后，Agent 可以检索其中的文字，并给出文件来源。"
            />
          )}
        </section>
      )}
      {preview && (
        <Dialog
          title={preview.name}
          onClose={() => {
            previewId.current = "";
            setPreview(null);
          }}
          wide
        >
          {preview.mime.startsWith("image/") ? (
            <PrivateImage
              path={`/files/${preview.id}/download?inline=true`}
              alt={preview.name}
              className="document-image"
            />
          ) : text ? (
            <>
              <pre className="document-text">{text}</pre>
              {nextOffset != null && (
                <div className="gallery-more">
                  <button
                    className="button secondary"
                    disabled={textBusy}
                    onClick={async () => {
                      const id = preview.id;
                      setTextBusy(true);
                      try {
                        const result = await api(
                          `/files/${id}/text?offset=${nextOffset}`,
                        );
                        if (previewId.current !== id) return;
                        setText((value) => value + result.text);
                        setNextOffset(result.next_offset);
                      } catch (error) {
                        if (previewId.current === id)
                          toast((error as Error).message, true);
                      } finally {
                        if (previewId.current === id) setTextBusy(false);
                      }
                    }}
                  >
                    {textBusy ? "正在读取…" : "继续读取正文"}
                  </button>
                  <span>
                    {text.length.toLocaleString()} /{" "}
                    {totalChars.toLocaleString()} 字符
                  </span>
                </div>
              )}
            </>
          ) : textBusy ? (
            <Loading />
          ) : (
            <Empty
              title="原文件已妥善保存"
              description="这个格式暂不提供文字预览，可以下载查看。"
            />
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() =>
                void download(preview).catch((error) =>
                  toast(error.message, true),
                )
              }
            >
              <Download size={16} />
              下载文件
            </button>
            <button
              className="button primary"
              onClick={() =>
                navigate("/agent", {
                  state: {
                    prompt: `帮我分析私人文件「${preview.name}」，文件 ID 是 ${preview.id}。请引用原文，先读取文件再回答。`,
                  },
                })
              }
            >
              和 Agent 一起阅读 <ArrowUpRight size={16} />
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
