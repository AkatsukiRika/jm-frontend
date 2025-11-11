# 协程是什么？
协程是一种编程思想，并不局限于特定的语言。除 Kotlin 以外，其他的一些语言，如 Go、Python 等都可以在语言层面上实现协程。
Kotlin Coroutine 本质上是 Kotlin 官方提供的一套线程封装 API，其设计初衷是为了解决并发问题，让「协作式多任务」实现起来更方便。

# 协程与线程的关系
从 Android 开发者的角度去理解它们之间的关系：
- 我们所有的代码跑在线程中，而线程跑在进程中
- 协程也是跑在线程中的，可以是单线程，也可以是多线程
- 单线程中，协程的总执行时间并不会比不用协程少
- Android 系统上，在主线程上进行耗时操作（如网络请求），即使用了协程，也需要切换线程

# 协程的基本使用
## 使用 launch 方法
协程在写法上和普通的顺序代码类似，可以让开发者用同步的方式写出异步的代码。创建协程可以使用以下三种方式：
```kotlin
runBlocking {
    // 方法1：使用 runBlocking 顶层函数
}

GlobalScope.launch {
    // 方法2：使用 GlobalScope 单例对象，调用 launch 开启协程
}

val coroutineScope = CoroutineScope(context)
coroutineScope.launch {
    // 方法3：自行通过 CoroutineContext 创建一个 CoroutineScope 对象
}
```
- 方法 1 适用于单元测试场景，实际开发中不使用，因为它是线程阻塞的；
- 方法 2 与 runBlocking 相比不会阻塞线程，但它的生命周期会和 APP 一致，且无法取消；
- 方法 3 比较推荐使用，可以通过 context 参数去管理和控制协程的生命周期。

此处的 launch 方法含义是：创建一个新的协程，并在指定的线程上运行它。传给 launch 方法的连续代码段就被叫做一个协程，传给 launch 方法的方法参数可以用于指定执行这段代码的线程。
```kotlin
coroutineScope.launch(Dispatchers.IO) {
    // 可以通过 Dispatchers.IO 参数把任务切到 IO 线程执行
}

coroutineScope.launch(Dispatchers.Main) {
    // 也可以通过 Dispatchers.Main 参数切换到主线程
}
```

## 使用 withContext 方法
这个方法可以切换到指定的线程，并在闭包内的逻辑执行结束之后，自动把线程切换回去继续执行，如下所示：
```kotlin
coroutineScope.launch(Dispatchers.Main) {        // 在 UI 线程开始
    val image = withContext(Dispatchers.IO) {    // 切换到 IO 线程
        getImage(imageId)                        // 在 IO 线程执行
    }
    imageView.setImageBitmap(image)              // 回到 UI 线程更新 UI
}
```
该方法支持自动切回原来的线程，能够消除并发代码在协作时产生的嵌套。如果需要频繁地进行线程切换，这种写法将有很大的优势，这就是「使用同步的方式写异步代码」。

## 使用 suspend 关键字
我们可以把 withContext 单独放进一个方法里面，此方法需要使用 suspend 关键字标记才能编译通过：
```kotlin
suspend fun getImage(imageId: Int) = withContext(Dispatchers.IO) {}
```
使用 launch、async 等方法创建的协程，在执行到某个 suspend 方法时会从正在执行它的线程上脱离。互相脱离后的线程和协程将会分别执行不同的任务：
- 线程：线程执行到了 suspend 方法，就暂时不再执行剩余协程代码，跳出协程的代码块。如果它是一个后台线程，它会被系统回收或者再利用（继续执行别的后台任务），与 Java 线程池中的线程等同；如果它是 Android 主线程，它会继续执行界面刷新任务。
- 协程：协程会从上面被挂起的 suspend 方法开始，在该方法的参数指定的线程（如 Dispatchers.IO 所指定的 IO 线程）中继续往下执行。suspend 方法执行完成之后，会重新切换回它原先的线程。这个「切回来」的动作，在 Kotlin 中叫做 resume。

suspend 关键字只是一个提醒，为了让它包含真正挂起的逻辑，要在它内部直接或间接调用 Kotlin 自带的 suspend 方法。该关键字本身只有一个效果：限制这个方法只能在协程里或者另一个 suspend 方法中被调用，否则就会编译不通过。

## 获取协程的返回值
协程是一种异步的概念，需要一些特殊操作才能获取返回值。获取协程的返回值可以使用以下方式：

### async / await
主要流程是使用 async 开启协程，然后调用 async 返回的 Deferred 对象的 await 方法获取协程运算的结果：
```kotlin
coroutineScope.launch(Dispatchers.IO) {
    val job = async {
        delay(1000)
        return@async "return value"
    }
    println("async result=${job.await()}")
}
```

### suspendCoroutine
与 async 不同，suspendCoroutine 只是一个挂起方法，无法开启协程，需要在其他协程作用域中使用。协程运行结束后，使用 resume 提交返回值或使用 resumeWithException 抛出异常。
```kotlin
coroutineScope.launch(Dispatchers.IO) {
    try {
        val result = suspendCoroutine<String> {
            delay(1000)
            val random = Random().nextBoolean()
            if (random) {
                it.resume("return value")
            } else {
                it.resumeWithException(Exception("Coroutine Failure"))
            }
        }
        println("suspendCoroutine success result: $result")
    } catch (e: java.lang.Exception) {
        println("suspendCoroutine failure exception: $e")
    }
}
```

# 协程的非阻塞式挂起
「非阻塞式挂起」指的就是协程在挂起的同时切线程这件事情。使用了协程的代码看似阻塞，但由于协程内部做了很多工作（包括自动切换线程），它实际上是非阻塞的。在代码执行的过程中，线程虽然会切换，但写法上类似普通的单线程代码。
在 Kotlin 中，协程就是基于线程来实现的一种更上层的工具 API，类似于 Android 自带的 Handler 系列 API。在设计思想上，协程是一个基于线程的上层框架。Kotlin 协程并没有脱离 Kotlin 或者 JVM 创造新的东西，只是简化了多线程的开发。

# 代码示例
使用协程模拟实现一个网络请求，等待时显示 Loading，请求成功或者出错让 Loading 消失，并将状态反馈给用户。
在 ViewModel 中编写如下业务逻辑代码：
```kotlin
@HiltViewModel
class MainViewModel @Inject constructor() : ViewModel() {
    enum class RequestStatus {
        IDLE, LOADING, SUCCESS, FAIL
    }
    
    val requestStatus = MutableStateFlow(RequestStatus.IDLE)
    
    /**
     * 模拟网络请求，并将状态设置给 requestStatus 变量
     */
    fun simulateNetworkRequest() {
        requestStatus.value = RequestStatus.LOADING
        viewModelScope.launch {
            val requestResult = async { performSimulatedRequest() }.await()
            requestStatus.value = if (requestResult) RequestStatus.SUCCESS else RequestStatus.FAIL
        }
    }
    
    /**
     * 使用 delay 方法模拟耗时操作，用随机数模拟请求成功或失败
     */
    private suspend fun performSimulatedRequest() = withContext(Dispatchers.IO) {
        delay(500)
        val random = Random()
        return@withContext random.nextBoolean()
    }
}
```
MainActivity 中使用 Jetpack Compose，将请求状态实时显示在界面上：
```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val mainViewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ComposeTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    val requestStatusState = mainViewModel.requestStatus.collectAsState()
                    val requestStatus by rememberSaveable { requestStatusState }
                    
                    Text(
                        text = requestStatus.name,
                        color = Color.Red
                    )
                }
            }
        }
        mainViewModel.simulateNetworkRequest()
    }
}
```