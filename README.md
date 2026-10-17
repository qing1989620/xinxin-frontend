# Xinxin Frontend

React + TypeScript 私人工作空间：工作台首页、Agent 一级入口、任务与产物、私人资料、服务器、技能、个人内容、绘图/拾景、记忆、自动化和设置。

```powershell
npm ci
npm run dev
```

访问 `http://127.0.0.1:5188`，开发代理连接本机 8000 后端。首次主人初始化码在后端 `data/bootstrap.code`，随后配置模型密钥。登录/连接页面可指定自己的 HTTPS 后端；切换后端会清除旧认证。

远程仓库：<https://github.com/qing1989620/xinxin-frontend>

## 已确定的产品方向

- Agent 对话有一级直达入口。
- 响应式界面，暖白底、深灰文字、单一强调色、清晰网格和留白。
- 提供任务状态、文件和产物等有用交互。
- Android APK + 可安装 PWA，构建说明见 [android.md](docs/android.md)。
- 后端执行、数据库和密钥不进入此仓库。

```powershell
npm test
npm run build
./build-android.ps1
```

生产资源在 `dist/`，PWA 只缓存静态界面，不缓存私人 API/文件。可通过 `VITE_API_BASE` 指定 HTTPS API 地址，VITE 变量不能放密钥。Android 仅为客户端，任务在独立后端运行。

[需求规格](docs/product-spec.md)、[快速审查与验收](docs/quick-review.md)。当前已实现本地版本；GitHub 保存源代码，私人数据留独立后端，云部署后续进行。生产预览使用 `npm run preview -- --port 5188`，仍代理本机 8000 后端。

审查流程：[audit-plan.md](docs/audit-plan.md)。

本轮更新：粒子技能中心、多文件资源上传与附件选择、Android局域网调试包。见 [本轮审查](docs/skill-persona-review.md) 和 [Android联调](docs/android.md)。本轮仅本地提交，等待主人本地和真机验收、明确通知后再推送。
