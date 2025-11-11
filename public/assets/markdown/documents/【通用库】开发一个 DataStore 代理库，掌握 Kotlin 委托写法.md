# 前言
之前编写过一篇 DataStore 学习与使用的文章 (https://www.tang-ping.top/documents?id=100011), 讲解了 Preferences DataStore 具体的使用方法和相比于 SharedPreferences 方案的一些优点。其中，当需要写入数据时，必须创建一个协程并以事务方式更新：

```kotlin
viewModelScope.launch {
    val prefKey = intPreferencesKey(key)
    context.demoDataStore.edit {
        it[prefKey] = intValue
    }
}
```

在读取数据时，也需要通过 Preferences Key，且返回值是 Flow 类型的，也需要在协程或挂起函数中读取：

```kotlin
val prefKey = intPreferencesKey(key)
val flow = context.demoDataStore.data.map { preferences ->
    preferences[prefKey] ?: 0
}

// 可通过 flow.first() 在协程中获取数值
```

编写业务逻辑的过程中，重复出现类似的冗余代码会显著降低开发效率。因此，我们可以借助 Kotlin 的委托模式，对 Preferences DataStore 进行封装以简化代码的编写。

# Kotlin 委托模式

委托模式是软件设计模式中的一项基本技巧。在委托模式中，有两个对象参与处理同一个请求，接受请求的对象将请求委托给另一个对象来处理。Kotlin 通过关键字 by 直接支持委托模式，更加优雅，简洁。

Kotlin 中的委托主要包含类委托和属性委托两种模式，这两种模式在下面开发代理库的过程中都会使用到。

# 项目架构

本项目已在 GitHub 开源，代码仓库地址: https://github.com/AkatsukiRika/KotStore

项目架构比较简单，如下图所示，分为一个 Android 应用模块名为 sample 用于演示，一个 Library 模块名为 support 用于实现功能。若需要在其他项目内引用这个库，直接引入 support 模块即可。

![image](/assets/images/documents/img_delegate_1.png)

# 解决 DataStore 同步访问的问题

前言中提到，DataStore 的返回值是 Flow 类型的，必须在协程或者挂起函数中读取。在实际业务中，很多时候需要在同步代码里进行数据持久化。我们希望能将 DataStore 的使用简化成以下方式：

```kotlin
// 定义属性
var demoString by stringStore(key = "demo_string", default = "")

// 获取属性值
binding.stringEditText.setText(SampleStore.demoString)

// 设置属性值
SampleStore.demoString = binding.stringEditText.text.toString()
```

这也是这个代理库最终能达到的效果。下面让我们一步步来实现它。

首先创建一个抽象类 `KotStoreModel`，它的每一个实现类对应一个 DataStore 文件。在抽象类中，写好创建 Preferences DataStore 文件的方法：

```kotlin
abstract class KotStoreModel(
    private val contextProvider: ContextProvider = StaticContextProvider,
    val scope: CoroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
) {
    private val context: Context?
        get() = contextProvider.getApplicationContext()
    
    open val kotStoreName: String = ""
    
    internal val dataStore by lazy {
        check(kotStoreName.isNotEmpty()) {
            "kotStoreName must be set in KotStoreModel"
        }
        check(context != null) {
            "KotStore must be initialized first"
        }
        PreferenceDataStoreFactory.create(
            migrations = listOf(SharedPreferencesMigration(context!!, kotStoreName))
        ) {
            context!!.preferencesDataStoreFile(kotStoreName)
        }
    }
}
```

接着创建一个属性委托的抽象类 `AbstractStore<T>`，实现 `ReadWriteProperty` 接口。抽象类中的范型参数 `T` 在后续实现类中将被 `String`、`Int` 等数据类型替代，用于持久化存储不同类型的数据。

```kotlin
abstract class AbstractStore<T: Any?> : ReadWriteProperty<KotStoreModel, T> {
    abstract val key: String
    abstract val default: T
    abstract val syncSave: Boolean

    /**
     * 子类中实现，通过 key 获取 Preferences Key
     */
    abstract fun getPreferencesKey(): Preferences.Key<T>

    /**
     * 通过 runBlocking 方式，同步获取当前属性值
     */
    override operator fun getValue(thisRef: KotStoreModel, property: KProperty<*>): T {
        val preferencesKey = getPreferencesKey()
        var value = default
        runBlocking {
            thisRef.dataStore.data.first {
                value = it[preferencesKey] ?: default
                true
            }
        }
        return value
    }

    /**
     * 设置属性值时自动保存到 DataStore，支持同步、异步保存，默认异步以提高性能
     */
    override operator fun setValue(thisRef: KotStoreModel, property: KProperty<*>, value: T) {
        saveToStore(thisRef.dataStore, thisRef.scope, getPreferencesKey(), value)
    }

    fun saveToStore(
        dataStore: DataStore<Preferences>,
        scope: CoroutineScope,
        preferencesKey: Preferences.Key<T>,
        value: T
    ) {
        if (syncSave) {
            runBlocking {
                dataStore.edit { mutablePreferences ->
                    mutablePreferences[preferencesKey] = value
                    mutablePreferences[longPreferencesKey(key + "_$UPDATE_TIME_SUFFIX")] = System.currentTimeMillis()
                }
            }
        } else {
            scope.launch {
                dataStore.edit { mutablePreferences ->
                    mutablePreferences[preferencesKey] = value
                    mutablePreferences[longPreferencesKey(key + "_$UPDATE_TIME_SUFFIX")] = System.currentTimeMillis()
                }
            }
        }
    }
}
```

以存储 `String` 类型数据的 `StringStore` 为例，实现类应该这么写：

```kotlin
internal class StringStore(
    override val key: String,
    override val default: String,
    override val syncSave: Boolean
) : AbstractStore<String>() {
    override fun getPreferencesKey(): Preferences.Key<String> {
        return stringPreferencesKey(key)
    }
}
```

把上面的 `StringStore` 再封装一下，为 `default` 和 `syncSave` 参数创建默认值，并创建一个小写字母打头的方法，就完成了本次的任务：

```kotlin
abstract class KotStoreModel(
    private val contextProvider: ContextProvider = StaticContextProvider,
    val scope: CoroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
) {
    /**
     * 封装在上面定义的 KotStoreModel 中，用这个参数作为 syncSave 的默认值
     */
    open val syncSaveAllProperties: Boolean = false
    
    protected fun stringStore(
        key: String,
        default: String = "",
        syncSave: Boolean = syncSaveAllProperties
    ): ReadWriteProperty<KotStoreModel, String> = StringStore(key, default, syncSave)
}
```

在使用时，为每个 Preferences DataStore 文件创建一个 `KotStoreModel` 的单例实现类，再在该类中定义一些属性，就可以通过本节一开始提到的方式读取、写入数据了：

```kotlin
object SampleStore : KotStoreModel() {
    override val kotStoreName: String
        get() = "sample_store"

    var demoString by stringStore(key = "demo_string", default = "")
}
```

# 提供基于 Flow 的封装

上面的写法解决了在同步代码中访问 DataStore 的问题，但也无形中抹掉了 DataStore 本身以 Flow 作为返回值的一些优势，例如可监听变化。能否为每个数据类型再创建一个基于 Flow 的代理方法，让我们可以实现以下操作呢？

```kotlin
/**
 * 创建属性
 */
object SampleFlowStore : KotStoreFlowModel<SampleFlowStore>() {
    override val kotStoreName: String
        get() = "sample_flow_store"
    
    val demoString by stringFlowStore(key = "demo_string", default = "")
}

lifecycleScope.launch(Dispatchers.Main) {
    /**
     * 在协程中监听属性的变化
     */
    SampleFlowStore.demoString.collectLatest {
        binding.stringEditText.setText(it)
    }
    
    /**
     * 设置属性
     */
    lifecycleScope.launch {
        SampleFlowStore.demoString.emit(binding.stringEditText.text.toString())
    }
}
```

要实现上述操作，需要通过代理使上面的 `demoString` 属性支持以下两个功能：

1. 兼容 Kotlin Flow 的一系列操作，例如 `emit`、`collect`、`collectLatest` 等；

2. 调用 `emit` 方法时，将数据存储至 DataStore 中。

下面来逐步尝试实现上述功能。

首先，为 Flow 创建一个委托类 `FlowDelegate`，定义一个 `emit` 方法，用来调用传入给 `FlowDelegate` 的 `onSave` 参数，将数据存储至 DataStore：

```kotlin
/**
 * 范型 TYPE 为数据类型 (如 String, Int)
 */
class FlowDelegate<TYPE> internal constructor(
    data: Flow<TYPE>,
    private val onSave: suspend (TYPE) -> Unit
) : Flow<TYPE> by data {
    suspend fun emit(value: TYPE) {
        onSave(value)
    }

    fun emitIn(scope: CoroutineScope, value: TYPE) {
        scope.launch {
            emit(value)
        }
    }
}
```

接着定义一个委托属性 `FlowStore`，由于 Flow 类型设置属性是用的 emit，这里只需要实现 `getValue` 方法就好了。在 `getValue` 方法中返回一个上面创建的 `FlowDelegate`，并传入写 DataStore 的方法。顺带创建一个 `KotStoreModel` 的子类，提供创建 `FlowStore` 的基础方法：

```kotlin
/**
 * 继承 KotStoreModel，对应一个 Preferences DataStore 文件
 * 范型 STORE 代表子类（实现类）的类型。
 * 实现代码示例：
 * object SampleFlowStore : KotStoreFlowModel<SampleFlowStore>()
 */
abstract class KotStoreFlowModel<STORE> : KotStoreModel() {
    private fun <TYPE> flowStore(
        defaultValue: TYPE,
        key: String,
        preferenceKeyFactory: (String) -> Preferences.Key<TYPE>
    ) = FlowStore<TYPE, STORE>(
        dataStore,
        key,
        defaultValue,
        preferenceKeyFactory
    )
}

/**
 * 范型 TYPE 指数据类型，如 String、Int 等
 */
class FlowStore<TYPE, STORE> internal constructor(
    private val dataStore: DataStore<Preferences>,
    private val key: String,
    private val defaultValue: TYPE,
    preferenceKeyFactory: (String) -> Preferences.Key<TYPE>
) : ReadOnlyProperty<KotStoreFlowModel<STORE>, Flow<TYPE>> {
    private val preferenceKey: Preferences.Key<TYPE> by lazy {
        preferenceKeyFactory(key)
    }

    override fun getValue(thisRef: KotStoreFlowModel<STORE>, property: KProperty<*>): FlowDelegate<TYPE> {
        return FlowDelegate(
            dataStore.data.map { it[preferenceKey] ?: defaultValue}
        ) {
            dataStore.edit { settings ->
                settings[preferenceKey] = it
            }
        }
    }
}
```

DataStore 包内自带一系列创建 PreferencesKey 的方法。在 `KotStoreFlowModel` 中，直接将其传给 `flowStore` 方法就可以创建出拥有不同范型的 `FlowStore` 了：

```kotlin
fun stringFlowStore(key: String, default: String = ""): FlowStore<String, STORE> =
    flowStore(default, key, ::stringPreferencesKey)

fun intFlowStore(key: String, default: Int = 0): FlowStore<Int, STORE> =
    flowStore(default, key, ::intPreferencesKey)
```

如此一来就实现了本节第一个代码块中的用法。

# 结语
本文在最终结果（库的使用方法）上参照了 GitHub 上的开源项目 Kotpref，这个项目对 SharedPreferences 做了代理且功能很丰富，还支持加密等高级特性。本文中创建的代理库 KotStore 仅支持数据读写的基础操作，功能有待完善。

对 Kotlin 委托模式的解释参考了以下资料：

Kotlin 委托 | 菜鸟教程: https://www.runoob.com/kotlin/kotlin-delegated.html

一文彻底搞懂Kotlin中的委托 | 掘金: https://juejin.cn/post/6844904038589267982