# 什么是 Flow？
Flow 是 Kotlin 协程中的一种数据类型，它可以顺序发出多个相同数据类型的值。这有点类似于 Iterator，但不同的是，Flow 的内部实现使用了 suspend 方法，令值的生产和消费都可以异步进行。因此，它不会阻塞主线程，可以安全地结合网络请求等异步任务使用。

Flow 中主要涉及到三个角色：

- 生产者：将值加入到数据流之中，支持异步生产；
- 中介者：可以修改加入到数据流中的每个值，或者数据流本身；
- 消费者：从数据流中获取值并消费。

# Flow 的简单用法
在这一部分中，我们将模拟一个运动心率 App 的功能，在运动过程中实时获取用户的心率，并打印在终端中。

Flow 的上游部分实现如下：
```Kotlin
class HeartRateDataSource(
    private val provider: IHeartRateProvider,
    private val refreshIntervalMs: Long = 1000
) {
    val currentBpm: Flow<Int> = flow {
        while (true) {
            val currentBpm = provider.getCurrentBpm()
            emit(currentBpm)
            delay(refreshIntervalMs)
        }
    }
}

interface IHeartRateProvider {
    suspend fun getCurrentBpm(): Int
}

class HeartRateProvider : IHeartRateProvider {
    override suspend fun getCurrentBpm(): Int {
        communicateWithHealthKit()
        return (80..180).random()
    }

    private suspend fun communicateWithHealthKit() {
        delay((400L..600L).random())
    }
}
```
在模拟过程中，我们假设心率表与 App 一次通信需要的时间在 400 ~ 600 ms 之间，每秒钟进行一次通信，返回 80 ~ 180 bpm 之间的随机心率数值。

Flow 的下游部分实现如下：
```Kotlin
suspend fun main() {
    val provider = HeartRateProvider()
    val dataSource = HeartRateDataSource(provider)

    dataSource.currentBpm.collect {
        println("Time=${System.currentTimeMillis()}, Heart Rate=$it")
    }
}
```
使用 IntelliJ IDEA 创建的 Kotlin Gradle Project 可以直接点击运行 suspend main 方法，运行后即可收到多个值：
```
Time=1693902368932, Heart Rate=145
Time=1693902370362, Heart Rate=176
Time=1693902371925, Heart Rate=93
Time=1693902373420, Heart Rate=159
Time=1693902374945, Heart Rate=111
......
```

# Flow 操作符
## 中间操作符
对上面的示例进行修改，增加中介者角色，通过中间操作符来对原本的 Flow 进行修改，就可以实现根据当前的心率值展示不同提示文字的功能。

在 HeartRateDataSource 类中增加如下方法：
```kotlin
val message: Flow<String> = currentBpm.transform {
    val message = when {
        it < 120 -> "You're running too slow. Pace up!"
        it > 160 -> "You're running too fast. Slow down!"
        else -> "The speed is suitable for you. Keep it up!"
    }
    emit(message)
}
```
这里使用的 transform 就是一种中间操作符。这些操作符应用于上游流，并返回下游流，使用方式与转换 List、Map 等集合类型时相似，但尾缀闭包内的代码块支持调用 suspend 方法，可以用来执行一些耗时操作。

将之前定义的 main 方法修改如下，只对 message 进行 collect 操作，即可在终端输出中看到随机的信息：
```kotlin
suspend fun main() {
    val provider = HeartRateProvider()
    val dataSource = HeartRateDataSource(provider)

    dataSource.message.collect {
        println("Time=${System.currentTimeMillis()}, Message=$it")
    }
}
```

## 末端操作符
一般来说，中间操作符主要用来执行一些操作，不会触发流的执行，返回值还是 Flow 类型。而末端操作符会触发流的执行，返回值不是 Flow 类型。最常用的末端操作符是在上面也有出现过的 collect，除此之外还有 reduce 和 fold 等。

详情可参考 Kotlin 官方文档：https://kotlinlang.org/docs/flow.html#terminal-flow-operators

# StateFlow
上面所用到的 Flow 是冷流，它只有在订阅者 collect 数据时，才按需执行发射数据流的代码，且和订阅者是一对一的关系，一旦订阅者停止监听或者生产代码结束，数据流就会自动关闭。而 StateFlow 属于热流，无论是否有订阅者，都可以生产数据。

