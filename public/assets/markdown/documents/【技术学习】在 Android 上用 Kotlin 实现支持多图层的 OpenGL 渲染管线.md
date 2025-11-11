# 前言

图层的概念存在于很多修图软件中，通过支持多图层和图层的上下移动功能，能实现一些仅在单图层模式下无法实现的效果。本文将通过实现一个 Android 端的 OpenGL ES 渲染管线来介绍多图层渲染的原理与简单的实现方案，丰富图形渲染方面的技术储备。

本文基于一个最简单的 Activity 页面，该页面仅包含一个占满全屏的 GLSurfaceView，且 OpenGL 相关的调用将全部使用 Java / Kotlin 绑定实现，减少切换到 Native 代码带来的心智负担。

# 前期准备

想要自定义 GLSurfaceView 的渲染逻辑，必须创建一个自定义的渲染器，此处将其命名为 `MultiLayerRenderer`，实现 `Renderer` 接口。创建好后就可以在 Activity 中为 GLSurfaceView 设置一些基础属性了：

```Kotlin
binding.surfaceView.setEGLContextClientVersion(2)
binding.surfaceView.setRenderer(renderer)
binding.surfaceView.renderMode = GLSurfaceView.RENDERMODE_WHEN_DIRTY    // 按需渲染模式
```

定义一个图层接口，后续创建的每种图层都需要实现它：

```kotlin
interface ILayer {
    fun onSurfaceCreated()
    fun onSurfaceChanged(width: Int, height: Int)
    fun draw()
    fun release()
    fun setZOrder(zOrder: Int)
    fun getZOrder(): Int
}
```

在这个 Demo 中将会支持三类图层，分别是图片图层、贴纸图层和滤镜图层。其中，图片图层用于放置原图；贴纸图层放置透明背景的图片，层级位于底图上方；滤镜图层通过自定义的着色器代码对其下方的所有图层进行处理，支持移动图层顺序。

Renderer 负责对图层进行管理。通过在各个生命周期方法中按照图层顺序调用每个图层实现类的对应方法，实现按顺序渲染多个图层：

```kotlin
class MultiLayerRenderer(private val context: Context) : GLSurfaceView.Renderer {
    private val layers = CopyOnWriteArrayList<Layer>()
    private var width = 0
    private var height = 0
    
    override fun onSurfaceCreated(gl: GL10, config: EGLConfig) {
        GLES20.glClearColor(0.0f, 0.0f, 0.0f, 1.0f)
        GLES20.glEnable(GLES20.GL_BLEND)
        GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA)
        
        for (layer in layers) {
            layer.onSurfaceCreated()
        }
    }
    
    override fun onSurfaceChanged(gl: GL10, width: Int, height: Int) {
        GLES20.glViewport(0, 0, width, height)
        this.width = width
        this.height = height
        
        for (layer in layers) {
            layer.onSurfaceChanged(width, height)
        }
    }
    
    override fun onDrawFrame(gl: GL10) {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        
        // 按Z轴顺序绘制图层
        val sortedLayers = layers.sortedBy { it.getZOrder() }
        for (layer in sortedLayers) {
            layer.draw()
        }
    }
    
    fun addLayer(layer: Layer) {
        layers.add(layer)
        // 如果渲染器已经初始化，则初始化新添加的图层
        if (width > 0 && height > 0) {
            surfaceView.queueEvent {
                layer.onSurfaceCreated()
                layer.onSurfaceChanged(width, height)
                surfaceView.requestRender()
            }
        }
    }
    
    fun removeLayer(layer: Layer) {
        layer.release()
        layers.remove(layer)
    }
    
    fun moveLayerUp(layer: Layer) {
        val index = layers.indexOf(layer)
        if (index < layers.size - 1) {
            val upperLayer = layers[index + 1]
            val upperZOrder = upperLayer.getZOrder()
            val currentZOrder = layer.getZOrder()
            layer.setZOrder(upperZOrder)
            upperLayer.setZOrder(currentZOrder)
        }
    }
    
    fun moveLayerDown(layer: Layer) {
        val index = layers.indexOf(layer)
        if (index > 0) {
            val lowerLayer = layers[index - 1]
            val lowerZOrder = lowerLayer.getZOrder()
            val currentZOrder = layer.getZOrder()
            layer.setZOrder(lowerZOrder)
            lowerLayer.setZOrder(currentZOrder)
        }
    }
    
    fun clear() {
        for (layer in layers) {
            layer.release()
        }
        layers.clear()
    }
}
```

