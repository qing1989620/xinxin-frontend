param([switch]$SkipWebBuild)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$portableJava=Join-Path $PSScriptRoot '.toolchains/jdk/jdk-21.0.12.1+1'
$portableSdk=Join-Path $PSScriptRoot '.toolchains/sdk'
if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath $portableJava)) {$env:JAVA_HOME=$portableJava}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath $portableSdk)) {$env:ANDROID_HOME=$portableSdk}
if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) {throw '请安装 JDK 21 和 Android SDK 36，并设置 JAVA_HOME、ANDROID_HOME。见 docs/android.md。'}
$env:GRADLE_USER_HOME=Join-Path $PSScriptRoot '.toolchains/gradle'
if (-not $SkipWebBuild) {npm run build; if ($LASTEXITCODE -ne 0) {throw '前端构建失败'}}
npx cap sync android
if ($LASTEXITCODE -ne 0) {throw 'Android 同步失败'}
Push-Location -LiteralPath (Join-Path $PSScriptRoot 'android')
try {
  & ./gradlew.bat assembleDebug --no-daemon --console=plain '-Pandroid.overridePathCheck=true'
  if ($LASTEXITCODE -ne 0) {throw 'APK 构建失败'}
} finally {Pop-Location}
$output=Join-Path $PSScriptRoot 'releases'
New-Item -ItemType Directory -Path $output -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'android/app/build/outputs/apk/debug/app-debug.apk') -Destination (Join-Path $output 'Xinxin-0.1.0-debug.apk')
Get-FileHash -LiteralPath (Join-Path $output 'Xinxin-0.1.0-debug.apk') -Algorithm SHA256
