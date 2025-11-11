> 本文写于 2024 年 2 月，部分内容有时效性，请注意甄别。

# 项目简介

本项目基于跨平台 Compose，支持在 Android / macOS / Windows 系统上运行，UI 风格模仿了 Windows 9x 时期的复古设计。主要功能是按照剧本文件（XML 格式）中的指令展示剧情文本，同时支持展示背景 / 前景图像、播放背景音乐 / 角色语音和展示画面动效（使用 Compose 动画 API 制作）。剧情文本内容及系统操作界面所有功能均支持中文 / 日文切换。

该项目的源代码已在 GitHub 上开源，仓库位于 https://github.com/AkatsukiRika/Monologue. 另有使用 React 编写的介绍网页 (https://akatsukirika.github.io/). 目前已有 3 个可分发的软件包可用，分别支持 x64 平台的 Windows 系统和 Apple Silicon / Intel 平台的 macOS，可通过介绍网页或 GitHub 仓库的 Releases 板块下载。

# 技术选型

## 客户端

本项目客户端部分基于 [Compose Multiplatform](https://www.jetbrains.com/lp/compose-multiplatform/) 开发，代码库 100% 使用 Kotlin 完成编写。除 Compose 官方库外，还用到了以下第三方库：

**[PreCompose](https://github.com/Tlaster/PreCompose)**：由国人开发者 @Tlaster 开发的 Compose 跨平台 Navigation & 状态管理框架，在本项目中用于实现 MVI 应用架构和在不同页面之间进行跳转；

**[DataStore](https://developer.android.com/jetpack/androidx/releases/datastore)**：Google 官方的数据存储库，用于用户设置项（当前语言 / 音量等）的持久化；

**[JavaFX](https://openjfx.io/)**：JVM 平台上的 UI 库，带有支持音视频播放的 javafx-media 组件，用于在 macOS / Windows 平台上实现音视频的播放。

## 前端

介绍网页部分使用 React 开发，基于 `create-react-app` 的 `typescript` 模版。内容较为简单，除模版内自带库以外，只引入了 `react-router-dom` 以实现路由跳转。本文将以介绍客户端相关内容为主。

# 项目架构

## 基础框架

对于跨平台 Compose 项目，JetBrains 官方提供了如下网页版工具，用于创建并下载模版项目: https://kmp.jetbrains.com/

本项目的基础框架使用如下模版创建：

![image](assets/images/documents/img_compose_1.png)

项目代码架构图如下所示。图中无边框的黄色节点代表项目中较为重要的类，绿色节点代表 Java Package，紫色节点代表资源文件，有边框节点则代表上层文件夹：

![image](assets/images/documents/img_compose_2.png)

主要的 UI、逻辑代码及项目用到的音视频、XML 等文件均放置在 commonMain 包中，它包含一个 Platform.kt 文件，定义一些跨平台能力的接口，例如以下两个方法分别用于获取和解析存放剧本的 XML 文件：

```kotlin
expect fun getScenarioXML(fileName: String): String

expect fun parseScenarioXML(data: String): GameModels.Scenario
```

在 androidMain 和 desktopMain 两个包中，有 Platform.android.kt 和 Platform.desktop.kt 两个实现类，分别在 Android 和桌面平台上调用各平台的包来实现具体功能。

## UI 架构

UI 部分使用 MVI 架构。每个页面即为一个放在单独文件中的 @Composable 函数，函数的名称以单词 Scene 结尾。每个 Scene 对应一个 ViewModel 实例。每个 ViewModel 都具有 State、Event、Effect 三个子类：

**State**：该页面 UI 相关的所有状态，Scene 通过读取这些状态显示出不同的内容；

**Event**：当 Scene 接收到点击、拖动等交互事件时，通过调用 ViewModel 的 dispatch 方法将事件分发给 ViewModel。ViewModel 处理好事件后会更改 State，Scene 就会读取到新的 State 实例；

**Effect**：当需要在 ViewModel 中触发 Scene 的一次性事件（如跳转页面、展示 Toast）时，从 ViewModel 中调用 emitEffect 方法。Scene 会根据传入的 Effect 类型执行对应的一次性事件。

其中 ViewModel 基于 PreCompose 的 ViewModel 类封装了一个 BaseViewModel，用作项目中所有 ViewModel 的基类，具体代码参见: https://github.com/AkatsukiRika/Monologue/blob/main/composeApp/src/commonMain/kotlin/ui/vm/BaseViewModel.kt

## 开发难点

### 数据持久化

本项目的数据持久化使用的是跨平台的 DataStore 库，只引入 `datastore-preferences-core` 就可以不依赖 Android 平台的组件了。引入方式如下：

```toml
# libs.versions.toml
[versions]
androidx-datastore = "1.1.0-beta01"

[libraries]
androidx-datastore-core = { module = "androidx.datastore:datastore-preferences-core", version.ref = "androidx-datastore" }
```
```kotlin
// build.gradle.kts
kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(libs.androidx.datastore.core)
        }
    }
}
```

跨平台 DataStore 的使用可参考此文档: https://funkymuse.dev/posts/create-data-store-kmp/. 首先在 Platform.kt 中创建如下方法：

```kotlin
internal fun createDataStoreWithDefaults(
    corruptionHandler: ReplaceFileCorruptionHandler<Preferences>? = null,
    coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob()),
    migrations: List<DataMigration<Preferences>> = emptyList(),
    path: () -> String
) = PreferenceDataStoreFactory.createWithPath(
    corruptionHandler = corruptionHandler,
    scope = coroutineScope,
    migrations = migrations,
    produceFile = {
        path().toPath()
    }
)

expect fun createDataStore(): DataStore<Preferences>?
```

其中，`createDataStoreWithDefaults` 作为传入 path 返回 DataStore 实例的工具方法，可以在 Platform.android.kt 及 Platform.jvm.kt 中分别调用以创建对应平台的 DataStore 实例。在 Android 平台上，使用该应用的内部存储目录作为 path：

```kotlin
// Platform.android.kt
actual fun createDataStore(): DataStore<Preferences>? {
    val context = GlobalData.context ?: return null
    return createDataStoreWithDefaults {
        File(context.applicationContext.filesDir, "monologue.preferences_pb").path
    }
}
```

在 Desktop 平台上这里使用的是用户的主目录，也可以指定其他目录：

```kotlin
// Platform.jvm.kt
actual fun createDataStore(): DataStore<Preferences>? = createDataStoreWithDefaults {
    DesktopUtils.getHomeDirectory() + File.separator + "monologue.preferences_pb"
}
```

### 资源读取

本项目的资源全部存放在 `commonMain/resources` 路径下，总共有 `drawable`、`font` 和 `raw` 三个文件夹，与开发 Android 原生程序时保持一致。

在 Android 平台下，可以通过 `context.resources.getIdentifier` 的方式获取对应资源的 ID 取用，例如获取字体：

```kotlin
@SuppressLint("DiscouragedApi")
@Composable
actual fun getFont(name: String, res: String, weight: FontWeight, style: FontStyle): Font {
    val context = LocalContext.current
    val id = context.resources.getIdentifier(res, "font", context.packageName)
    return Font(id, weight, style)
}
```

对于字体文件，Compose Desktop 有封装专门的 API，因此上述方法在 Desktop 平台只需要如下实现即可：

```kotlin
@Composable
actual fun getFont(
    name: String,
    res: String,
    weight: FontWeight,
    style: FontStyle
): Font = androidx.compose.ui.text.platform.Font("font/$res.ttf", weight, style)
```

对于图像文件则更加方便，直接在 @Composable 函数中使用 Image 等组件的 `painterResource` 方法即可，和 Android 上使用 Jetpack Compose 体验是一致的，唯一需要注意的就是需要传入带后缀名的路径：

```kotlin
Image(
    painter = painterResource("drawable/img_settings_bg.webp"),
    contentDescription = null,
    contentScale = ContentScale.Crop,
    modifier = Modifier.fillMaxSize()
)
```

对于 raw 目录下的文件，在 Android 平台使用时，同样可以通过 `getIdentifier` 的方式获取资源 ID。在获取资源 ID 前，要先去掉后缀名，例如读取剧本 XML 文件的代码如下：

```kotlin
@SuppressLint("DiscouragedApi")
actual fun getScenarioXML(fileName: String): String {
    // 去除后缀名
    val context = GlobalData.context ?: return ""
    val split = fileName.split(".")
    if (split.isEmpty()) {
        return ""
    }
    val path = split[0]

    val resourceId = context.resources.getIdentifier(path, "raw", context.packageName)
    val inputStream = context.resources.openRawResource(resourceId)
    val reader = inputStream.reader(charset = StandardCharsets.UTF_8)
    return reader.readText()
}
```

在 Desktop 平台上，由于项目打包后会生成一个 JAR 包将所有内容包含进去，需要先将文件内容写入临时文件，再通过 Java 的 File API 读取这个临时文件。对于这部分操作，我创建了一个 DesktopUtils 工具类：

```kotlin
object DesktopUtils {
    // 跟 Android 上的 getIdentifier 作用类似，这里是获取资源的 URL
    fun getResourceURL(path: String): URL? {
        return this::class.java.classLoader?.getResource("raw/$path")
    }
    
    // 创建临时文件
    fun createTempFileFromResource(url: URL, extension: String = ".tmp"): File {
        val tempFile = File.createTempFile("temp_file", extension)
        tempFile.deleteOnExit()
    
        url.openStream().use { input ->
            tempFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }
        return tempFile
    }
}
```

用上面的方式实现同样的 XML 读取功能，代码如下：

```kotlin
actual fun getScenarioXML(fileName: String): String {
    try {
        val url = DesktopUtils.getResourceURL(fileName) ?: return ""
        val tempFile = DesktopUtils.createTempFileFromResource(url)
        return tempFile.readText(charset = Charsets.UTF_8)
    } catch (e: Exception) {
        e.printStackTrace()
        return ""
    }
}
```

### 音频播放

相关接口在 Platform.kt 中的定义如下：

```kotlin
expect fun playAudioFile(fileName: String, loop: Boolean = false)

expect fun stopAudio()

expect fun playVoice(fileName: String)

expect fun setAudioVolume(volume: Float)
```

在 Android 平台上，实现起来较为简单，直接使用 Android SDK 自带的 MediaPlayer 类即可。这里着重讲一下 Desktop 平台的实现。

Desktop 平台上使用的是普通的 JVM，除了 Compose 和 Kotlin Multiplatform 相关库以外还可以使用 Java 生态的库。Java 本身有 Sound API，但其功能较为简陋且不支持 MP3 格式解码。支持媒体播放的第三方库目前仍在活跃开发且使用者较多的有 vlcj 和 JavaFX，其中 vlcj 需要用户手动安装 VLC 播放器，故选择使用 JavaFX 实现。

JavaFX 官网 (https://openjfx.io/openjfx-docs/#gradle) 推荐的是使用 Gradle 插件的方式添加依赖。由于本项目是跨平台项目，需要手动根据当前平台添加所需要的包：

```kotlin
// 文件名：composeApp/build.gradle.kts
kotlin {
    sourceSets {
        val desktopMain by getting
        desktopMain.dependencies {
            implementation(compose.desktop.currentOs)
            // 添加下面的代码
            val os = DefaultNativePlatform.getCurrentOperatingSystem()
            val arch = DefaultNativePlatform.getCurrentArchitecture()
            println("当前操作系统: $os, 当前架构: $arch")
            val fxSuffix = when {
                os.isWindows -> "win"
                os.isMacOsX -> {
                    if (arch.isArm64) "mac-aarch64" else "mac"
                }
                os.isLinux -> {
                    if (arch.isArm64) "linux-aarch64" else "linux"
                }
                else -> throw IllegalStateException("不支持的操作系统或CPU架构！")
            }
            // 添加需要用到的 JavaFX 模块，按需添加
            implementation("org.openjfx:javafx-base:21.0.1:$fxSuffix")
            implementation("org.openjfx:javafx-controls:21.0.1:$fxSuffix")
            implementation("org.openjfx:javafx-media:21.0.1:$fxSuffix")
            implementation("org.openjfx:javafx-graphics:21.0.1:$fxSuffix")
            implementation("org.openjfx:javafx-swing:21.0.1:$fxSuffix")
        }
    }
}
```

Compose 在 Desktop 平台上的实现是基于 Swing，因此，在使用 JavaFX 的功能前，需要先对 JavaFX 的 Platform 类做一次初始化：

```kotlin
// 文件名：Platform.jvm.kt
private var isJavaFXPlatformInit = false

actual fun playAudioFile(fileName: String, loop: Boolean) {
    if (!isJavaFXPlatformInit) {
        Platform.startup {}
        Platform.setImplicitExit(false)
        isJavaFXPlatformInit = true
    }
    
    Platform.runLater {
        // 具体实现放到这里
    }
}
```

初始化后就可以使用 JavaFX 的 MediaPlayer 类来播放音频了，具体的 API 可参考 JavaFX 官方文档。

### 视频播放

视频播放相比音频播放要复杂一些，Compose 没有支持视频播放的 UI 组件，需要对 Android 和 Desktop 平台分开实现相关的 UI 页面。首先在 Platform.kt 文件中创建如下接口：

```kotlin
@Composable
expect fun VideoScene(navigator: Navigator)
```

之后在两个平台分别实现 `VideoScene` 这个 @Composable 方法，就能实现在不同平台使用不同的 UI 组件了。在 Android 平台上播放视频的互联网教程较多，这里还是着重讲一下 Desktop 平台的处理方式。

上面有提到过，Compose Desktop 底层其实是基于 Swing，也提供了一些与 Swing 互操作的 API。而 JavaFX 也可以通过引入 `javafx-swing` 这个包实现和 Swing 的互操作。这部分的简化版代码如下所示：

```kotlin
@Composable
fun VideoSceneDesktop(navigator: Navigator) {
    var jfxPanel by remember { mutableStateOf<JFXPanel?>(null) }
    
    LaunchedEffect(Unit) {
        SwingUtilities.invokeLater {
            jfxPanel = JFXPanel()
        }
    }
    
    Box(modifier = Modifier
        .onGloballyPositioned {
            SwingUtilities.invokeLater {
                jfxPanel?.preferredSize = Dimension(it.size.width, it.size.height)
            }
        }
    ) {
        jfxPanel?.let {
            SwingPanel(
                modifier = Modifier.fillMaxSize(),
                factory = { it }
            )
        }
        
        DisposableEffect(jfxPanel) {
            if (jfxPanel != null) {
                Platform.runLater {
                    // JavaFX 视频播放代码
                }
            }
        }
    }
}
```

在 Compose UI 中，使用 SwingPanel 可以内嵌 Swing 的组件（类似于 Android 平台上的 AndroidView）。通过在 SwingPanel 内嵌套 JFXPanel 的方式，就可以显示 JavaFX 的 UI 组件了。

要使 JFXPanel 正确显示视频播放器，需要为它设置 JavaFX 的 Scene，具体代码如下所示：

```kotlin
// 省略获取 videoSource 的过程
val media = Media(videoSource)
mediaPlayer = MediaPlayer(media)
val mediaView = MediaView(mediaPlayer)

val root = StackPane()
root.children.add(mediaView)
root.style = "-fx-background-color: BLACK;"
val scene = Scene(root)
jfxPanel?.scene = scene
mediaPlayer?.play()
```

### 编译须知

要编译本项目，需要使用 JDK17，开发工具推荐使用 Android Studio 最新版本。要注意的是，Android Studio 默认自带的 JDK 会由于 `jlink` 和 `jpackage` 命令缺失而导致无法编译 Desktop 包，这时候需要去设置内换用其他 JDK17 发行版：

![image](assets/images/documents/img_compose_3.png)

编译运行 Android 的方式很简单，使用 Android Studio 图形化界面操作或使用 Gradle 命令均可（要注意 Gradle 命令需加上 `composeApp` 前缀）：

```bash
./gradlew composeApp:assembleRelease
```

Desktop 方面，Compose Desktop 不支持跨操作系统的交叉编译，编译 Windows 版本需要在 Windows 系统下执行：

```bash
./gradlew packageMsi
```

在 macOS 平台上由于其支持 Rosetta 2，可以在搭载 Apple Silicon 的 Mac 设备上分别编译 Apple 和 Intel 版本的应用，只需分别安装 ARM64 Native 和 x64 的两套 JDK17 即可。编译前可通过以下命令确认 JDK 的架构：

```bash
java -XshowSettings:properties -version
```
编译命令如下：

```bash
./gradlew packageDmg
```

# 待改进点

1. 在 Linux 平台上无法播放音视频，会出现 `com.sun.media.jfxmedia.MediaException: Could not create player!` 错误。查阅了一些互联网资料，暂时没有找到正确的处理方法；

2. 多语言方面使用的是接口 + 实现类的方式，相较于 Android 上的 `strings.xml`，若后续增添更多语种会使操作略显繁琐；

3. 文字内容使用的是 XML 文件保存，不支持选项分支等功能，若改为使用 Kotlin DSL 实现会更加灵活且支持的功能更为丰富。