在 Android 开发中，StateFlow 可以用作 LiveData 的替代品，定义在 ViewModel 中，用于承载 UI 相关的状态。继续上面的示例，让我们定义一个 HeartRateViewModel，如下：
```kotlin
@OptIn(DelicateCoroutinesApi::class)
class HeartRateViewModel(private val dataSource: HeartRateDataSource) {
    private val _uiState = MutableStateFlow(HeartRateUiState())
    val uiState: StateFlow<HeartRateUiState> = _uiState

    init {
        GlobalScope.launch {
            dataSource.currentBpm.onEach { bpm ->
                val message = when {
                    bpm < 120 -> "You're running too slow. Pace up!"
                    bpm > 160 -> "You're running too fast. Slow down!"
                    else -> "The speed is suitable for you. Keep it up!"
                }

                _uiState.value = HeartRateUiState(bpm, message)
            }.collect()
        }
    }
}

data class HeartRateUiState(
    val currentBpm: Int = 0,
    val message: String = ""
)
```

创建一个新的 main 方法，对 HeartRateViewModel 的 uiState 执行 collect 操作并运行，即可同时看到当前的心率值与提示文字：
```kotlin
suspend fun main() {
    val provider = HeartRateProvider()
    val dataSource = HeartRateDataSource(provider)
    val viewModel = HeartRateViewModel(dataSource)

    viewModel.uiState.collect {
        println("Time=${System.currentTimeMillis()}, BPM=${it.currentBpm}, message=${it.message}")
    }
}
```

若使用 Jetpack Compose 开发 UI，直接在 @Composable 方法中使用 collectAsState() 方法，即可很方便地将 StateFlow 的值直接与 UI 绑定起来。

# SharedFlow
SharedFlow 也属于热流，也有一个可变的版本 MutableSharedFlow，它的构造方法如下：
```kotlin
public fun <T> MutableSharedFlow(
    replay: Int = 0,
    extraBufferCapacity: Int = 0,
    onBufferOverflow: BufferOverflow = BufferOverflow.SUSPEND
)
```

在构造方法中，有 3 个可配置的参数，它们的作用如下：

| 参数 | 作用 |
| - | - |
| replay | 重放数据个数：当有新订阅者被注册时，会重放缓存的 replay 个数据 |
| extraBufferCapacity | 额外缓存容量：replay 之外的额外缓存容量 |
| onBufferOverflow | 缓存溢出策略：缓存满时的处理策略 |

可配置的缓存溢出策略包含以下三种：

| 策略 | 作用 |
| - | - |
| BufferOverflow.SUSPEND | 当缓存区满时，使上游挂起 |
| BufferOverflow.DROP_OLDEST | 丢弃最早加入到缓存区的值，不挂起上游 |
| BufferOverflow.DROP_LATEST | 丢弃最晚加入到缓存区的值，令缓存区的值不变 |

上文所提到的 StateFlow 实际上就是一种特殊的 SharedFlow，相比于普通的 SharedFlow，它具有如下特点：

1. 初始化时必须传入初始值；
2. 容量和重放均为 1，只会保存一个值，且只会向新订阅者重放最新的值；
3. 缓存溢出策略为 DROP_OLDEST，每次发射的新数据都会覆盖旧数据；
4. 支持数据防抖，仅在更新值发生变化时才会回调 collect 等方法；
5. 支持原子性的比较与设置（CAS）操作

# 与 LiveData 的比较
SharedFlow 可被理解为一种高配版的 LiveData，与 LiveData 相比，它具有以下优点：

1. LiveData 的容量固定为 1 个，而 SharedFlow 支持配置 0 到多个；
2. LiveData 固定重放 1 个数据，而 SharedFlow 支持配置 0 到多个；
3. LiveData 无法应对背压问题，而 SharedFlow 有缓存空间，能应对背压问题；
4. LiveData 只能在主线程订阅，而 SharedFlow 能在任意线程订阅。

与 LiveData 相比，SharedFlow 也存在缺点。由于 Flow 不是纯 Android 生态下的组件，它无法处理 Android 开发中的生命周期安全问题，不合理的使用会导致资源浪费、状态错误等问题。