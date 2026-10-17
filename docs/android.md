# Android 本地构建

Capacitor 8.5.3，包名 `com.xinxin.personal`。需要 JDK 21、Android SDK 36、Build Tools 36.0.0。本机便携工具链在 Git 忽略的 `.toolchains/`，没有修改系统 Java/SDK 设置。

依据：[Capacitor Android](https://capacitorjs.com/docs/android)、[Capacitor 8 要求](https://capacitorjs.com/docs/updating/8-0)、[Microsoft OpenJDK](https://learn.microsoft.com/en-us/java/openjdk/download)、[Android SDK 工具](https://developer.android.com/studio)。

```powershell
$env:JAVA_HOME='<JDK21目录>'
$env:ANDROID_HOME='<AndroidSDK目录>'
./build-android.ps1
```

输出 `releases/Xinxin-0.1.0-debug.apk`，用于个人侧载测试。正式发布需主人的签名密钥；当前未生成发布密钥、未上传商店。路径预检参数处理 Windows 中文工作目录。

首次填写自己的 HTTPS 后端地址；手机 localhost 指手机自己。当前只启动电脑本地后端，尚未部署云服务器。`adb reverse tcp:8000 tcp:8000` 只能转发端口，本包的 HTTPS WebView 与默认网络策略不会因此自动允许 HTTP 混合请求；本机调试应准备手机信任的 HTTPS 入口或专门的调试配置，尚未进行这项真机验证。网络、原生文件选择、软键盘与分享仍需真机验收。

应用仅需网络权限，系统备份已关闭。认证留在应用私有存储；私人资料和服务器/模型密钥留后端。PWA 只缓存界面静态资源。
