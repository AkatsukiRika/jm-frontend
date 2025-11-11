> 本文编写于 2024 年 3 月，文中提到的项目架构参考了以下文档：
> 
> [https://juejin.cn/post/7141269750277439496](https://juejin.cn/post/7141269750277439496)
> 
> [https://juejin.cn/post/7222897518501543991](https://juejin.cn/post/7222897518501543991)

# 引子

切换到 Compose 也有半年的时间了，在这期间接手过好几个项目，都用的是基于 MVVM 改进的 MVI 架构，即一个 Screen（对应整个页面的大型可组合项）对应一个 ViewModel 类，ViewModel 中定义 State、Effect 和 Event 的实现。最近在掘金上看到 Tlaster 写的两篇文章，发现了还有更加函数式、可组合式的实现，于是将其运用在了近期写的一个供团队内部使用的视频播放小工具中。

基于类的 MVI 架构可参考这篇文档 ( https://www.tang-ping.top/documents?id=100140 )，其中的**项目架构 -> UI 架构**中有提到具体的实现方式。

# 需求

这个小工具的需求主要分为四类，对应 4 个 Tab，对应的 UI 示意图如下：

![image](/assets/images/documents/img_new_1.png)

# 实现

## 1. 以 HorizontalPager 取代 Fragment

遇到这种几个底 Tab + 上方不同功能页面的场景，比较常见的方案就是一个 Activity + 多个 Fragment。在 Compose 的 Pager 系列组件出现以后，实际上可以不用再使用 Fragment 了。换成以下这种实现方式：

```kotlin
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MainScreen() {
    var selectedIndex by remember { mutableIntStateOf(0) }
    val pagerState = rememberPagerState(initialPage = 0, pageCount = { 4 })
    
    Column(modifier = Modifier.fillMaxSize()) {
        MainPager(
            pagerState = pagerState,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        )
        
        BottomLayout(
            selectedIndex = selectedIndex,
            onSelect = { selectedIndex = it },
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MainPager(
    modifier: Modifier = Modifier,
    pagerState: PagerState
) {
    HorizontalPager(
        state = pagerState,
        modifier = modifier,
        userScrollEnabled = false
    ) {
        when (it) {
            0 -> LocalScreen()
            1 -> OnlineScreen()
            2 -> CacheScreen()
            3 -> SettingsScreen()
            else -> LocalScreen()
        }
    }
}
```

这样一来，相比 Fragment 的方案优点是省去了一些必须要在 Activity 类中编写的代码，但是也带来了一个新的问题，这个问题后面会讲到。

## 2. 以 Presenter 取代 ViewModel

将整个页面拆分成四个 Screen 后，就能以 Screen 的粒度思考状态管理的方案了。由于本次我们需要使用函数式的 MVI 架构，需要引入一个由 Tlaster 编写的库以简化代码的编写。这个库在之前的 Compose 跨平台文档 ( https://www.tang-ping.top/documents?id=100140 ) 中也有用到：

```kotlin
api("moe.tlaster:precompose:1.6.0-beta01")
api("moe.tlaster:precompose-molecule:1.6.0-beta01")
```

以状态最复杂的 B 页面（OnlineScreen）为例，可以编写一个 Presenter 可组合项用于管理状态。这个可组合项不创建 UI，而是利用 Compose 自身的重组机制，在每次状态变化时返回一个新的状态实例：

```kotlin
@SuppressLint("ComposableNaming")
@Composable
fun OnlinePresenter(context: Context, actionFlow: Flow<OnlineAction>, callback: ActivityCallback): OnlineState {
    var searchText by remember { mutableStateOf("") }
    var resourceLink by remember { mutableStateOf("") }
    var showAdvancedSearchDialog by remember { mutableStateOf(false) }
    
    /* 中间省略 */
    
    return OnlineState(searchText, resourceLink, showAdvancedSearchDialog)
}

data class OnlineState(
    val searchText: String,
    val resourceLink: String,
    val showAdvancedSearchDialog: Boolean
)
```

注意上面的 OnlinePresenter 方法传入了 `actionFlow: Flow<OnlineAction>` 参数，它的用法和 ViewModel 中相同，通过对其进行 `collect` 操作来处理各种不同的 Action，从而变更当前的状态。而 `ActivityCallback` 则用于实现一些和 Activity 相关的操作（如展示 toast）：

```kotlin
@SuppressLint("ComposableNaming")
@Composable
fun OnlinePresenter(context: Context, actionFlow: Flow<OnlineAction>, callback: ActivityCallback): OnlineState {
    var searchText by remember { mutableStateOf("") }
    var resourceLink by remember { mutableStateOf("") }
    var showAdvancedSearchDialog by remember { mutableStateOf(false) }
    
    fun performSearch() {
        // Kotlin支持嵌套function的写法，这点比较像React
    }
    
    actionFlow.collectAction {
        when (this) {
            is OnlineAction.PerformSearch -> {
                searchText = text    // 更改状态
                performSearch()      // 调用嵌套function
            }
            
            is OnlineAction.ShowToast -> {
                callback.onShowToast(text)    // 调用Activity相关方法
            }
            
            is OnlineAction.ShowAdvancedSearchDialog -> {
                showAdvancedSearchDialog = show
            }
        }
    }
    
    return OnlineState(searchText, resourceLink, showAdvancedSearchDialog)
}

sealed interface OnlineAction {
    data class PerformSearch(val text: String) : OnlineAction
    data class ShowToast(val text: String) : OnlineAction
    data class ShowAdvancedSearchDialog(val show: Boolean) : OnlineAction
}
```

OnlinePresenter 和 ActivityCallback 都是在 MainActivity 中创建，再通过 `onCreate` 中的 `setContent` 方法传给 MainScreen 可组合项的。PreCompose 提供了 `rememberPresenter` 方法用于创建 Presenter，返回值为 `Pair<STATE, Channel<ACTION>` 类型：

```kotlin
class MainActivity : ComponentActivity() {
    private lateinit var onlinePresenter: Pair<OnlineState, Channel<OnlineAction>>
    
    inner class MainActivityCallback: ActivityCallback {
        override fun onShowToast(text: String) {
            Toast.makeText(this@MainActivity, text, Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PreComposeApp {
                val activityCallback = MainActivityCallback()
                onlinePresenter = rememberPresenter(keys = listOf(1)) {
                    OnlinePresenter(context = this, actionFlow = it, callback = activityCallback)
                }
                
                MainScreen(
                    onlineState = onlinePresenter.first,
                    onlineChannel = onlinePresenter.second
                )
            }
        }
    }
}
```

在 MainScreen 中，就可以根据 `STATE` 参数进行 UI 展示，并通过 `Channel<ACTION>` 向 Presenter 传递 Action 了：

```kotlin
// 省略参数的逐级传递过程
@Composable
fun OnlineScreen(state: OnlineState, channel: Channel<OnlineAction>) {
    MainColumn(
        state = state,
        onSearch = {
            channel.trySend(OnlineAction.PerformSearch(it))
        },
        onAdvancedSearchClick = {
            if (!state.showAdvancedSearchDialog) {
                channel.trySend(OnlineAction.ShowAdvancedSearchDialog(true))
            }
        }
    )
    
    if (state.showAdvancedSearchDialog) {
        AdvancedSearchDialog()
    }
}
```

这种方式贯彻了 MVI 的单向数据流思想，原来在 ViewModel 中使用到的 Effect 类也可以根据情况使用 Action + State 或 ActivityCallback 实现相同的功能。

## 3. 处理参数逐级传递的问题

上面的第一节提到了一个使用 Pager 方案产生的问题，这个问题就是参数传递深度过深。以 `rememberPresenter` 返回的两个参数为例，它们在 MainActivity 中被创建出来，在相应 tab 的 Screen 中被使用，经过了 Activity -> MainScreen -> MainPager -> Screen 的链路。而 Screen 中还会根据 UI 做可组合项的拆分，将会导致传递的层级更深。

对这个问题，我的解决方法是为每一个 Kotlin 文件创建一个类似 React 中 Context 的类实例，在这个文件内的子组合项就可以直接读取其中的值，而不需要逐层传参。例如 MainScreen 在传入了三个 Presenter 后可以写成这样：

```kotlin
data class MainScreenRelation(
    val localState: LocalState, val localChannel: Channel<LocalAction>,
    val onlineState: OnlineState, val onlineChannel: Channel<OnlineAction>,
    val cacheState: CacheState, val cacheChannel: Channel<CacheAction>
)

private var relationFlow = MutableStateFlow<MainScreenRelation?>(null)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MainScreen(
    localState: LocalState,
    localChannel: Channel<LocalAction>,
    onlineState: OnlineState,
    onlineChannel: Channel<OnlineAction>,
    cacheState: CacheState,
    cacheChannel: Channel<CacheAction>
) {
    LaunchedEffect(
        localState,
        localChannel,
        onlineState,
        onlineChannel,
        cacheState,
        cacheChannel
    ) {
        val relation = MainScreenRelation(
            localState,
            localChannel,
            onlineState,
            onlineChannel,
            cacheState,
            cacheChannel
        )
        relationFlow.emit(relation)
    }
    // 其他代码省略
}
```

在 MainPager 中就可以简单地从 `relationFlow` 获取 State 和 Channel 了：

```kotlin
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MainPager(
    modifier: Modifier = Modifier,
    pagerState: PagerState
) {
    HorizontalPager(
        state = pagerState,
        modifier = modifier,
        userScrollEnabled = false
    ) {
        val relation = relationFlow.collectAsStateWithLifecycle().value

        relation?.apply {
            when (it) {
                0 -> LocalScreen(localState, localChannel)
                1 -> OnlineScreen(onlineState, onlineChannel)
                2 -> CacheScreen(cacheState, cacheChannel)
                3 -> SettingsScreen()
                else -> LocalScreen(localState, localChannel)
            }
        }
    }
}
```

# 总结

使用纯函数式的方式编写 Compose 代码确实是一种很新鲜的体验，对我而言更偏向于 React 函数式组件的开发体验。要使用这种开发方式除了可以使用 PreCompose 外，也可以尝试 Slack 推出的一个名为 Circuit 的库 ( https://slackhq.github.io/circuit/ )。相比 PreCompose，Circuit 的使用略显复杂，等我实际使用过后会再新开相应的文章介绍它的使用方法。

实际开发完一个小型项目下来，就个人体验而言，这更多是一种对于新架构的体验，而并非对开发过程中一些痛点问题的本质改善。在进行大项目开发时，还是需要根据具体情况选择合适的项目架构以取得更高的开发效率。