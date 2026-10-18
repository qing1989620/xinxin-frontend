# Android 构建与安装

Capacitor 8.5.3，包名 `com.xinxin.personal`。需要 JDK 21、Android SDK 36、Build Tools 36.0.0。本机便携工具链在 Git 忽略的 `.toolchains/`，没有修改系统 Java/SDK 设置。

依据：[Capacitor Android](https://capacitorjs.com/docs/android)、[Capacitor 8 要求](https://capacitorjs.com/docs/updating/8-0)、[Microsoft OpenJDK](https://learn.microsoft.com/en-us/java/openjdk/download)、[Android SDK 工具](https://developer.android.com/studio)。

```powershell
$env:JAVA_HOME='<JDK21目录>'
$env:ANDROID_HOME='<AndroidSDK目录>'
./build-android.ps1
```

输出 `releases/Xinxin-0.1.0-debug.apk`，用于个人侧载测试。路径预检参数处理Windows中文工作目录，没有上传应用商店。

## 私人 Release 包

```powershell
./build-android.ps1 -Release -BackendUrl 'https://<服务器>.<你的网络>.ts.net'
```

将占位地址换成主人绑定服务器后实际取得的Tailscale HTTPS origin。构建脚本校验HTTPS、禁止账号/路径/查询/片段，执行网页与Release构建、对齐、签名及核验；不能同时启用LocalNetwork或SkipWebBuild。输出 `releases/Xinxin-0.1.0-cloud.apk`，这里的cloud指云服务器，也可仅通过私有网络访问。

发布签名已在忽略目录 `.private/android-signing/` 创建，RSA3072 / PKCS12，随机密码且仅当前Windows用户可访问；以后始终复用。请私下备份密钥库和密码文件，两者都不能丢失、提交Git或公开。发布包关闭调试、清文与系统备份，minSdk24 / targetSdk36。当前私有地址发布包的签名、Manifest、18项网页资源和默认HTTPS字符串校验证据在 [android-cloud-verification.json](android-cloud-verification.json)。实际连接与真机仍需另测，报告中的私有域名已隐去。

旧调试包与发布包签名不同，包名同为 `com.xinxin.personal`；首次安装发布包需先卸载调试版，手机端设置和令牌会清除，服务器资料保留。后续同发布签名可覆盖更新。已有APK也支持在连接页填写任意有效HTTPS后端，无需为了Tailscale放宽清文或关闭证书验证。

手机需先开启Tailscale、登录与服务器相同的个人网络，再打开Xinxin。Tailscale官方Android客户端要求Android8.0及以上，高于Xinxin APK本身的Android7.0要求。Wi-Fi/移动流量切换可重新连接，不依赖电脑开机。同一Android系统VPN通道不能同时给Clash和Tailscale使用；开Clash时Xinxin暂不可连接，云端任务继续，切回Tailscale后获取进度。私有HTTPS已启用且服务自身API验证通过，新发布包与实体手机换网仍待单独验收。

## 局域网联调

默认调试包连接自己的HTTPS后端。手机的localhost指手机自己，不能用它连接电脑。保留同Wi-Fi局域网联调包，供连接本地电脑使用：

```powershell
./build-android.ps1 -LocalNetwork
```

输出 `releases/Xinxin-0.1.0-local-test.apk`。此构建只在原生 Android 中允许 HTTP 私有 IPv4（10/8、172.16/12、192.168/16），Web 和默认包仍要求远程 HTTPS。调试 manifest 可用清文传输，release manifest 明确关闭；仅此局域网包打开 WebView 混合请求。正式服务器就绪后使用 HTTPS 包。原生壳使用 APK 内置网页，不再注册 PWA Service Worker；旧壳的注册在进入新版后解除，防止安装包更新被网页缓存遮住。

在项目父目录运行 `手机联调Xinxin.cmd`，它停止本启动器拥有的服务后以手机模式启动后端，并打印电脑局域网地址。把 APK 通过 USB 或自己的文件传输方式放到手机侧载；手机与电脑使用同一个可信 Wi-Fi，在连接页面填打印的 `http://电脑局域网IP:8000`，然后用既有主人账户登录。不需要在 APK 中填模型密钥。Windows 防火墙如有提示，仅允许私人网络；启动器不会自动改防火墙。

主人已确认旧局域网APK在实体手机连接电脑测试通过，2026-10-18又报告手机实际完成云服务器查看。随后进度分离的新Release通过签名/资源及私有HTTPS下载校验；新版实体安装、附件复用、下载分享、软键盘和网络恢复仍按实际设备结果单独记录，见 [response-review.md](response-review.md)。局域网测试结束先运行父目录 `Stop-Xinxin.ps1`，再运行 `启动Xinxin.cmd` 恢复只监听本机。局域网HTTP仅供可信网络联调，云端使用有效HTTPS。

应用仅需网络权限，系统备份已关闭。认证留在应用私有存储；私人资料和服务器/模型密钥留后端。PWA 只缓存界面静态资源。
