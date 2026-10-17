# Android 本地构建

Capacitor 8.5.3，包名 `com.xinxin.personal`。需要 JDK 21、Android SDK 36、Build Tools 36.0.0。本机便携工具链在 Git 忽略的 `.toolchains/`，没有修改系统 Java/SDK 设置。

依据：[Capacitor Android](https://capacitorjs.com/docs/android)、[Capacitor 8 要求](https://capacitorjs.com/docs/updating/8-0)、[Microsoft OpenJDK](https://learn.microsoft.com/en-us/java/openjdk/download)、[Android SDK 工具](https://developer.android.com/studio)。

```powershell
$env:JAVA_HOME='<JDK21目录>'
$env:ANDROID_HOME='<AndroidSDK目录>'
./build-android.ps1
```

输出 `releases/Xinxin-0.1.0-debug.apk`，用于个人侧载测试。正式发布需主人的签名密钥；当前未生成发布密钥、未上传商店。路径预检参数处理 Windows 中文工作目录。

默认调试包连接自己的 HTTPS 后端。手机的 localhost 指手机自己，不能用它连接电脑。当前没有部署云服务器，额外提供同 Wi-Fi 局域网联调包：

```powershell
./build-android.ps1 -LocalNetwork
```

输出 `releases/Xinxin-0.1.0-local-test.apk`。此构建只在原生 Android 中允许 HTTP 私有 IPv4（10/8、172.16/12、192.168/16），Web 和默认包仍要求远程 HTTPS。调试 manifest 可用清文传输，release manifest 明确关闭；仅此局域网包打开 WebView 混合请求。正式服务器就绪后使用 HTTPS 包。原生壳使用 APK 内置网页，不再注册 PWA Service Worker；旧壳的注册在进入新版后解除，防止安装包更新被网页缓存遮住。

在项目父目录运行 `手机联调Xinxin.cmd`，它停止本启动器拥有的服务后以手机模式启动后端，并打印电脑局域网地址。把 APK 通过 USB 或自己的文件传输方式放到手机侧载；手机与电脑使用同一个可信 Wi-Fi，在连接页面填打印的 `http://电脑局域网IP:8000`，然后用既有主人账户登录。不需要在 APK 中填模型密钥。Windows 防火墙如有提示，仅允许私人网络；启动器不会自动改防火墙。

测试手机上传文档/图片、资源库附件复用、Agent 流式任务、下载分享和软键盘；APK 已构建、签名及包内网页核对，**实体手机尚待主人验收**。测试结束先运行父目录 `Stop-Xinxin.ps1`，再运行 `启动Xinxin.cmd` 恢复只监听本机。局域网 HTTP 用于本次本地联调；云端使用有效 HTTPS。

应用仅需网络权限，系统备份已关闭。认证留在应用私有存储；私人资料和服务器/模型密钥留后端。PWA 只缓存界面静态资源。
