# 背景
在相机类 APP 的使用场景中，用户会频繁切换横竖屏。如果每次横竖屏切换都触发系统的 onConfigurationChanged() 回调，Activity / Fragment 中的各类状态将全部丢失，布局也会重新进行，体验很差且容易引发 BUG。

因此，在大部分 Android 相机类 APP（如荣耀手机系统相机）中，Activity 的方向是固定不变的。当设备方向变化时，通过代码控制 View 的位置和旋转角度，确保展示方向与实际方向一致。

# 问题
在实际场景中，手动编写旋转监测和动态修改 ConstraintSet 的代码比较复杂，且需要很强的图形想象能力，往往要在纸上先画好对应的图形变换方式，再逐行改写成代码。代码编写完成后，后续如果有 UI 上的变更，包含大量尺寸相关 Magic Numbers 的代码理解难度很高，非常难以维护。

# 解决方案
Android 中现在最常用的根布局是 ConstraintLayout，它的功能很强大，其中的 ConstraintSet 支持高度的自定义。因此，我继承自 ConstraintLayout 封装了一个 RotatableConstraintLayout，专门供此类场景使用。本文下一部分会直接贴出此自定义 View 的代码，直接复制到项目中即可使用，零第三方依赖。

# 具体实现

## DeviceOrientationMonitor
这个类用于通过传感器监听设备物理方向的变化，添加了对 Android Studio Preview 的兼容，能够正常预览。

```kotlin
class DeviceOrientationMonitor(
    context: Context,
    private val thresholdDegrees: Int = 25,
    private val minDispatchIntervalMs: Long = 250L,
    private val onOrientationChanged: (DeviceOrientation) -> Unit,
) {
    enum class DeviceOrientation {
        PORTRAIT,
        LANDSCAPE_RIGHT,
        PORTRAIT_UPSIDE_DOWN,
        LANDSCAPE_LEFT,
    }

    private val appContext = context.applicationContext

    private var lastOrientation: DeviceOrientation? = null
    private var lastDispatchTimeMs: Long = 0L

    private var listener: OrientationEventListener? = null

    fun start() {
        if (listener == null) {
            // 某些非正常 Context（例如 Android Studio preview 的 layoutlib）可能拿不到 SensorManager；
            // 这里做懒加载 + try/catch，避免直接崩溃。
            listener =
                try {
                    object : OrientationEventListener(appContext, SensorManager.SENSOR_DELAY_UI) {
                        override fun onOrientationChanged(orientation: Int) {
                            if (orientation == ORIENTATION_UNKNOWN) return

                            val mapped =
                                mapToDeviceOrientation(orientation, thresholdDegrees) ?: return
                            if (mapped == lastOrientation) return

                            val now = android.os.SystemClock.uptimeMillis()
                            if (now - lastDispatchTimeMs < minDispatchIntervalMs) return

                            lastDispatchTimeMs = now
                            lastOrientation = mapped
                            onOrientationChanged(mapped)
                        }
                    }
                } catch (_: Throwable) {
                    null
                }
        }

        val l = listener ?: return
        if (l.canDetectOrientation()) l.enable()
    }

    fun stop() {
        listener?.disable()
    }

    private fun mapToDeviceOrientation(
        rawDegrees: Int,
        threshold: Int,
    ): DeviceOrientation? {
        val d = ((rawDegrees % 360) + 360) % 360
        return when {
            isNear(d, 0, threshold) -> DeviceOrientation.PORTRAIT
            isNear(d, 90, threshold) -> DeviceOrientation.LANDSCAPE_RIGHT
            isNear(d, 180, threshold) -> DeviceOrientation.PORTRAIT_UPSIDE_DOWN
            isNear(d, 270, threshold) -> DeviceOrientation.LANDSCAPE_LEFT
            else -> null
        }
    }

    private fun isNear(value: Int, target: Int, threshold: Int): Boolean {
        val diff = abs(value - target)
        val wrappedDiff = 360 - diff
        return minOf(diff, wrappedDiff) <= threshold
    }
}
```

## RotatableConstraintLayout

核心自定义 View，内部完成：

- 通过 OrientationEventListener 监听设备方向
- 横竖屏 ConstraintSet 切换
- 交换宽高、旋转 root，让视觉方向「横向」

使用方法：

- 竖屏布局 xml 的根节点改成该 View
- 在竖屏布局 xml 上配置 `app:landscapeLayout` 指向横屏设计稿 xml（用于 LANDSCAPE_LEFT）
- 可选：配置 `app:landscapeRightLayout` 指向向右旋转时的横屏设计稿 xml（用于 LANDSCAPE_RIGHT，不配则回退到 landscapeLayout）
- **注意：两套 xml 的 View id/type 必须一致，且 root 都是 ConstraintLayout（本类本身也是）**