# 实现图片图层

在创建图片图层的实现类前，先添加两个最基本的着色器，分别是顶点着色器和片段着色器（后面会多次用到它们）。顶点着色器的 GLSL 代码如下：

```opengl
attribute vec4 a_Position;
attribute vec2 a_TexCoord;
varying vec2 v_TexCoord;
uniform mat4 u_MVPMatrix;
void main() {
    gl_Position = u_MVPMatrix * a_Position;
    v_TexCoord = a_TexCoord;
}
```

片段着色器的 GLSL 代码如下：

```opengl
precision mediump float;
varying vec2 v_TexCoord;
uniform sampler2D u_Texture;
void main() {
    gl_FragColor = texture2D(u_Texture, v_TexCoord);
}
```

创建一个实现了 `ILayer` 接口的 `ImageLayer` 类，定义需要用到的变量：

```kotlin
private var textureId: Int = -1            // 图片的纹理ID
private var program: Int = -1              // 着色器程序句柄
private var positionHandle: Int = -1       // 顶点坐标句柄
private var texCoordHandle: Int = -1       // 纹理坐标句柄
private var mvpMatrixHandle: Int = -1      // MVP矩阵句柄
private var textureHandle: Int = -1        // 纹理uniform变量句柄

private var vertexBuffer: FloatBuffer      // 顶点坐标缓冲区
private var texCoordBuffer: FloatBuffer    // 纹理坐标缓冲区
private var zOrder: Int = 0                // 图层顺序（数字大的在上方）
private var bitmap: Bitmap? = null         // 图片Bitmap

// 顶点坐标（NDC坐标系）
private val vertexData = floatArrayOf(
    -1.0f, -1.0f, 0.0f,  // 左下
    1.0f, -1.0f, 0.0f,   // 右下
    -1.0f, 1.0f, 0.0f,   // 左上
    1.0f, 1.0f, 0.0f     // 右上
)

// 纹理坐标（Bitmap风格）
private val texCoordData = floatArrayOf(
    0.0f, 1.0f,  // 左下
    1.0f, 1.0f,  // 右下
    0.0f, 0.0f,  // 左上
    1.0f, 0.0f   // 右上
)

init {
    // 初始化顶点缓冲区
    val bb = ByteBuffer.allocateDirect(vertexData.size * 4)
    bb.order(ByteOrder.nativeOrder())
    vertexBuffer = bb.asFloatBuffer()
    vertexBuffer.put(vertexData)
    vertexBuffer.position(0)

    // 初始化纹理坐标缓冲区
    val tb = ByteBuffer.allocateDirect(texCoordData.size * 4)
    tb.order(ByteOrder.nativeOrder())
    texCoordBuffer = tb.asFloatBuffer()
    texCoordBuffer.put(texCoordData)
    texCoordBuffer.position(0)
}
```

`ImageLayer` 类的 `onSurfaceCreated` 会在 Renderer 同名函数被调用时按照图层顺序回调，在这个方法中需要完成绘制前的准备：编译着色器、创建程序对象并将 Bitmap 加载为 OpenGL 纹理，其代码实现如下：

```kotlin
override fun onSurfaceCreated() {
    // 编译着色器
    val vertexShader = compileShader(TAG, GLES20.GL_VERTEX_SHADER, basicVertexShader)
    val fragmentShader = compileShader(TAG, GLES20.GL_FRAGMENT_SHADER, basicFragmentShader)

    // 创建程序
    program = GLES20.glCreateProgram()
    if (program == 0) {
        Log.e(TAG, "无法创建程序对象")
        return
    }

    // 链接着色器
    GLES20.glAttachShader(program, vertexShader)
    GLES20.glAttachShader(program, fragmentShader)
    GLES20.glLinkProgram(program)

    // 检查链接状态
    val linkStatus = IntArray(1)
    GLES20.glGetProgramiv(program, GLES20.GL_LINK_STATUS, linkStatus, 0)
    if (linkStatus[0] == 0) {
        val log = GLES20.glGetProgramInfoLog(program)
        Log.e(TAG, "程序链接失败: $log")
        GLES20.glDeleteProgram(program)
        return
    }

    // 获取attribute和uniform变量位置
    positionHandle = GLES20.glGetAttribLocation(program, "a_Position")
    if (positionHandle == -1) {
        Log.e(TAG, "无法获取属性a_Position")
        return
    }

    texCoordHandle = GLES20.glGetAttribLocation(program, "a_TexCoord")
    if (texCoordHandle == -1) {
        Log.e(TAG, "无法获取属性a_TexCoord")
        return
    }

    mvpMatrixHandle = GLES20.glGetUniformLocation(program, "u_MVPMatrix")
    if (mvpMatrixHandle == -1) {
        Log.e(TAG, "无法获取uniform变量u_MVPMatrix")
        return
    }

    textureHandle = GLES20.glGetUniformLocation(program, "u_Texture")
    if (textureHandle == -1) {
        Log.e(TAG, "无法获取uniform变量u_Texture")
        return
    }

    // 创建纹理
    val textures = IntArray(1)
    GLES20.glGenTextures(1, textures, 0)
    textureId = textures[0]
    if (textureId == 0) {
        Log.e(TAG, "无法生成纹理ID")
        return
    }

    // 加载图片到纹理
    loadTexture(bitmap, textureId)

    // 清理着色器
    GLES20.glDeleteShader(vertexShader)
    GLES20.glDeleteShader(fragmentShader)
}
```

