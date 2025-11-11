# 什么是 Hilt？
Hilt 是一个功能强大、用法简单的依赖注入框架，于 2020 年加入到 Jetpack 家族中。它是 Android 团队联系了 Dagger2 团队，一起开发出来的一个专门面向 Android 的依赖注入框架。相比于 Dagger2，Hilt 最明显的特征就是简单，并且提供了 Android 专属的 API。
# 在项目中引入 Hilt
> 此部分以使用了 Java 17 的 Jetpack Compose 新项目为例，开发工具使用 Android Studio 2023.1.1 Canary 版本。信息截止 2023 年 5 月。

第一步，打开 gradle/libs.versions.toml 文件，加入 Hilt 的 Gradle 插件相关配置：
```toml
[versions]
hilt = "2.46.1"

[plugins]
hiltAndroid = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```
再打开项目的 build.gradle.kts 文件，引入插件：
```kotlin
plugins {
    alias(libs.plugins.hiltAndroid) apply false
}
```
第二步，在 libs.versions.toml 中加入 Hilt 的插件和依赖库：
```toml
[libraries]
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
```
由于 Hilt 基于编译时注解实现，需要添加 kotlin-kapt 插件。在 app 的 build.gradle.kts 文件中再加入如下配置：
```kotlin
plugins {
    kotlin("kapt")
}

android {
    compileOptions {
        // 这里设置为 Java 8 或以上即可
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
}
```
现在，Hilt 已被成功引入到项目中。
# Hilt 的基本用法
## 准备工作
使用 Hilt 时，必须自定义一个 Application 类，否则 Hilt 将无法正常工作。自定义的 Application 类中可以不写任何代码，但必须要加上 @HiltAndroidApp 注解。
```kotlin
@HiltAndroidApp
class MyApplication : Application() {
}
```
接下来将 MyApplication 注册到 AndroidManifest.xml 中：
```xml
<application
    android:name=".MainApplication">
</application>
```
准备工作到此已完成，接下来的任务是根据具体的业务逻辑使用 Hilt 进行依赖注入。
## 入口点
Hilt 简化了 Dagger2 的操作，使我们无需使用 @Component 注解编写桥接层逻辑，同时也限制了注入功能只能从几个 Android 固定的入口点开始：Application、Activity、Fragment、View、Service、BroadcastReceiver。
其中，只有 Application 入口点使用 @HiltAndroidApp 注解声明，其他所有入口点均使用 @AndroidEntryPoint 注解声明。例如，若希望在 Activity 中进行依赖注入，只需这样声明：
```kotlin
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {        
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}
```
## 不带参数的依赖注入
尝试定义一个类，在其构造函数上声明 @Inject 注解，如下：
```kotlin
class MusicPlayer() @Inject constructor() {
    fun init() {
        Log.d("MusicPlayer", "init")
    }
}
```
在 Activity 中注入，即可成功调用上面编写的 init() 方法：
```kotlin
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject
    lateinit var musicPlayer: MusicPlayer

    override fun onCreate(savedInstanceState: Bundle?) {        
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        musicPlayer.init()
    }
}
```
## 带参数的依赖注入
在上面的 MusicPlayer 类构造函数中加入一个 AudioDriver 参数，代表播放器组件依赖的系统音频驱动，如下所示：
```kotlin
class MusicPlayer() @Inject constructor(val audioDriver: AudioDriver) {
    fun init() {
        Log.d("MusicPlayer", "init, audioDriver=$audioDriver")
    }
}
```
声明 AudioDriver 类时，也为其构造函数加上 @Inject 注解：
```kotlin
class AudioDriver @Inject constructor() {}
```
不需要再修改任何代码，即可成功调用 init() 方法，并成功打印 audioDriver 的 hashCode。
## 接口的依赖注入
定义一个 IDecoder 接口，代表播放音频时必备的音频解码器。接口中有两个待实现方法，分别用于创建解码器和销毁解码器、释放内存：
```kotlin
interface IDecoder {
    fun create()
    fun destroy()
}
```
实现用于解码 WAV 文件的 WavDecoder，在构造函数中加上 @Inject 注解：
```kotlin
class WavDecoder @Inject constructor() : IDecoder {
    override fun create() {
        Log.d("WavDecoder", "create")
    }
    
    override fun destroy() {
        Log.d("WavDecoder", "destroy")
    }
}
```
此外，再实现用于解码 MP3 文件的 Mp3Decoder，同样需要声明 @Inject 注解：
```kotlin
class Mp3Decoder @Inject constructor() : IDecoder {
    override fun create() {
        Log.d("Mp3Decoder", "create")
    }
    
    override fun destroy() {
        Log.d("Mp3Decoder", "destroy")
    }
}
```
新建一个抽象类，命名为 DecoderModule，在这个模块中通过定义抽象函数提供 IDecoder 接口所需要的实例：
```kotlin
@Module
@InstallIn(ActivityComponent::class)
abstract class DecoderModule {
    @Binds
    abstract fun bindDecoder(wavDecoder: WavDecoder): IDecoder
}
```
修改 MusicPlayer 类中的代码，调用刚刚提供的解码器：
```kotlin
class MusicPlayer() @Inject constructor(val audioDriver: AudioDriver) {
    @Inject
    lateinit var decoder: IDecoder

    fun init() {
        decoder.create()
        Log.d("MusicPlayer", "init, audioDriver=$audioDriver")
        decoder.destroy()
    }
}
```
此时再调用 init() 方法，即可看到 TAG 为 WavDecoder 的日志。
## 给相同类型注入不同实例
@Qualifer 接口用于给相同类型的类或接口注入不同的实例。分别定义两个注解，如下：
```kotlin
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class BindWavDecoder

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class BindMp3Decoder
```
回到 DecoderModule 中，定义两个抽象函数，将刚才定义的两个注解分别添加到两个函数上方：
```kotlin
@Module
@InstallIn(ActivityComponent::class)
abstract class DecoderModule {
    @BindWavDecoder
    @Binds
    abstract fun bindWavDecoder(wavDecoder: WavDecoder): IDecoder
    
    @BindMp3Decoder
    @Binds
    abstract fun bindMp3Decoder(mp3Decoder: WavDecoder): IDecoder
}
```
回到 MusicPlayer 类，此时就可以让这个播放器同时支持两种格式的解码：
```kotlin
class MusicPlayer() @Inject constructor(val audioDriver: AudioDriver) {
    @BindWavDecoder
    @Inject
    lateinit var wavDecoder: IDecoder
    
    @BindMp3Decoder
    @Inject
    lateinit var mp3Decoder: IDecoder

    fun init() {
        wavDecoder.create()
        mp3Decoder.create()
        Log.d("MusicPlayer", "init, audioDriver=$audioDriver")
        wavDecoder.destroy()
        mp3Decoder.destroy()
    }
}
```
## 第三方类的依赖注入
假如我们想在 MainActivity 中注入 OkHttpClient，该类由 OkHttp 提供，我们无法为其构造函数加上 @Inject 注解。这种情况下，需要借助 @Module 注解定义一个非抽象类，此处命名为 NetworkModule。
在该类中定义一个方法，加上 @Provides 注解，在函数体中提供一个 OkHttpClient 的实例，如下：
```kotlin
@Module
@InstallIn(ActivityComponent::class)
class NetworkModule {
    @Provides
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
                    .connectTimeout(20, TimeUnit.SECONDS)
                    .readTimeout(20, TimeUnit.SECONDS)
                    .writeTimeout(20, TimeUnit.SECONDS)
                    .build()
    }
}
```
回到 MainActivity，使用 @Inject 注入 OkHttpClient，即可成功运行：
```kotlin
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject
    lateinit var okHttpClient: OkHttpClient
}
```
为了方便开发者使用，我们在 NetworkModule 再给 Retrofit 类型提供实例，编写如下代码：
```kotlin
@Module
@InstallIn(ActivityComponent::class)
class NetworkModule {
    @Provides
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
                            .addConverterFactory(GsonConverterFactory.create())
                            .baseUrl("http://example.com/")
                            .client(okHttpClient)
                            .build()
        }
}
```
方法 provideRetrofit() 中的 okHttpClient 参数则会由 Hilt 自动使用 provideOkHttpClient() 方法进行创建。此时在 MainActivity 中再次尝试注入 Retrofit，也可以正常运行：
```kotlin
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject
    lateinit var retrofit: Retrofit
}
```
## Hilt 内置组件
使用 @Module 注入的类，需要使用 @InstallIn 注解指定注入的范围。Hilt 一共提供了 7 种组件类型，分别用于注入到不同的场景：