此 View 也支持更复杂的动态调整方式，具体请参见本文下一节。

```kotlin
class RotatableConstraintLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : ConstraintLayout(context, attrs, defStyleAttr) {

    data class OrientationApplyResult(
        val orientation: DeviceOrientationMonitor.DeviceOrientation,
        val isLandscape: Boolean,
        val rotationDegrees: Float,
    )

    private enum class AppliedMode {
        PORTRAIT,
        LANDSCAPE_LEFT,
        LANDSCAPE_RIGHT,
    }

    private val portraitConstraints = ConstraintSet()
    private val landscapeConstraints = ConstraintSet() // LANDSCAPE_LEFT
    private val landscapeRightConstraints = ConstraintSet() // LANDSCAPE_RIGHT（可选）

    private var landscapeLayoutResId: Int = 0
    private var landscapeRightLayoutResId: Int = 0
    private var rotationDurationMs: Long = 0L
    private var preserveChildVisibility: Boolean = true

    private var appliedMode: AppliedMode? = null
    private var lastAppliedRotation: Float? = null

    private var orientationMonitor: DeviceOrientationMonitor? = null
    private var lifecycleObserver: LifecycleEventObserver? = null

    private var onOrientationApplied: ((OrientationApplyResult) -> Unit)? = null
    private var applySeq: Long = 0L

    init {
        context.withStyledAttributes(attrs, R.styleable.RotatableConstraintLayout) {
            landscapeLayoutResId =
                getResourceId(R.styleable.RotatableConstraintLayout_landscapeLayout, 0)
            landscapeRightLayoutResId =
                getResourceId(R.styleable.RotatableConstraintLayout_landscapeRightLayout, 0)
            preserveChildVisibility =
                getBoolean(R.styleable.RotatableConstraintLayout_preserveChildVisibility, true)
            rotationDurationMs =
                getInt(R.styleable.RotatableConstraintLayout_rotationDurationMs, 0).toLong()
        }
    }

    override fun onFinishInflate() {
        super.onFinishInflate()

        // 竖屏约束直接从当前已 inflate 的 View 树克隆，避免 portraitLayoutRes 自引用问题
        portraitConstraints.clone(this)

        if (landscapeLayoutResId != 0) {
            landscapeConstraints.clone(context, landscapeLayoutResId)
        }
        if (landscapeRightLayoutResId != 0) {
            landscapeRightConstraints.clone(context, landscapeRightLayoutResId)
        }

        // 首次进入给一个稳定状态：竖屏约束 + 0° 旋转
        doOnLayout {
            applyConstraints(AppliedMode.PORTRAIT)
            // 初始化稳定态不需要对外回调，给一个空实现即可
            applyViewportRotation(AppliedMode.PORTRAIT, rotationDegrees = 0f) {}
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()

        // Android Studio Layout Preview（layoutlib）没有 SensorManager，初始化 OrientationEventListener 会直接崩溃。
        // 预览时只需要展示竖屏布局即可，跳过方向监听相关逻辑。
        if (isInEditMode) return

        if (orientationMonitor == null) {
            orientationMonitor =
                DeviceOrientationMonitor(context) { orientation ->
                    applyForOrientation(orientation)
                }
        }

        // 优先跟随 lifecycle（避免 Activity onPause 后还在跑传感器）
        val owner = findLifecycleOwnerFromContext()
        if (owner != null && lifecycleObserver == null) {
            val observer =
                LifecycleEventObserver { _, event ->
                    when (event) {
                        Lifecycle.Event.ON_RESUME -> orientationMonitor?.start()
                        Lifecycle.Event.ON_PAUSE -> orientationMonitor?.stop()
                        Lifecycle.Event.ON_DESTROY -> orientationMonitor?.stop()
                        else -> Unit
                    }
                }
            owner.lifecycle.addObserver(observer)
            lifecycleObserver = observer
        } else if (owner == null) {
            // 没有 lifecycle 的兜底：attach 时开启，detach 时关闭
            orientationMonitor?.start()
        }
    }

    override fun onDetachedFromWindow() {
        if (isInEditMode) {
            super.onDetachedFromWindow()
            return
        }

        orientationMonitor?.stop()

        val owner = findLifecycleOwnerFromContext()
        val observer = lifecycleObserver
        if (owner != null && observer != null) {
            owner.lifecycle.removeObserver(observer)
        }
        lifecycleObserver = null

        super.onDetachedFromWindow()
    }

    fun setRotationDurationMs(durationMs: Long) {
        rotationDurationMs = durationMs
    }

    fun setLandscapeLayout(@LayoutRes layoutResId: Int) {
        landscapeLayoutResId = layoutResId
        if (layoutResId != 0) {
            landscapeConstraints.clone(context, layoutResId)
        }
    }

    fun setLandscapeRightLayout(@LayoutRes layoutResId: Int) {
        landscapeRightLayoutResId = layoutResId
        if (layoutResId != 0) {
            landscapeRightConstraints.clone(context, layoutResId)
        }
    }

    fun setPreserveChildVisibility(enabled: Boolean) {
        preserveChildVisibility = enabled
    }

    /**
     * 方向变化（约束切换 + 视口旋转/动画）完成后回调。
     *
     * 回调触发时机：
     * - 有动画：动画结束后
     * - 无动画：本次 doOnLayout 内完成旋转/位移设置后立即触发
     *
     * 注意：OrientationEventListener 在 start() 后会先派发一次“当前方向”，因此通常会在首次进入时回调一次。
     */
    fun setOnOrientationAppliedListener(listener: ((OrientationApplyResult) -> Unit)?) {
        onOrientationApplied = listener
    }

    private fun applyForOrientation(orientation: DeviceOrientationMonitor.DeviceOrientation) {
        val mode =
            when (orientation) {
                DeviceOrientationMonitor.DeviceOrientation.LANDSCAPE_LEFT -> AppliedMode.LANDSCAPE_LEFT
                DeviceOrientationMonitor.DeviceOrientation.LANDSCAPE_RIGHT -> AppliedMode.LANDSCAPE_RIGHT
                DeviceOrientationMonitor.DeviceOrientation.PORTRAIT,
                DeviceOrientationMonitor.DeviceOrientation.PORTRAIT_UPSIDE_DOWN,
                -> AppliedMode.PORTRAIT
            }

        val rotationDegrees =
            when (orientation) {
                // Activity 固定 portrait，所以内容要“反向旋转”以获得正确视觉方向
                DeviceOrientationMonitor.DeviceOrientation.LANDSCAPE_RIGHT -> -90f
                DeviceOrientationMonitor.DeviceOrientation.LANDSCAPE_LEFT -> 90f
                DeviceOrientationMonitor.DeviceOrientation.PORTRAIT,
                DeviceOrientationMonitor.DeviceOrientation.PORTRAIT_UPSIDE_DOWN,
                -> 0f
            }

        val seq = ++applySeq
        val result =
            OrientationApplyResult(
                orientation = orientation,
                isLandscape = mode != AppliedMode.PORTRAIT,
                rotationDegrees = rotationDegrees,
            )

        if (!applyConstraints(mode)) return
        applyViewportRotation(mode, rotationDegrees) {
            // 防止旧的动画/旧的 doOnLayout 结束回调在新一轮 apply 后误触发
            if (seq != applySeq) return@applyViewportRotation
            onOrientationApplied?.invoke(result)
        }
    }

    private fun applyConstraints(mode: AppliedMode): Boolean {
        if (appliedMode == mode) return true

        val target: ConstraintSet? =
            when (mode) {
                AppliedMode.PORTRAIT -> portraitConstraints
                AppliedMode.LANDSCAPE_LEFT ->
                    if (landscapeLayoutResId != 0) landscapeConstraints else null
                AppliedMode.LANDSCAPE_RIGHT ->
                    when {
                        landscapeRightLayoutResId != 0 -> landscapeRightConstraints
                        landscapeLayoutResId != 0 -> landscapeConstraints // fallback
                        else -> null
                    }
            }

        if (target == null) return false

        val visibilityState =
            if (preserveChildVisibility) captureChildVisibilityState() else null
        target.applyTo(this)
        if (visibilityState != null) restoreChildVisibilityState(visibilityState)
        appliedMode = mode
        return true
    }

    private fun captureChildVisibilityState(): IdentityHashMap<View, Int> {
        // 注意：不能用 id 作为 key。include 场景下，子布局内部控件 id 会重复，导致状态互相覆盖。
        // 这里按 View 实例（identity）保存，才能保证每个 item 的状态独立。
        val state = IdentityHashMap<View, Int>()
        captureChildVisibilityStateInto(this, state)
        return state
    }

    private fun captureChildVisibilityStateInto(view: View, out: IdentityHashMap<View, Int>) {
        out[view] = view.visibility
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                captureChildVisibilityStateInto(view.getChildAt(i), out)
            }
        }
    }

    private fun restoreChildVisibilityState(state: IdentityHashMap<View, Int>) {
        restoreChildVisibilityStateFrom(this, state)
    }

    private fun restoreChildVisibilityStateFrom(view: View, state: IdentityHashMap<View, Int>) {
        val v = state[view]
        if (v != null) {
            view.visibility = v
        }
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                restoreChildVisibilityStateFrom(view.getChildAt(i), state)
            }
        }
    }

    /**
     * 交换宽高 + 旋转 root，使得在固定 portrait 的 Window 中也能展示“横向内容”。
     */
    private fun applyViewportRotation(
        mode: AppliedMode,
        rotationDegrees: Float,
        onApplied: () -> Unit,
    ) {
        // 即使当前状态已经是目标状态，也要确保回调能触发（例如首次进入时传感器上报 portrait，但初始化已是 portrait）。
        if (lastAppliedRotation == rotationDegrees && appliedMode == mode) {
            doOnLayout { onApplied() }
            return
        }
        lastAppliedRotation = rotationDegrees

        val parentView = parent as? View ?: return
        if (parentView.width == 0 || parentView.height == 0) {
            parentView.doOnLayout {
                applyViewportRotation(mode, rotationDegrees, onApplied)
            }
            return
        }

        val lp = layoutParams
        val isLandscape = mode != AppliedMode.PORTRAIT
        if (isLandscape) {
            lp.width = parentView.height
            lp.height = parentView.width
        } else {
            lp.width = ViewGroup.LayoutParams.MATCH_PARENT
            lp.height = ViewGroup.LayoutParams.MATCH_PARENT
        }
        layoutParams = lp

        doOnLayout { v ->
            v.pivotX = v.width / 2f
            v.pivotY = v.height / 2f

            v.translationX = (parentView.width - v.width) / 2f
            v.translationY = (parentView.height - v.height) / 2f

            // 避免上一次动画影响本次 endAction
            v.animate().cancel()
            if (rotationDurationMs > 0L) {
                v.animate()
                    .rotation(rotationDegrees)
                    .setDuration(rotationDurationMs)
                    .withEndAction(onApplied)
                    .start()
            } else {
                v.rotation = rotationDegrees
                onApplied()
            }
        }
    }

    private fun findLifecycleOwnerFromContext(): LifecycleOwner? {
        var ctx: Context? = context
        while (ctx is ContextWrapper) {
            if (ctx is LifecycleOwner) return ctx
            ctx = ctx.baseContext
        }
        return ctx as? LifecycleOwner
    }
}
```