`draw` 方法会在 `onDrawFrame` 时回调。我们的 GLSurfaceView 使用按需渲染模式，在每次手动调用 `requestRender` 时会触发渲染。在这个方法中需要把坐标设置好，往屏幕上画由两个三角形组成的矩形，再把图片纹理填充到这个矩形上：

```kotlin
override fun draw() {
    if (bitmap == null) {
        return
    }

    GLES20.glUseProgram(program)

    // 设置顶点位置
    vertexBuffer.position(0)
    GLES20.glVertexAttribPointer(positionHandle, 3, GLES20.GL_FLOAT, false, 0, vertexBuffer)
    GLES20.glEnableVertexAttribArray(positionHandle)

    // 设置纹理坐标
    texCoordBuffer.position(0)
    GLES20.glVertexAttribPointer(texCoordHandle, 2, GLES20.GL_FLOAT, false, 0, texCoordBuffer)
    GLES20.glEnableVertexAttribArray(texCoordHandle)

    // 设置MVP矩阵 (单位矩阵)
    val mvpMatrix = FloatArray(16)
    Matrix.setIdentityM(mvpMatrix, 0)
    GLES20.glUniformMatrix4fv(mvpMatrixHandle, 1, false, mvpMatrix, 0)

    // 设置纹理
    GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
    GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, textureId)
    GLES20.glUniform1i(textureHandle, 0)

    // 绘制
    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)

    // 清理
    GLES20.glDisableVertexAttribArray(positionHandle)
    GLES20.glDisableVertexAttribArray(texCoordHandle)
}
```

实现好 `ImageLayer` 类后，回到 Activity 添加一个图片图层：

```kotlin
val imageLayer = ImageLayer(this@MainActivity)
val bitmap = BitmapFactory.decodeResource(resources, R.drawable.img_demo)
imageLayer.setZOrder(0)
imageLayer.setImage(bitmap)
renderer?.addLayer(imageLayer)
```

连接手机运行程序，能看到 Bitmap 图片以铺满全屏的方式展示在屏幕上了。

![](/assets/images/documents/img_opengl_1.png)

# 实现贴纸图层

贴纸图层和图片图层比较类似，主要功能都是把由 Bitmap 转换成的 OpenGL 纹理展示到屏幕上，相比图片图层更复杂的是需要通过 MVP 矩阵支持缩放、移动和旋转操作。因此，需要添加一个 `updateMVPMatrix` 方法，在参数变化时及时刷新 MVP 矩阵：

