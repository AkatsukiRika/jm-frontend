# 项目简介

直接[点击链接](https://www.tang-ping.top/download/z-tools)即可查看项目简介、下载 Android 版本的 APK 包。

源代码已在 GitHub 上开源，iOS 版本需自行使用源代码编译，仓库地址如下：

https://github.com/AkatsukiRika/ZhouTools

# 技术选型

## 客户端

选用 Compose Multiplatform 1.6.10 版本，基于 [Kotlin Multiplatform Wizard](https://kmp.jetbrains.com/) 的 New Project 模版，勾选以下选项：

- Android
    
    - With Compose Multiplatform UI framework based on Jetpack Compose
        
- iOS
    
    - Share UI (with Compose Multiplatform UI framework)
        

本项目第三方库使用情况如下表所示：

|名称|用途|
|---|---|
|[PreCompose](https://github.com/Tlaster/PreCompose)|由 Tlaster 开发的 Compose 跨平台导航、状态管理框架，用于实现 MVI 架构和页面跳转|
|[Ktor](https://ktor.io/)|全 Kotlin 编写的多平台异步网络框架，用于实现网络请求|
|[kotlinx.serialization](https://github.com/Kotlin/kotlinx.serialization)|全 Kotlin 编写的跨平台序列化和反序列化库，用于 JSON 解析|
|[kotlinx.datetime](https://github.com/Kotlin/kotlinx-datetime)|全 Kotlin 编写的跨平台时间与日期库，用于实现时间与日期相关功能|
|[DataStore](https://developer.android.com/kotlin/multiplatform/datastore)|Kotlin Multiplatform 上的 DataStore，用于数据持久化，在 1.1.0 以上版本已正式支持 KMP|
|[KmLogging](https://github.com/LighthouseGames/KmLogging)|Kotlin 跨平台的日志库，用于日志打印，在 Android / iOS 平台上均使用系统原生日志功能|
|[Molecule](https://github.com/cashapp/molecule)|一种使用 Jetpack Compose 构建 StateFlow 的库，用于配合 PreCompose 实现 MVI 架构|
|[Material3](https://mvnrepository.com/artifact/org.jetbrains.compose.material3/material3)|Google 最新 Material You 设计风格的组件库，部分 UI 组件有用到|

## 服务端

与 [TangPing Web](https://www.tang-ping.top/) 网页端使用同一套接口服务，服务端全部使用 Dart 语言编写，使用 JWT Token 进行用户注册 / 登录验证，数据库采用 MongoDB。

架构方面，通过纯 Dart 代码简单实现了一套 MVC 架构，没有用到第三方的服务端框架（Dart 生态中此类框架也较少），整体实现可参考下图：

![image](/assets/images/documents/img_cmp_1.png)

# 代码架构

客户端整体的代码架构图如下：

![image](/assets/images/documents/img_cmp_2.png)

本项目共分两个模块，一个是承载所有 UI 页面和上层逻辑的 `composeApp` 模块，另一个是实现 DataStore 跨平台持久化存储的 `kotStore` 模块。

`kotStore` 模块的 Android 版代码仓库地址为 https://github.com/AkatsukiRika/KotStore ，本项目中将其移植到了 KMP 上，基于正式版本（1.1.1）的 `datastore-preferences-core` 依赖，并增加了在 iOS 上创建持久化文件的接口。

资源存储方面，Compose Multiplatform 从 1.6 版本起支持了与 Android 平台相似的资源管理 API，这些资源都被存放在 `composeApp/commonMain/composeResources` 路径下。本项目中用到了一系列的 SVG 矢量图（转换成 XML 格式）及 `strings.xml` 字符串资源文件。

UI 方面，本项目使用的是函数式（而非 `ViewModel` 类）的 MVI 架构，与文档「[写一个视频播放小工具，尝试一种很新的 Compose 项目架构](https://www.tang-ping.top/documents?id=100150)」中相同，基于 Molecule 及 PreCompose 库。为实现底 Tab + 多 Fragment 样式的首页，使用了 HorizontalPager + 多个 `@Composable` 函数的实现方式，这一部分同样参见本段内提到的文档。

# 开发重点

## 1. 跨平台网络请求

用 Ktor 发起 HTTP 网络请求，通过 JSON 格式进行数据交换，解析 JSON 使用的是 `kotlinx-serialization` 库。这部分的主要逻辑都在 [NetworkHelper.kt](https://github.com/AkatsukiRika/ZhouTools/blob/main/composeApp/src/commonMain/kotlin/helper/NetworkHelper.kt) 文件中（可直接点击查看源代码）。

存在部分接口数据，服务端返回的是 Double 类型，而客户端需要转换成 Long 类型处理。使用 `kotlinx-serialization` 库可以直接定义一个 `DoubleToLongSerializer` 类：

```Kotlin
object DoubleToLongSerializer : KSerializer<Long> {
    override val descriptor: SerialDescriptor
        get() = PrimitiveSerialDescriptor("DoubleToLong", PrimitiveKind.LONG)

    /**
     * 反序列化时，需要把服务端发送过来的 Double 转换成 Long
     */
    override fun deserialize(decoder: Decoder): Long {
        return decoder.decodeDouble().toLong()
    }

    /**
     * 序列化时无需转换，直接发送 Long 格式给服务端
     */
    override fun serialize(encoder: Encoder, value: Long) {
        encoder.encodeLong(value)
    }
}
```

需要进行转换的 model 类参数直接加上相应的注解即可：

```Kotlin
@Serializable
data class DepositMonth(
    @Serializable(with = DoubleToLongSerializer::class)
    @SerialName("month_start_time")
    val monthStartTime: Long = 0L,
    @Serializable(with = DoubleToLongSerializer::class)
    @SerialName("current_amount")
    val currentAmount: Long = 0L,
    @Serializable(with = DoubleToLongSerializer::class)
    @SerialName("monthly_income")
    val monthlyIncome: Long = 0L,
    @Serializable(with = DoubleToLongSerializer::class)
    @SerialName("extra_deposit")
    val extraDeposit: Long = 0L
)
```

## 2. 跨平台时间/日期操作

这部分使用了 `kotlinx-datetime` 库，支持一系列时间、日期操作且能跨平台，例如在本项目中特别常用的计算某天起始时间戳功能，可以这样写：

```Kotlin
fun Long.dayStartTime(): Long {
    val instant = Instant.fromEpochMilliseconds(this)
    val localDateTime = instant.toLocalDateTime(TimeZone.currentSystemDefault())
    val startOfDay = localDateTime.date.atStartOfDayIn(TimeZone.currentSystemDefault())
    return startOfDay.toEpochMilliseconds()
}
```

对时间戳进行的很多操作都可以封装成 Long 类型的扩展函数，并单独存放在一个顶层 Kotlin 文件中（例如 `TimeExt.kt`）。相比封装成 `TimeUtils` 类的传统方式，能减少冗余代码，提高可读性。

## 3. Util 与 Helper 类的区别

在很多 Android 项目中都能同时看到 `util` 和 `helper` 包，很容易混淆这两者的职责。在这个项目中，`helper` 目录下包含这些文件：

![image](/assets/images/documents/img_cmp_3.png)

其中 `effect` 子目录下的文件用于全局事件传递，其余的 Helper 单例类都是针对项目里的某个业务场景将一些方法封装起来。例如 `NetworkHelper` 中包含的一部分函数定义如下：

```Kotlin
/**
 * @return First in pair indicates whether login is performed successfully.
 * Second in pair is error message when login failed; JWT token when login succeeded.
 */
suspend fun login(request: LoginRequest): Pair<Boolean, String?>

/**
 * @return error message when registration failed; null when registration succeeded.
 */
suspend fun register(request: RegisterRequest)

/**
 * @return isSuccess to errorMessage
 */
suspend fun syncMemo(token: String, request: MemoSyncRequest): Pair<Boolean, String?>

suspend fun getServerMemos(token: String, username: String): List<Memo>?
```

可以看出都是一些与具体业务强关联的函数封装。而本项目的 `util` 包下面只有两个单例类 `CalendarUtil` 和 `TimeUtil`，其中 `TimeUtil` 的函数定义如下：

```Kotlin
object TimeUtil {
    fun currentTimeMillis(): Long

    fun toEpochMillis(year: Int, month: Int, day: Int, hour: Int, minute: Int): Long

    fun monthYearStringToMonthStartTime(monthYearString: String): Long?
}
```

即 `util` 包下的内容都是比较纯粹的工具类，不与业务相耦合。与第 2 点所讲的相同，在封装工具函数时，也应该根据具体场景决定是封装为扩展函数还是单例工具类。

## 4. 返回手势适配

iOS 没有 Android 一样的物理返回键或全面屏返回手势，依靠 APP 自行实现右滑返回效果。本项目依靠 PreCompose 中 `NavHost` 组件实现了接近原生的右滑返回，且双端均可用。

首先，在项目入口的 `@Composable` 函数中定义 `swipeProperties`（用于定制滑动手势相关的参数，如可滑动的空间）和 `navTransition`（页面进场/出厂等导航动画）两个参数：

```Kotlin
@Composable
@Preview
fun App() {
    PreComposeApp {
        val navigator = rememberNavigator()
        var swipeProperties: SwipeProperties? = remember { SwipeProperties() }
        val navTransition = remember {
            NavTransition(
                createTransition = slideInHorizontally(animationSpec = tween(easing = LinearEasing)) { it },
                destroyTransition = slideOutHorizontally(animationSpec = tween(easing = LinearEasing)) { it },
                pauseTransition = slideOutHorizontally { -it / 4 },
                resumeTransition = slideInHorizontally { -it / 4 },
                exitTargetContentZIndex = 1f
            )
        }
    }
}
```

在 `NavHost` 中设置好，并为每一个 `scene` 都加上 `navTransition` 参数，就可以实现双端右滑返回了：

```Kotlin
NavHost(
    navigator = navigator,
    swipeProperties = swipeProperties,
    navTransition = navTransition,
    initialRoute = if (isLogin) RouteConstants.ROUTE_HOME else RouteConstants.ROUTE_LOGIN
) {
    scene(
        route = RouteConstants.ROUTE_LOGIN,
        navTransition = navTransition
    ) {
        AppTheme {
            LoginScene(navigator)
        }
    }
}
```

## 5. 状态栏、导航栏与软键盘

这一部分需要借助 `Platform.kt` 编写一些平台相关的代码。Kotlin Multiplatform 也支持在 iOS 平台上与 Swift 或 Objective-C 互操作，但这里尽量通过 Kotlin 单语言实现功能。

对于手机端 APP，实现沉浸式状态栏、底部导航栏可以提升 UI 的美观度和整体性。在 Android 上我们可以很方便地调用系统 API 来实现这个功能：

```Kotlin
actual fun setStatusBarColor(colorStr: String, isLight: Boolean) {
    val window = MainActivity.window ?: return
    window.statusBarColor = Color.parseColor(colorStr)
    if (isLight) {
        window.decorView.systemUiVisibility = window.decorView.systemUiVisibility or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
    } else {
        window.decorView.systemUiVisibility = window.decorView.systemUiVisibility and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
    }
}

actual fun setNavigationBarColor(colorStr: String, isLight: Boolean) {
    val window = MainActivity.window ?: return
    window.navigationBarColor = Color.parseColor(colorStr)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        if (isLight) {
            window.decorView.systemUiVisibility = window.decorView.systemUiVisibility or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        } else {
            window.decorView.systemUiVisibility = window.decorView.systemUiVisibility and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
        }
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        window.navigationBarDividerColor = Color.parseColor(colorStr)
    }
}
```

在 iOS 上，我们可以将这两个接口方法的实现置空，通过另一种无需触及 Native iOS API 的方式实现。首先，进入 `ContentView.swift` 文件，在 `ComposeView()` 后添加 `.ignoresSafeArea()` 以使 Compose 渲染出来的画面占满全屏：

```Swift
struct ContentView: View {
    var body: some View {
        ComposeView()
                .ignoresSafeArea()
    }
}
```

接着，在每一个页面判断当前是否为 iOS 平台，若是，则留出顶部状态栏和底部导航栏的 Padding 即可：

```Kotlin
var rootModifier = Modifier
    .imePadding()
    .fillMaxSize()
    .background(AppColors.Background)
if (isIOS()) {
    // Compose Multiplatform 自带的相关 API
    rootModifier = rootModifier
        .statusBarsPadding()
        .navigationBarsPadding()
}
```

软键盘方面，Android 上默认的软键盘模式为 `adjustResize`，当软键盘弹出时，程序的主窗口大小会跟随调整，符合本项目的预期需求，但在 iOS 上也需要做一些定制。首先在 `MainViewController.kt` 中设置一下 `onFocusBehavior`，使 `ComposeView` 高度不跟随软键盘变动：

```Kotlin
fun MainViewController() = ComposeUIViewController(configure = {
    onFocusBehavior = OnFocusBehavior.DoNothing
}) { App() }
```

接下来在需要用到软键盘的页面中，对 `Modifier` 加上 `imePadding()` 这个链式调用，它可以在软键盘弹出时自动为页面添加底部 Padding。

在某些场景下也需要手动关闭软键盘，这部分操作就可以通过封装平台相关的代码实现：

```Kotlin
// Platform.android.kt
actual fun hideSoftwareKeyboard() {
    val context = MainActivity.context ?: return
    val imeManager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
    val currentFocus = (context as? Activity)?.currentFocus
    val windowToken = currentFocus?.windowToken
    windowToken?.let {
        imeManager.hideSoftInputFromWindow(windowToken, 0)
    }
}

// Platform.ios.kt
actual fun hideSoftwareKeyboard() {
    val sharedApp = UIApplication.sharedApplication()
    val window = sharedApp.keyWindow
    window?.endEditing(true)
}
```

## 6. 全局事件传递

在基于 `ViewModel` 类的 MVI 模式中，有 Effect 的存在，可以由 ViewModel 层去触发一些一次性事件（如展示 Toast、路由跳转等）。本项目中使用单例类配合全局 Effect，同时实现了一次性事件传递和页面间数据沟通两种功能。

全局 Effect 基于观察者模式，基类 `BaseEffectObserver` 封装了发送事件和监听事件相关的一些基础操作：

```Kotlin
open class BaseEffectObserver<T> {
    private val effectFlow = MutableSharedFlow<T?>(replay = 1)

    fun emitSync(effect: T?) {
        runBlocking {
            effectFlow.emit(effect)
        }
    }

    suspend fun emit(effect: T?) {
        effectFlow.emit(effect)
    }

    @Composable
    fun observeComposable(onEffect: (T) -> Unit) {
        val effect = effectFlow.collectAsStateWithLifecycle(null).value

        LaunchedEffect(effect) {
            if (effect != null) {
                onEffect(effect)
                emit(null)
            }
        }
    }
}
```

对于每一个具体页面，只需要定义好该页面涉及到的 Effect，继承此基类并将 Effect 类通过范型参数 `T` 传入。例如日程安排（Schedule）页面：

```Kotlin
class ScheduleEffectObserver : BaseEffectObserver<ScheduleEffect>()

sealed interface ScheduleEffect {
    data object RefreshData : ScheduleEffect
}
```

在 `EffectHelper` 类中，为发送、监听每一种 Effect 事件的操作再进行一层封装，可以提高调用便利性：

```Kotlin
object EffectHelper {
    private val scheduleEffectObserver by lazy {
        ScheduleEffectObserver()
    }
    
    fun emitScheduleEffect(effect: ScheduleEffect, scope: CoroutineScope? = null) {
        if (scope == null) {
            scheduleEffectObserver.emitSync(effect)
        } else {
            scope.launch {
                scheduleEffectObserver.emit(effect)
            }
        }
    }
    
    @Composable
    fun observeScheduleEffect(onEffect: (ScheduleEffect) -> Unit) {
        scheduleEffectObserver.observeComposable(onEffect)
    }
}
```

封装好后，在对应页面的 `@Composable` 函数中监听 Effect Flow 并处理，在需要发送事件的位置调用 `emit` 函数就能够实现全局事件传递了。

# 总结

Kotlin Multiplatform 和 Compose Multiplatform 的开发进度很快，功能也在逐步变得越来越全面，之前缺少的资源管理等功能都在[这次 1.6 版本的更新](https://juejin.cn/post/7343509431714414633)上补齐了。作为 Kotlin 开发者可以多关注一下这方面的进展，有助于丰富自己的技术栈。

目前 iOS 版本的 Compose Multiplatform 已进入 Beta 阶段，Web 段也已进入 Alpha 阶段，值得期待这个技术后续的发展。