# 任务背景

在进行视频导出性能优化的过程中，需要调研客户端 APP 是否能从应用层面设置高性能模式。查询资料得知，APP 侧主要可以做到的方案有以下两种：

1.  Android 动态性能框架 (ADPF) - 推荐 Android 12+
2.  将应用声明为游戏 (Game Manager API)

本文将通过 Demo 应用尝试两种性能优化的方案，并施加 CPU、GPU 两方面的负载，对比这两种方案的实际效果。

# Demo 应用

## 应用简介

实验中用到的 Demo 应用 GitHub 仓库地址如下：

https://github.com/AkatsukiRika/HighPerformanceDemo

该应用使用原生 Android 技术编写，支持以下功能：

- 通过数学运算施加 CPU 负载，支持调节负载强度
- 通过 OpenGL Shader 渲染施加 GPU 负载，支持调节负载等级
- 支持在应用内直接开启/关闭 ADPF
- 实时显示「界面 FPS」、「OpenGL 渲染 FPS」、「平均 CPU 核心频率」、「最大 CPU 核心频率」四种指标

界面样式如下所示：

![image](/assets/images/documents/img_adpf_1.gif)

如图所示，前景是一个用 `Canvas` 绘制小球绕圆心转圈的自定义 View，持续施加 CPU 负载；背景是一个颜色不断变换的 `GLSurfaceView`，持续施加 GPU 负载。

## CPU 负载方案

施加 CPU 负载的核心方法代码如下：

```
// 防止编译器优化的 Volatile 变量
@Volatile private var cpuSink: Double = 0.0

private fun spinCpu(targetDurationNs: Long) {
    val start = System.nanoTime()
    var tempResult = 1.0

    // 忙等待 (Busy Loop)
    while (System.nanoTime() - start < targetDurationNs) {
        // 做一些无意义的数学运算
        tempResult = sin(tempResult) + sqrt(tempResult)
        // 偶尔写入 volatile 防止被完全优化
        if (tempResult > 1000) cpuSink = tempResult
    }
    cpuSink = tempResult
}
```

当这个方法在自定义 View 的 `onDraw()` 方法内运行时，会阻塞 UI 线程，使小球运动的动画发生卡顿。通过调节 `spinCpu` 方法的 `targetDurationNs` 参数值，可以调节负载的大小。应用中的滑块支持调整的范围是 0ms ~ 33ms.

## GPU 负载方案

施加 GPU 负载的核心是一个 OpenGL 片元着色器，代码如下：

```
precision mediump float;
uniform float u_Load;     // 负载等级
uniform float u_Time;     // 时间因子，让画面动起来
uniform vec2 u_Resolution; // 屏幕分辨率

void main() {
    // 归一化坐标
    vec2 uv = gl_FragCoord.xy / u_Resolution.xy;
    
    float val = 0.0;
    
    // --- 暴力计算循环 ---
    // 注意：为了兼容性，通常循环次数要是常数，我们在循环体内用 if break 来控制
    // 这里的 1000.0 是硬上限，你可以根据需要调大
    for(float i = 0.0; i < 1000.0; i++) {
        if (i > u_Load) break; // 根据 Kotlin 传进来的 u_Load 决定何时停止
        
        // 执行复杂的三角函数运算
        val += sin(uv.x * i + u_Time) * cos(uv.y * i + val);
    }
    // -------------------

    // 将计算结果转化为颜色输出
    // 这行代码保证了上面的循环不会被编译器优化掉（Dead Code Elimination）
    vec3 color = vec3(0.5 + 0.5*sin(val), 0.5 + 0.5*cos(val + 1.0), 0.5 + 0.5*sin(val + 2.0));
    gl_FragColor = vec4(color, 1.0);
}
```

这个着色器在独立的后台渲染线程 GLThread 上运行，为 GPU 施加负载。当 `u_Load` 为 0 时，画面只有简单的颜色变化，非常流畅；提高 `u_Load` 的值后，画面会出现迷幻的波纹动画（Shader 计算出的颜色），开始发热、掉帧、卡顿。应用中的滑块支持调整的范围是 0 ~ 2000.

# 优化方式

## 开启 ADPF

Android 动态性能框架（ADPF）是 Google 目前对计算密集型应用（包括但不限于游戏）最推荐的方案，它通过 `PerformanceHintManager` API 允许应用向系统发送提示（Hint），告知系统当前任务的目标耗时。如果实际耗时超过目标，系统会暂时提升 CPU/GPU 频率。它的开关方式如下：