```kotlin
private fun updateMVPMatrix() {
    // 确保视口和贴纸尺寸有效
    if (viewportWidth == 0 || viewportHeight == 0 || stickerWidth == 0 || stickerHeight == 0) {
        Log.e(TAG, "updateModelMatrix skipped: Invalid dimensions.")
        // 可以选择设置一个默认矩阵或者直接返回，避免后续计算出错
        Matrix.setIdentityM(mvpMatrix, 0)
        return
    }

    // --- 1. 计算模型矩阵 (Model Matrix) ---
    // 将模型坐标系 [-0.5, 0.5] 变换到世界坐标系 (像素坐标)
    // 变换顺序: Scale -> Rotate -> Translate
    // OpenGL 矩阵乘法顺序: M_model = M_translate * M_rotate * M_scale

    val modelMatrix = FloatArray(16)
    Matrix.setIdentityM(modelMatrix, 0)

    // 1a. 平移到目标中心点 (像素坐标)
    // 将模型原点 (0,0) 移动到屏幕像素坐标 (positionX, positionY)
    Matrix.translateM(modelMatrix, 0, positionX, positionY, 0f)

    // 1b. 旋转
    // 围绕当前原点 (即贴纸中心) 旋转
    Matrix.rotateM(modelMatrix, 0, rotation, 0f, 0f, 1f)

    // 1c. 缩放
    // 将原始的 1x1 (-0.5 to 0.5) quad 缩放到最终的像素尺寸
    val finalPixelWidth = stickerWidth * scale
    val finalPixelHeight = stickerHeight * scale
    // 缩放操作应该保持贴纸的宽高比
    Matrix.scaleM(modelMatrix, 0, finalPixelWidth, finalPixelHeight, 1f)

    // --- 2. 计算投影矩阵 (Projection Matrix) ---
    // 将世界坐标系 (像素坐标) 映射到 NDC 坐标 [-1, 1]
    // 使用正交投影，同时处理视口宽高比和 Y 轴反转
    // (屏幕坐标 Y=0 在顶部, OpenGL NDC Y=0 / Y=-1 在底部)

    val projectionMatrix = FloatArray(16)
    Matrix.setIdentityM(projectionMatrix, 0)
    // orthoM(m, mOffset, left, right, bottom, top, near, far)
    // left=0, right=viewportWidth
    // bottom=viewportHeight (对应 NDC -1), top=0 (对应 NDC +1) -> Y轴反转
    Matrix.orthoM(projectionMatrix, 0, 0f, viewportWidth.toFloat(), viewportHeight.toFloat(), 0f, -1f, 1f)


    // --- 3. 计算最终的 MVP 矩阵 ---
    // MVP = Projection * View * Model
    // 假设 View 矩阵是单位矩阵 (View Matrix = Identity)
    // MVP = Projection * Model

    Matrix.multiplyMM(mvpMatrix, 0, projectionMatrix, 0, modelMatrix, 0)
}
```

这个方法调用的时机如下，这样可以确保所有对贴纸图层的变换操作最终都能反映在 MVP 矩阵上：

```kotlin
// 设置图片Bitmap
fun setImage(bmp: Bitmap) {
    bitmap = bmp
    stickerWidth = bmp.width
    stickerHeight = bmp.height
    updateModelMatrix()
}

// 设置贴纸位置（以屏幕像素为单位）
fun setPosition(x: Float, y: Float) {
    positionX = x
    positionY = y
    updateModelMatrix()
}

// 设置贴纸缩放比例
fun setScale(scale: Float) {
    this.scale = scale
    updateModelMatrix()
}

// 设置贴纸旋转角度（以度为单位）
fun setRotation(degrees: Float) {
    this.rotation = degrees
    updateModelMatrix()
}

// Viewport尺寸变化
override fun onSurfaceChanged(width: Int, height: Int) {
    viewportWidth = width
    viewportHeight = height
    updateModelMatrix()
}
```

其他的生命周期方法中，`onSurfaceCreated` 和 `ImageLayer` 的代码一致，同样适用先前定义的基本顶点着色器和片段着色器。在绘制阶段的 `draw` 方法中，则要加上启用混合模式的代码，用于支持透明度：

```kotlin
// 启用混合模式以支持透明度
GLES20.glEnable(GLES20.GL_BLEND)
GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA)
```

编写完 `StickerLayer` 中的代码后，回到 Activity，在图片图层的上方添加一个贴纸图层，并尝试设置它的位置、缩放比例与旋转角度：

```kotlin
// 添加贴纸图层
val stickerLayer = StickerLayer(this@MainActivity)
val stickerBmp = BitmapFactory.decodeResource(resources, R.drawable.img_sticker_demo)
stickerLayer.setZOrder(2)
stickerLayer.setImage(stickerBmp)

// 设置贴纸位置
val width = binding.surfaceView.width
val height = binding.surfaceView.height
stickerLayer.setPosition(width / 2f, height / 2f)

// 设置贴纸缩放
stickerLayer.setScale(0.5f)

// 设置贴纸旋转
stickerLayer.setRotation(90f)

renderer?.addLayer(stickerLayer)
```

运行程序，能看到贴纸图层在屏幕中间显示，且缩放和旋转符合预期。

![](/assets/images/documents/img_opengl_2.png)

# 实现滤镜图层

