param([switch]$SkipWebBuild,[switch]$LocalNetwork)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$portableJava=Join-Path $PSScriptRoot '.toolchains/jdk/jdk-21.0.12.1+1'
$portableSdk=Join-Path $PSScriptRoot '.toolchains/sdk'
if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath $portableJava)) {$env:JAVA_HOME=$portableJava}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath $portableSdk)) {$env:ANDROID_HOME=$portableSdk}
if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) {throw '请安装 JDK 21 和 Android SDK 36，并设置 JAVA_HOME、ANDROID_HOME。见 docs/android.md。'}
$env:GRADLE_USER_HOME=Join-Path $PSScriptRoot '.toolchains/gradle'
$previousLocalMode=$env:VITE_LOCAL_PHONE_TEST
try {
  if($LocalNetwork -and $SkipWebBuild){throw '局域网测试包必须重新构建网页，不能使用 SkipWebBuild'}
  $env:VITE_LOCAL_PHONE_TEST=if($LocalNetwork){'1'}else{'0'}
  if (-not $SkipWebBuild) {npm run build; if ($LASTEXITCODE -ne 0) {throw '前端构建失败'}}
  npx cap sync android
  if ($LASTEXITCODE -ne 0) {throw 'Android 同步失败'}
} finally {$env:VITE_LOCAL_PHONE_TEST=$previousLocalMode}
Push-Location -LiteralPath (Join-Path $PSScriptRoot 'android')
try {
  & ./gradlew.bat assembleDebug --no-daemon --console=plain '-Pandroid.overridePathCheck=true'
  if ($LASTEXITCODE -ne 0) {throw 'APK 构建失败'}
} finally {Pop-Location}
$output=Join-Path $PSScriptRoot 'releases'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$packageName=if($LocalNetwork){'Xinxin-0.1.0-local-test.apk'}else{'Xinxin-0.1.0-debug.apk'}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'android/app/build/outputs/apk/debug/app-debug.apk') -Destination (Join-Path $output $packageName)
Get-FileHash -LiteralPath (Join-Path $output $packageName) -Algorithm SHA256