| 组件名 | 注入范围 |
| ------------ | ------------ |
| ApplicationComponent  | Application |
| ActivityRetainedComponent  | ViewModel  |
| ActivityComponent | Activity |
| FragmentComponent  | Fragment  |
| ViewComponent  | View  |
| ViewWithFragmentComponent  | 使用 @WithFragmentBindings 定义的 View  |
| ServiceComponent  | Service  |

若希望上方定义的 NetworkModule 可以在全项目中使用，只需这样修改：
```kotlin
@Module
@InstallIn(ApplicationComponent::class)
class NetworkModule {
}
```
## Hilt 组件作用域
Hilt 默认会为每次的依赖注入行为都创建不同的实例。对应前面的 7 个内置组件，Hilt 也提供了 7 种组件作用域注解，如下所示：

| 组件作用域 | 对应内置组件 |
| ------------ | ------------ |
| @Singleton  | ApplicationComponent |
| @ActivityRetainedScope  | ActivityRetainedComponent  |
| @ActivityScoped | ActivityComponent |
| @FragmentScoped  | FragmentComponent  |
| @ViewScoped  | ViewComponent  |
| @ViewScoped | ViewWithFragmentComponent  |
| @ServiceScoped  | ServiceComponent  |

若希望 NetworkModule 中提供的 Retrofit 和 OkHttpClient 实例在全局只创建一份，只需加上 @Singleton 注解：
```kotlin
@Module
@InstallIn(ActivityComponent::class)
class NetworkModule {
    @Singleton
    @Provides
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
                    .connectTimeout(20, TimeUnit.SECONDS)
                    .readTimeout(20, TimeUnit.SECONDS)
                    .writeTimeout(20, TimeUnit.SECONDS)
                    .build()
    }

    @Singleton
    @Provides
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
                            .addConverterFactory(GsonConverterFactory.create())
                            .baseUrl("http://example.com/")
                            .client(okHttpClient)
                            .build()
        }
}
```
作用域注解也可以被直接声明到任何可注入类的上方，例如前面添加的 AudioDriver 类：
```kotlin
@Singleton
class AudioDriver @Inject constructor() {
}
```
这就表示 AudioDriver 在全局范围内都会共享同一个实例，且全局都可以对 AudioDriver 类进行依赖注入。
![image](/assets/images/documents/img_hilt_1.png)