滤镜图层和前面两类的图层都有所不同：前两类图层都是接收一个 Bitmap 作为输入，再将它直接绘制到屏幕上，而滤镜图层则是要对它以下（`zOrder` 比它小）的图层进行滤镜处理，再把滤镜处理后的结果绘制到屏幕上。为了实现这种需求，需要改造 `MultiLayerRenderer`，使它支持 **FBO（帧缓冲对象，Framebuffer Object）** 的渲染。

## 何为 FBO？

用 Android 自定义 View 的绘制来类比，在 `onDraw` 方法中，系统传递了一个 `Canvas` 对象，对其进行的绘制操作会直接展示到屏幕上。在 OpenGL 中，这个「默认的、直接展示在屏幕上的绘图目标」就叫做 **默认帧缓冲 (Default Framebuffer)。** 默认情况下，不绑定任何 FBO 时，所有的 `glDrawArrays` 等绘制命令都会绘制到这个默认帧缓冲上，最终展示出来。

在自定义 View 中，有些场景会需要将一些图形绘制到一个临时的、内存中的图片上，后续再把这张图片一次性绘制到屏幕上。这可以通过创建一个 `Bitmap`，再用这个 `Bitmap` 创建一个新的 `Canvas` 来实现。这个 `Canvas` 就被称为离屏画布。而 OpenGL 的离屏画布就是 FBO，它允许将渲染目标从默认帧缓冲（屏幕）切换到一个或多个内存中的缓冲区。

## 改造 Renderer 以支持 FBO

自定义 View 的每个离屏画布都对应一个 `Bitmap` 对象，在 OpenGL 中则对应着纹理 ID，先定义好变量和一个清理方法：

```kotlin
// 为MultiLayerRenderer定义一个共享的FBO
private var sharedFboId: Int = -1
private var sharedFboTextureId: Int = -1

/**
 * 删除旧的FBO和纹理
 */
private fun releaseFBO() {
    if (sharedFboId != -1) {
        GLES20.glDeleteFramebuffers(1, intArrayOf(sharedFboId), 0)
        sharedFboId = -1
    }
    if (sharedFboTextureId != -1) {
        GLES20.glDeleteTextures(1, intArrayOf(sharedFboTextureId), 0)
        sharedFboTextureId = -1
    }
}
```

在 Viewport 尺寸变化时，根据当前尺寸创建好 FBO 和对应的纹理，等待后面绘制的时候使用：

```kotlin
/**
 * 在onSurfaceChanged()中调用
 */
private fun createSharedFBO(width: Int, height: Int) {
    releaseFBO()

    // 创建FBO纹理
    val textures = IntArray(1)
    GLES20.glGenTextures(1, textures, 0)
    sharedFboTextureId = textures[0]

    // 绑定并设置纹理参数
    GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, sharedFboTextureId)
    GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
    GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)

    // 分配纹理内存
    GLES20.glTexImage2D(
        GLES20.GL_TEXTURE_2D,
        0,
        GLES20.GL_RGBA,
        width,
        height,
        0,
        GLES20.GL_RGBA,
        GLES20.GL_UNSIGNED_BYTE,
        null
    )

    // 创建FBO
    val fboArray = IntArray(1)
    GLES20.glGenFramebuffers(1, fboArray, 0)
    sharedFboId = fboArray[0]

    // 绑定FBO并附加纹理
    GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, sharedFboId)
    GLES20.glFramebufferTexture2D(
        GLES20.GL_FRAMEBUFFER,
        GLES20.GL_COLOR_ATTACHMENT0,
        GLES20.GL_TEXTURE_2D,
        sharedFboTextureId,
        0
    )

    // 检查FBO完整性
    val status = GLES20.glCheckFramebufferStatus(GLES20.GL_FRAMEBUFFER)
    if (status != GLES20.GL_FRAMEBUFFER_COMPLETE) {
        Log.e(TAG, "FBO创建失败, 状态: $status")
        return
    }

    // 恢复默认帧缓冲
    GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0)
}
```

接下来是最重要的绘制过程，比较复杂，可以参考以下的流程图：

![](/assets/images/documents/img_opengl_3.png)

将以上流程整理成代码如下：

