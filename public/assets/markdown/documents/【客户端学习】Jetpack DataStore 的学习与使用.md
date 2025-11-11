# 什么是 DataStore？
Jetpack DataStore 是一种数据存储解决方案，底层使用 Protobuf 来存储键值对或类型化对象。DataStore 使用 Kotlin 协程和 Flow 以异步、一致的事务方式存储数据。

在存储数据量较小、数据结构简单的数据集时，DataStore 比起 SharedPreferences 更加简单且安全性更高。如果需要支持大型或复杂数据集，更适合使用 Room.

# 和 SharedPreferences 的对比
官方推荐使用 DataStore 来代替 SharedPreferences 来存储小型数据。SP 相对于 DataStore，主要存在以下劣势：

1. SP 的 apply() 方法会阻断 UI 线程，易导致 ANR；

2. SP 会将解析错误作为运行时异常抛出。例如，以下代码在编译阶段完全正常，但运行时就会产生 ClassCastException 异常：

```Kotlin
val sp = getSharedPreferences("test", Context.MODE_PRIVATE)
val edit = sp.edit()
edit.putInt("key", 0)
edit.apply()
val value = sp.getString("key", "")
```

# DataStore 的两种实现
DataStore 提供以下两种不同的实现：

1. **Preferences DataStore**：使用键值对存储和访问数据，不需要预定义架构，也不确保类型安全，开发体验非常接近 SharedPreferneces.

2. **Proto DataStore**：需要使用 Protobuf 预先定义架构，但可以确保类型安全。

# Preferences DataStore 的基本使用
首先，为 Android 项目添加如下依赖项：

```toml
# lib.toml
[versions]
datastore = "1.0.0"

[libraries]
datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
```

```kotlin
// app/build.gradle.kts
dependencies {
    implementation(libs.datastore.preferences)
}
```

在 Kotlin 文件顶层使用如下代码调用属性委托，即可在应用的所有其余部分通过该属性访问此 DataStore 单例：

```kotlin
val Context.demoDataStore: DataStore<Preferences> by preferencesDataStore(name = "demo")
```

Preferences DataStore 不使用预定义的架构，必须使用相应类型的函数来为 DataStore 实例中的每个值定义一个 Key。读取该 Key 的数据时，需要使用 DataStore.data 属性，其返回值为 Flow。

```kotlin
val prefKey = intPreferencesKey(key)
val flow = context.demoDataStore.data.map { preferences ->
    preferences[prefKey] ?: 0
}
// 可通过 flow.first() 在协程中获取数值
```

写入数据时，需要使用 DataStore 的 edit() 函数，以事务方式更新 DataStore 中的数据。这是一个挂起函数，需要在协程内运行，接收一个用于更新值的代码块，代码块中的所有代码均被视为单个事务。

```kotlin
viewModelScope.launch {
    val prefKey = intPreferencesKey(key)
    context.demoDataStore.edit {
        it[prefKey] = intValue
    }
}
```

# Proto DataStore 的基本使用
使用 Proto DataStore 时，需要添加的依赖项相比 Preferences DataStore 要复杂一些。

```toml
# libs.toml
[versions]
datastore = "1.0.0"
protobuf = "0.9.4"
protobuf-javalite = "3.24.4"

[libraries]
datastore-proto = { group = "androidx.datastore", name = "datastore", version.ref = "datastore" }
protobuf-javalite = { group = "com.google.protobuf", name = "protobuf-javalite", version.ref = "protobuf-javalite" }

[plugins]
protobuf = { id = "com.google.protobuf", version.ref = "protobuf" }
```

```kotlin
// app/build.gradle.kts
plugins {
    alias(libs.plugins.protobuf)
}

android {
    protobuf {
        protoc {
            artifact = "com.google.protobuf:protoc:${libs.versions.protobuf.javalite.get()}"
        }
        generateProtoTasks {
            all().forEach { task ->
                task.plugins.create("java") {
                    option("lite")
                }
            }
        }
    }
}

dependencies {
    implementation(libs.datastore.proto)
    implementation(libs.protobuf.javalite)
}
```

上面添加的依赖中，除了添加 datastore-proto 依赖之外，还添加了 protobuf-javalite 依赖，用于将 .proto 文件编译成 Java。在 build.gradle 的 android -> protobuf 代码块中添加的代码就是用于在编译时生成 .proto 对应的 Java 文件。

添加好相关依赖后，需要创建 Proto 文件，放置在 app/src/main/proto 路径下。Proto 文件的语法可以参照[官方文档](https://protobuf.dev/programming-guides/proto3/)。

```proto
// proto_data_store.proto
syntax = "proto3";

option java_package = "com.tangping.androidpractice";
option java_multiple_files = true;

message ProtoDataStore {
  map<string, sint32> int_data = 1;
  map<string, sint64> long_data = 2;
  map<string, bool> boolean_data = 3;
  map<string, string> string_data = 4;
  map<string, double> double_data = 5;
  map<string, float> float_data = 6;
}
```

创建好 Proto 文件后，在 Android Studio 中点击 Build -> Rebuild Project。如果前面的 build.gradle 中依赖已经配置正确，默认会在 app/build/generated/source/proto 路径下产生相对应的 Java 文件。

Java 文件生成后需要在项目中创建一个实现了 `Serializer<T>` 的类，其中 T 对应上面生成的 Java 文件中的类型。这个类用于告知 DataStore 如何读取和写入此数据类型。

```kotlin
object ProtoDataStoreSerializer : Serializer<ProtoDataStore> {
    override val defaultValue: ProtoDataStore
        get() = ProtoDataStore.getDefaultInstance()

    override suspend fun readFrom(input: InputStream): ProtoDataStore {
        try {
            return ProtoDataStore.parseFrom(input)
        } catch (exception: InvalidProtocolBufferException) {
            throw CorruptionException("Cannot read proto.", exception)
        }
    }

    override suspend fun writeTo(t: ProtoDataStore, output: OutputStream) {
        t.writeTo(output)
    }
}
```

在 Kotlin 顶层文件中使用与 Preferences DataStore 相同的方式创建 DataStore 实例，即可在应用的任意位置访问到：

```kotlin
val Context.protoDataStore: DataStore<ProtoDataStore> by dataStore(
    fileName = "proto_data_store.pb",
    serializer = ProtoDataStoreSerializer
)
```

读取 Proto DataStore 的数据时，也是通过获取 data 属性，返回值是 Flow 类型，可通过 map 方法获得具体的类属性：

```kotlin
val flow: Flow<Int> = context.protoDataStore.data.map { 
    it.intDataMap.getOrDefault(key, 0) 
}
```

写入数据时，则是使用 updateData() 方法，传入一个代码块，以事务的方式更新数据：

```kotlin
viewModelScope.launch {
    context.protoDataStore.updateData { protoDataStore ->
        protoDataStore.toBuilder()
            .putIntData(key, intValue)
            .build()
    }
}
```

由于 Proto DataStore 是使用预先在 Proto 文件中定义的架构编译成 Java 后，对 Java 对象进行操作，因此所有的操作都是强类型的，相比使用 Preferences DataStore 能够有效地保证类型安全。

# 参考和补充

上文介绍的是在异步、单进程代码中使用 DataStore 的方式，DataStore 本身还支持更多用法，例如在同步代码和多进程代码中使用。想更详细地了解 DataStore 的特性和用法，可参考以下文档：

[Google 官方文档](https://developer.android.com/topic/libraries/architecture/datastore?hl=zh-cn)

[掘金文档：轻松掌握 DataStore](https://juejin.cn/post/7278238875448180794?searchId=202310241024482623358D83956CD75873)