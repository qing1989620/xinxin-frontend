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

[需求规格](docs/product-spec.md)、[快速审查与验收](docs/quick-review.md)。主人已验收电脑与旧局域网APK，并授权GitHub推送和杭州部署。公开域名受ICP检查拦截，最新选择保留按量实例，通过Tailscale私有连接。绑定与Serve/HTTPS已启用，服务自身的HTTPS/API/文件/模型/SSE与APK下载验证通过。2026-10-18主人报告手机实际完成云服务器查看；手机换网和新版APK仍单独记录。生产预览使用 `npm run preview -- --port 5188`，仍代理本机8000后端。

审查流程：[audit-plan.md](docs/audit-plan.md)。

粒子技能中心、多文件资源上传与附件选择见 [功能审查](docs/skill-persona-review.md)。Android包预填实际私有HTTPS地址并签名；密钥只留本机忽略目录，APK不提交Git。见 [Android构建与安装](docs/android.md)、[云端交付审查](docs/cloud-deployment-review.md)。最新34项测试、类型检查及生产构建通过：聊天穿插可理解的公开文字，终端默认折叠；预算耗尽直接续接原任务；批量选择/预览/确认删除，记忆勾选可操作且先说明权限；图片鉴权预览与失败重试兼容旧WebView；一级Agent恢复原会话，离开/重开补回云端进度；手机输入默认一行、最多四行再内部滚动。保留80K/300K/1000K档位与独立累计预算。见 [本轮局部审查与截图](docs/agent-usability-review.md)。最终APK签名/18项资源/私有HTTPS下载散列已核验，新版实体手机覆盖安装仍待主人复测。