```kotlin
private fun renderLayersWithFBO(sortedLayers: List<ILayer>) {
    // 分析图层，找出所有FilterLayer的索引位置
    val filterLayerIndices = sortedLayers.indices.filter { sortedLayers[it] is FilterLayer }

    // 如果没有滤镜图层，直接按顺序渲染
    if (filterLayerIndices.isEmpty()) {
        // 绑定默认帧缓冲
        GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0)
        GLES20.glViewport(0, 0, width, height)

        // 清除颜色缓冲区
        GLES20.glClearColor(0.0f, 0.0f, 0.0f, 0.0f)
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)

        // 依次渲染每个图层
        for (layer in sortedLayers) {
            layer.draw()
        }
        return
    }

    // 第一个滤镜之前的图层先渲染到FBO
    GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, sharedFboId)
    GLES20.glViewport(0, 0, width, height)
    GLES20.glClearColor(0.0f, 0.0f, 0.0f, 0.0f)
    GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)

    val firstFilterIndex = filterLayerIndices.first()

    // 渲染第一个滤镜前的所有普通图层
    for (i in 0 until firstFilterIndex) {
        sortedLayers[i].draw()
    }

    // 临时保存FBO纹理ID，用于传递给滤镜
    var currentInputTextureId = sharedFboTextureId

    // 处理每个滤镜图层
    for (i in filterLayerIndices) {
        val filterLayer = sortedLayers[i] as FilterLayer

        // 设置输入纹理（上一步渲染的结果）
        filterLayer.setInputTexture(currentInputTextureId)

        // 如果是最后一个滤镜，则渲染到屏幕
        val isLastFilter = i == filterLayerIndices.last()

        if (isLastFilter) {
            // 最后一个滤镜，直接渲染到默认帧缓冲
            GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, 0)
            GLES20.glViewport(0, 0, width, height)
            GLES20.glClearColor(0.0f, 0.0f, 0.0f, 0.0f)
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        } else {
            // 非最后滤镜，渲染到FBO
            GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, filterLayer.getFboId())
            GLES20.glViewport(0, 0, width, height)
            GLES20.glClearColor(0.0f, 0.0f, 0.0f, 0.0f)
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        }

        // 渲染当前滤镜
        filterLayer.draw()

        // 更新输入纹理为当前滤镜的输出
        if (!isLastFilter) {
            currentInputTextureId = filterLayer.getOutputTextureId()
        }

        // 如果两个滤镜之间还有普通图层
        if (!isLastFilter) {
            val nextFilterIndex = filterLayerIndices.find { it > i } ?: sortedLayers.size

            // 如果有普通图层，需要将它们渲染到当前输出上
            if (i + 1 < nextFilterIndex) {
                // 渲染到临时FBO
                GLES20.glBindFramebuffer(GLES20.GL_FRAMEBUFFER, sharedFboId)

                // 先绘制当前滤镜的输出结果
                drawTextureToFBO(currentInputTextureId)

                // 再叠加绘制普通图层
                for (j in i + 1 until nextFilterIndex) {
                    sortedLayers[j].draw()
                }

                // 更新当前输入纹理
                currentInputTextureId = sharedFboTextureId
            }
        }
    }

    // 最后一个滤镜之后的普通图层
    val lastFilterIndex = filterLayerIndices.last()
    if (lastFilterIndex < sortedLayers.size - 1) {
        // 已经绑定到默认帧缓冲，直接渲染剩余图层
        for (i in lastFilterIndex + 1 until sortedLayers.size) {
            sortedLayers[i].draw()
        }
    }
}
```

上面代码中的 `drawTextureToFBO` 方法需要用到单独封装的一个渲染器去根据纹理 ID 把内容渲染到当前绑定的 Framebuffer 上，实现可以参考 `ImageLayer`，此处不赘述。

# 试用多图层功能

回到 Activity，在之前代码的基础上加上一个滤镜图层，设置滤镜图层的 `zOrder` 为 2，运行程序，能看到原图和贴纸一起被应用了滤镜效果：

![](/assets/images/documents/img_opengl_4.png)

更改代码，将贴纸图层的 `zOrder` 设置为 2，滤镜图层的 `zOrder` 设置为 1，运行程序，能看到仅背景图被应用了滤镜效果，贴纸不受影响：

![](/assets/images/documents/img_opengl_5.png)

# 结语

本 Demo 项目的代码已放在 GitHub，项目地址为 https://github.com/AkatsukiRika/MultiLayer ，克隆到本地后直接导入 Android Studio 即可运行。

本文所讲的多图层渲染管线只是一个简单的示例，实际要在修图场景中使用还需要添加更多必要的功能，例如原图的矩阵变换、对比原图、撤销重做等功能，这些就有待后面有空时补充了。