如上图所示，对某个类声明了某种作用域注解后，该注解的箭头所能指到的地方，都可以对该类进行依赖注入，同时在该范围内共享同一个实例。

## 预置 Qualifier
若前面定义的 AudioDriver 类需要一个 Context 参数，需要在该参数前加上一个 @ApplicationContext 注解，Hilt 会提供一个 Application 类型的 Context 给到 AudioDriver 类当中，代码即可编译通过：
```kotlin
@Singleton
class AudioDriver @Inject constructor(@ApplicationContext val context: Context) {
}
```
如果需要 Activity 或其他类型的 Context，使用 Hilt 预置的另外一种 Qualifier 即可：
```kotlin
@Singleton
class AudioDriver @Inject constructor(@ActivityContext val context: Context) {
}
```
此时编译代码会报错，因为 AudioDriver 类是 Singleton 的，与 Qualifier 的范围不匹配。
对于 Activity 和 Application 这两个类型，Hilt 为它们预置好了注入功能。如果某个类依赖于 Activity 或 Application，不需要添加任何注解，Hilt 可以自动识别，如下：
```kotlin
class AudioDriver @Inject constructor(val application: Application) {
}

class AudioDriver @Inject constructor(val activity: Activity) {
}
```
注意必须是 Application 和 Activity 这两个类型，即使声明它们的子类型，编译都无法通过。
## HiltViewModel 的使用
先在 libs.versions.toml 中声明相关依赖，如下：
```toml
[versions]
hilt-lifecycle-viewmodel = "1.0.0-alpha03"

[libraries]
androidx-hilt-compiler = { group = "androidx.hilt", name = "hilt-compiler", version.ref = "hilt-lifecycle-viewmodel" }
```
在 build.gradle.kts 中添加依赖：
```kotlin
dependencies {
    kapt(libs.androidx.hilt.compiler)
}
```
通过 @HiltViewModel 注解提供一个 ViewModel：
```kotlin
@HiltViewModel
class MainViewModel @Inject constructor() : ViewModel() {
}
```
然后，带有 @AndroidEntryPoint 注解的 Activity 或 Fragment 即可使用 ViewModelProvider 或 by viewModels() 扩展照常获取 ViewModel 实例：
```kotlin
class MainActivity : AppCompatActivity() {
    private val mainViewModel: MainViewModel by viewModels()
}
```