# 动态调整
此自定义 View 保留了在方向调整时手动调整 View 参数的能力，通过 `setOnOrientationAppliedListener` 添加的监听器能在方向变化时收到通知，通过 OrientationApplyResult 的属性即可获取当前的方向：

```kotlin
// 方向切换完成后做“动态调整”（例如重新计算 margin/padding/位置等）
binding.rclRotatableRoot.setOnOrientationAppliedListener {
    binding.llPopupContainer.updateLayoutParams<ViewGroup.MarginLayoutParams> {
        val systemBarsTop = (activity as? ViewBindingActivity)?.systemBarsTop ?: 0
        val margin = systemBarsTop + resources.getDimensionPixelSize(R.dimen.dp_56)
        when (it.orientation) {
            DeviceOrientationMonitor.DeviceOrientation.LANDSCAPE_LEFT -> {
                topMargin = resources.getDimensionPixelSize(R.dimen.dp_16)
                marginStart = margin
                marginEnd = 0
            }
            DeviceOrientationMonitor.DeviceOrientation.LANDSCAPE_RIGHT -> {
                topMargin = resources.getDimensionPixelSize(R.dimen.dp_16)
                marginStart = 0
                marginEnd = margin
            }
            else -> {
                topMargin = margin
                marginStart = resources.getDimensionPixelSize(R.dimen.dp_16)
                marginEnd = resources.getDimensionPixelSize(R.dimen.dp_16)
            }
        }
        LogUtil.d(TAG, "topMargin = $topMargin, marginStart = $marginStart, marginEnd = $marginEnd")
    }
}
```

# 实现原理

1. **约束集切换:** View 内部维护了 3 个 ConstraintSet：portrait（从当前视图树克隆）、landscape（从 landscapeLayout 加载）和 landscapeRight（可选，从 landscapeRightLayout 加载，如果未配置则回退到 landscape）。当监测到方向变化时，先应用对应 ConstraintSet 到当前布局，然后捕获并恢复所有子 View 的可见性状态。捕获时，使用 IdentityHashMap 以 View 实例为 key 以避免 id 冲突（如 include 布局场景）。

2. **宽高交换:** 对于横屏模式，将 LayoutParams 的宽高设置为父视图的高宽（模拟横屏尺寸），portrait 则恢复为 MATCH_PARENT 。

3. **旋转和位移:** 设置 pivot（中心点）为视图宽高的中点，计算 translationX/Y 以居中视图。然后使用 View.animate() 或直接设置 rotation 属性应用旋转角度（有动画时长则动画过渡，无则立即设置），动画结束时触发回调。