```
private var adpfSession: PerformanceHintManager.Session? = null
private val targetDurationNs = 8_330_000L   // 目标 120Hz 帧时间 (8.33ms)

/**
 * 外部开关：开启或关闭 CPU ADPF
 */
@SuppressLint("WrongConstant")
fun setAdpfEnabled(enabled: Boolean) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return

    if (enabled) {
        // 1. 如果已存在，先不处理(或重建)
        if (adpfSession != null) return

        val manager = context.getSystemService(Context.PERFORMANCE_HINT_SERVICE) as? PerformanceHintManager
        // 2. 关键：传入当前线程 ID (这里是主线程)
        val tids = intArrayOf(android.os.Process.myTid())

        // 3. 创建 Session
        adpfSession = manager?.createHintSession(tids, targetDurationNs)

        if (adpfSession != null) {
            LogUtil.i(TAG, "createHintSession success")
        } else {
            LogUtil.e(TAG, "createHintSession failed")
        }
    } else {
        // 4. 关闭 Session
        adpfSession?.close()
        adpfSession = null
        LogUtil.i(TAG, "closeHintSession success")
    }
}
```

Demo 应用设置了一个比较激进的目标时间，以模拟实际目标——越快越好。需要注意的是，ADPF 是基于 Thread ID 工作的，在多线程的场景下需要创建多个 Session，并为每个 Session 设置目标帧时间。在本例中，我为 CPU 负载（主线程）和 GPU 负载（GL 线程）各创建了一个 Session，目标帧时间均为 8.33ms.

上面的代码启动了 ADPF Session 并设置了目标帧时间，当每一帧渲染或任务结束后，需要向系统报告耗时，系统会根据这个反馈动态调整频率。相关逻辑如下所示：

```
override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)

    // 1. 记录帧开始时间 (纳秒)
    val startTimeNs = System.nanoTime()

    // 省略其他代码

    // 2. 记录帧结束时间并计算耗时
    val endTimeNs = System.nanoTime()
    val durationNs = endTimeNs - startTimeNs
    lastFrameDurationMs = durationNs / 1_000_000

    // 3. ADPF 实际耗时上报
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        adpfSession?.reportActualWorkDuration(durationNs)
        if (adpfSession != null) {
            LogUtil.d(TAG, "reportActualWorkDuration: ${durationNs / 1_000_000f}ms")
        }
    }

    // 4. 请求下一帧 (实现无限循环动画)
    invalidate()
}
```

## 开启游戏模式

游戏模式的开启方式相对简单一些。首先，在项目的 `res/xml/` 目录下创建一个 `game_mode_config.xml` 文件，内容如下所示：

```
<?xml version="1.0" encoding="UTF-8"?>
<game-mode-config
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:supportsBatteryGameMode="true"
    android:supportsPerformanceGameMode="true"
/>
```

然后，在 `AndroidManifest.xml` 中添加如下配置：

![image](/assets/images/documents/img_adpf_2.png)

回到应用，可以通过以下方式检查游戏模式是否开启成功：

```
@SuppressLint("WrongConstant")
private void initGameMode() {
    TextView tvGameMode = findViewById(R.id.tv_game_mode);
    if (tvGameMode == null) {
        return;
    }

    // 检查 Android 版本是否支持游戏模式（需要 Android 12 及以上）
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        GameManager gameManager = (GameManager) getSystemService(Context.GAME_SERVICE);
        if (gameManager != null) {
            int gameMode = gameManager.getGameMode();
            String gameModeText = "当前游戏模式: ";

            switch (gameMode) {
                case GameManager.GAME_MODE_STANDARD:
                    gameModeText += "标准模式 (Standard)";
                    break;
                case GameManager.GAME_MODE_PERFORMANCE:
                    gameModeText += "性能模式 (Performance)";
                    break;
                case GameManager.GAME_MODE_BATTERY:
                    gameModeText += "省电模式 (Battery)";
                    break;
                case GameManager.GAME_MODE_UNSUPPORTED:
                default:
                    gameModeText += "未设置 (Not Set)\n提示: 请在系统设置中手动启用游戏模式";
                    break;
            }

            tvGameMode.setText(gameModeText);
            LogUtil.i(TAG, "Game Mode detected: " + gameMode);
        } else {
            tvGameMode.setText("游戏模式: 设备不支持 GameManager 服务");
            LogUtil.w(TAG, "GameManager service not available");
        }
    } else {
        tvGameMode.setText("游戏模式: 需要 Android 12+ (当前: Android " + Build.VERSION.SDK_INT + ")");
        LogUtil.i(TAG, "Game Mode requires Android 12+, current API: " + Build.VERSION.SDK_INT);
    }
}
```

### 注意事项

1.  手机厂商的「游戏空间」和上述 Android 系统游戏模式是两个不同的系统。厂商游戏空间由厂商自己开发，有自己的识别逻辑，不依赖 `appCategory=”game”`。通过代码只能打开 Android 系统游戏模式，无法打开厂商游戏空间。如果需要打开厂商游戏空间，需要手动添加。
2.  游戏模式默认为「标准模式 (Standard)」，如果需要切换到其他模式，需要在系统设置中手动设置。若在设置中找不到，也可以通过 ADB 命令手动设置：

```
# 查看当前游戏模式
adb shell cmd game mode com.mitakeran.highperformancedemo

# 设置为性能模式
adb shell cmd game mode performance com.mitakeran.highperformancedemo

# 设置为省电模式
adb shell cmd game mode battery com.mitakeran.highperformancedemo

# 设置为标准模式
adb shell cmd game mode standard com.mitakeran.highperformancedemo
```

# 实验过程

## 实验设备

|     |     |
| --- | --- |
| 设备型号 | 荣耀 Magic8 |
| Android 版本 | 16  |
| 处理器 | 骁龙 8Elite Gen5 |
| CPU 核心数 | 8   |
| GPU | Qualcomm Adreno (TM) 840 |
| 内存  | 12 GB |
| 屏幕分辨率 | 2760 × 1256 |
| 屏幕刷新率 | 120 Hz |

## 实验方案

| 编号  | CPU 负载 | GPU 负载 | ADPF | 游戏模式 |
| --- | --- | --- | --- | --- |
| 1   | 50% | 100% | 关   | 关   |
| 2   | 50% | 100% | 开   | 关   |
| 3   | 50% | 100% | 关   | 开   |

这几组实验的负载旨在模拟视频导出的真实负载场景：由 GPU / 视频解码主导，CPU 主要做解码控制、数据调度与少量后处理。每组实验均持续运行 5 分钟，将运行过程中的平均 CPU 核心频率、界面帧率、OpenGL 渲染帧率绘制成折线图，考核指标的绝对值与稳定性。

## 实验结果

![image](/assets/images/documents/img_adpf_3.png)

**_ADPF 关闭/开启状态下平均 CPU 核心频率变化_**

![image](/assets/images/documents/img_adpf_4.png)

**_ADPF 关闭/开启状态下 UI 帧率变化_**

![image](/assets/images/documents/img_adpf_5.png)

**_ADPF 关闭/开启状态下 OpenGL 渲染帧率变化_**

![image](/assets/images/documents/img_adpf_6.png)

**_游戏模式关闭/开启状态下平均 CPU 核心频率变化_**

![image](/assets/images/documents/img_adpf_7.png)

**_游戏模式关闭/开启状态下 UI 帧率变化_**

![image](/assets/images/documents/img_adpf_8.png)

**_游戏模式关闭/开启状态下 OpenGL 渲染帧率变化_**

# 实验结论

## 总结结论

- **游戏模式**：峰值高、但更快触发热限制，频率与 FPS 波动更大，后段性能更差。更适合短时爆发或游戏前期体验，不适合长时间稳定导出。
- **ADPF On**：更倾向“稳定与可控”，能避免后期崩盘，但可能出现更早降频。适合长时间持续负载的稳定输出。
- **关闭优化**：表现更“平稳但不高”，整体稳定但可能牺牲前期性能和效率。对导出任务来说，稳定性尚可，但效率可能不如 ADPF。

## 推荐策略

- **优先推荐 ADPF On**：导出属于长时间、持续负载场景，需要稳定吞吐与温控，ADPF 更符合目标。
- **不推荐游戏模式**：游戏模式下峰值高但衰退快、波动大，这对长时间导出是负面特性。此外，非游戏类软件如果在 `AndroidManifest.xml` 里将自己描述成游戏，很可能遭到应用商店的拒审。就算能通过审核，在运行过程中弹出的游戏对话框也会让用户感到困惑。
- **只有在短时导出/限时任务时才考虑游戏模式**：如果导出时间很短，峰值性能可能带来一定收益，否则反而拖后段。

# 参考内容

[Google 官方文档：利用 Android 动态性能框架优化散热和 CPU 性能](https://developer.android.com/games/optimize/adpf?hl=zh-cn)

[CSDN：利用 ADPF 性能提示优化 Android 应用体验](https://developer.android.com/games/optimize/adpf?hl=zh-cn)