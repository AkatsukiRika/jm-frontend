# 写在前面

本文中所提到的项目已开源在 GitHub 上，仓库位于 https://github.com/AkatsukiRika/OpenPS ，目前已迭代至 1.2.0 版本，支持全图滤镜、美颜及调节效果。

# 前情提要

在[上篇文档](https://www.tang-ping.top/documents?id=100200)中，我们从零开始创建了一个 Android JNI 项目，在 C++ 中引入了 OpenCV、TensorFlow Lite 库，并使用开源模型对图片的皮肤区域进行了分割。在这篇文档中，我们将引入一个开源的渲染引擎，实现图片上屏并支持磨皮、美白两种美颜效果。

# 接入渲染引擎

这部分使用了国人大佬 pixpark 在 GitHub 上开源的 gpupixel 渲染引擎，基于 OpenGL/ES，且带有内置的美颜效果滤镜。代码仓库位于 https://github.com/pixpark/gpupixel 。克隆仓库后，可以先用 Android Studio 打开 `src/android/java` 路径，运行一下官方 Demo 项目。

官方 Demo 是基于摄像头输入的实时处理，而我们正在开发的是图片编辑项目，需要引入 gpupixel 的图片渲染模块并加以定制和修改。Demo 本身就将渲染模块独立了出来，位于 `src/android/java/gpupixel`，先直接将其引入当前 Android 项目：

![image](assets/images/documents/img_pe_6.png)

尝试编译，会发现 C++ 部分编译不过，这是因为 Demo 里的 gpupixel 子项目只包含 Java 代码，C++ 代码在上两层的 `src` 目录下。为了后续在 Android Studio 中开发 C++ 更简便，将其下所有代码文件均拷贝至当前 gpupixel 模块下的 `src/main/cpp` 目录：

![image](assets/images/documents/img_pe_7.png)

其中，`android` 子目录下只需要拷贝 `jni` 这个文件夹。然后重新设置 build.gradle 中的 CMake 项目根目录，重新编译就能编过了：

```Groovy
android {
    externalNativeBuild {
        cmake {
            path file('src/main/cpp/CMakeLists.txt')
            version '3.18.1'
        }
    }
}
```

# 图片上屏

> 这一部分不涉及深层次的渲染知识，只做最基本的分析。

整个渲染引擎基本上是流水线 / 管线（Pipeline）的模式，以摄像头或图片输入为 Source，经过一系列的滤镜处理后输出至 Target，其中滤镜部分可以自由叠加多个。官方的示意图如下：

![image](assets/images/documents/img_pe_8.png)

Source 部分，官方 Android Demo 只示范了摄像头输入的用法，但已经帮我们封装好了三种输入的 Java 类，类名分别是 GPUPixelSourceCamera（摄像头输入）、GPUPixelSourceImage（图片输入）和 GPUPixelSourceRawInput（像素输入）。

创建一个新的 Activity，在界面上添加一个 GPUPixelView，这是一个封装好的 Target，内部通过 GLSurfaceView 实现了上屏逻辑。

```XML
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/dark_bg">
    
    <com.pixpark.gpupixel.GPUPixelView
        android:id="@+id/surface_view"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent" />
    
</androidx.constraintlayout.widget.ConstraintLayout>
```

在 `onCreate` 生命周期中，先初始化 GPUPixel，在进行完[上篇文档](https://www.tang-ping.top/documents?id=100200)中提到的皮肤分割处理后，通过以下代码搭建一个最基本的渲染管线：

```Kotlin
private lateinit var binding: ActivityEditBinding
private var sourceImage: GPUPixelSourceImage? = null

private fun startImageFilter(bitmap: Bitmap) {
    sourceImage = GPUPixelSourceImage(bitmap)
    sourceImage?.addTarget(binding.surfaceView)
    sourceImage?.proceed()
}
```

这段代码首先从 Bitmap 创建了一个 Source，直接为 Source 添加了 GPUPixelView 作为 Target，然后通过调用 `proceed` 函数触发渲染。运行项目，可以看到图片成功被显示到屏幕上。

# 将滤镜加入到渲染管线

自带的美颜/美白滤镜被封装在 BeautyFaceFilter 类中，它继承 GPUPixelFilter 父类，该类同时继承 GPUPixelSource 类、实现 GPUPixelTarget 接口，说明滤镜既可以作为 Source 又可以作为 Target 使用，因此可以在管线中自由连接、叠加组合。

更改上一 Part 的渲染管线代码，使管线从 SourceImage 出发先连接到 BeautyFaceFilter，将滤镜的处理结果再传递给 Target 上屏：

```Kotlin
private fun startImageFilter(bitmap: Bitmap) {
    beautyFaceFilter = BeautyFaceFilter()
    sourceImage = GPUPixelSourceImage(bitmap)
    sourceImage?.addTarget(beautyFaceFilter)
    beautyFaceFilter?.addTarget(binding.surfaceView)
    sourceImage?.proceed()
}
```

添加磨皮、美白效果强度的滑杆，在滑杆数值变化时实时更新滤镜里的值，并触发渲染：

```Kotlin
binding.composeView.setContent {
    EditScreen(callback = object : EditScreenCallback {
        override fun onSetSmoothLevel(level: Float) {
            beautyFaceFilter?.smoothLevel = level
            sourceImage?.proceed()
        }

        override fun onSetWhiteLevel(level: Float) {
            beautyFaceFilter?.whiteLevel = level
            sourceImage?.proceed()
        }
    })
}
```

这样就能实现效果的上屏和实时强度调节了。

# 应用皮肤掩膜

多次调节美白效果的滑杆，明显能观察出整个图片的色调都在变化，而不仅是皮肤区域。在这一部分，我们要对滤镜进行一点简单的定制化开发，利用模型输出的皮肤掩膜，使美白效果仅在皮肤区域生效。

美颜滤镜对应的 C++ 文件是 `beauty_face_filter.cc`，查看其 init() 函数代码，能发现它本身也是由多个滤镜叠加而成的。其中通过传入参数实现美白、磨皮效果的是 BeautyFaceUnitFilter 这个滤镜。

```C++
bool BeautyFaceFilter::init() {
  if (!FilterGroup::init()) {
    return false;
  }

  boxBlurFilter = BoxBlurFilter::create();
  addFilter(boxBlurFilter);

  boxHighPassFilter = BoxHighPassFilter::create();
  addFilter(boxHighPassFilter);

  beautyFilter = BeautyFaceUnitFilter::create();
  addFilter(beautyFilter);

  boxBlurFilter->addTarget(beautyFilter, 1);
  boxHighPassFilter->addTarget(beautyFilter, 2);

  setTerminalFilter(beautyFilter);

  boxBlurFilter->setTexelSpacingMultiplier(4);
  setRadius(4);

  registerProperty("whiteness", 0, "The whiteness of filter with range between -1 and 1.", [this](float& val) {
      setWhite(val);
  });

  registerProperty("skin_smoothing", 0, "The smoothing of filter with range between -1 and 1.", [this](float& val) {
      setBlurAlpha(val);
  });
  return true;
}
```

BeautyFaceUnitFilter 滤镜接收纹理输入，经过 OpenGL Shader 渲染后输出处理过的颜色。这个 Shader 的顶点着色器代码如下：

```OpenGL
attribute vec3 position; attribute vec2 inputTextureCoordinate;

varying vec2 textureCoordinate;
varying vec4 textureShift_1;
varying vec4 textureShift_2;
varying vec4 textureShift_3;
varying vec4 textureShift_4;

uniform float widthOffset;
uniform float heightOffset;
void main(void) {
  gl_Position = vec4(position, 1.0);
  textureCoordinate = inputTextureCoordinate;
  textureShift_1 = vec4(inputTextureCoordinate + vec2(-widthOffset, 0.0),
                        inputTextureCoordinate + vec2(widthOffset, 0.0));
  textureShift_2 = vec4(inputTextureCoordinate + vec2(0.0, -heightOffset),
                        inputTextureCoordinate + vec2(0.0, heightOffset));
  textureShift_3 =
      vec4(inputTextureCoordinate + vec2(widthOffset, heightOffset),
           inputTextureCoordinate + vec2(-widthOffset, -heightOffset));
  textureShift_4 =
      vec4(inputTextureCoordinate + vec2(-widthOffset, heightOffset),
           inputTextureCoordinate + vec2(widthOffset, -heightOffset));
}
```

片段着色器代码如下：

```OpenGL
precision highp float; 
varying highp vec2 textureCoordinate;
varying highp vec4 textureShift_1;
varying highp vec4 textureShift_2;
varying highp vec4 textureShift_3;
varying highp vec4 textureShift_4;

uniform sampler2D inputImageTexture;
uniform sampler2D inputImageTexture2;
uniform sampler2D inputImageTexture3;
uniform sampler2D lookUpGray;
uniform sampler2D lookUpOrigin;
uniform sampler2D lookUpSkin;
uniform sampler2D lookUpCustom;

uniform highp float sharpen;
uniform highp float blurAlpha;
uniform highp float whiten;

const float levelRangeInv = 1.02657;
const float levelBlack = 0.0258820;
const float alpha = 0.7;

void main() {
  vec4 iColor = texture2D(inputImageTexture, textureCoordinate);
  vec4 meanColor = texture2D(inputImageTexture2, textureCoordinate);
  vec4 varColor = texture2D(inputImageTexture3, textureCoordinate);

  vec3 color = iColor.rgb;
  if (blurAlpha > 0.0) {
    float theta = 0.1;
    float p =
        clamp((min(iColor.r, meanColor.r - 0.1) - 0.2) * 4.0, 0.0, 1.0);
    float meanVar = (varColor.r + varColor.g + varColor.b) / 3.0;
    float kMin;
    highp vec3 resultColor;
    kMin = (1.0 - meanVar / (meanVar + theta)) * p * blurAlpha;
    kMin = clamp(kMin, 0.0, 1.0);
    resultColor = mix(iColor.rgb, meanColor.rgb, kMin);

    vec3 sum = 0.25 * iColor.rgb;
    sum += 0.125 * texture2D(inputImageTexture, textureShift_1.xy).rgb;
    sum += 0.125 * texture2D(inputImageTexture, textureShift_1.zw).rgb;
    sum += 0.125 * texture2D(inputImageTexture, textureShift_2.xy).rgb;
    sum += 0.125 * texture2D(inputImageTexture, textureShift_2.zw).rgb;
    sum += 0.0625 * texture2D(inputImageTexture, textureShift_3.xy).rgb;
    sum += 0.0625 * texture2D(inputImageTexture, textureShift_3.zw).rgb;
    sum += 0.0625 * texture2D(inputImageTexture, textureShift_4.xy).rgb;
    sum += 0.0625 * texture2D(inputImageTexture, textureShift_4.zw).rgb;

    vec3 hPass = iColor.rgb - sum;
    color = resultColor + sharpen * hPass * 2.0;
  }

  if (whiten > 0.0) {
    vec3 colorEPM = color;
    color =
        clamp((colorEPM - vec3(levelBlack)) * levelRangeInv, 0.0, 1.0);
    vec3 texel = vec3(texture2D(lookUpGray, vec2(color.r, 0.5)).r,
                      texture2D(lookUpGray, vec2(color.g, 0.5)).g,
                      texture2D(lookUpGray, vec2(color.b, 0.5)).b);
    texel = mix(color, texel, 0.5);
    texel = mix(colorEPM, texel, alpha);

    texel = clamp(texel, 0., 1.);
    float blueColor = texel.b * 15.0;
    vec2 quad1;
    quad1.y = floor(floor(blueColor) * 0.25);
    quad1.x = floor(blueColor) - (quad1.y * 4.0);
    vec2 quad2;
    quad2.y = floor(ceil(blueColor) * 0.25);
    quad2.x = ceil(blueColor) - (quad2.y * 4.0);
    vec2 texPos2 = texel.rg * 0.234375 + 0.0078125;
    vec2 texPos1 = quad1 * 0.25 + texPos2;
    texPos2 = quad2 * 0.25 + texPos2;
    vec3 newColor1Origin = texture2D(lookUpOrigin, texPos1).rgb;
    vec3 newColor2Origin = texture2D(lookUpOrigin, texPos2).rgb;
    vec3 colorOrigin =
        mix(newColor1Origin, newColor2Origin, fract(blueColor));
    texel = mix(colorOrigin, color, alpha);

    texel = clamp(texel, 0., 1.);
    blueColor = texel.b * 15.0;
    quad1.y = floor(floor(blueColor) * 0.25);
    quad1.x = floor(blueColor) - (quad1.y * 4.0);
    quad2.y = floor(ceil(blueColor) * 0.25);
    quad2.x = ceil(blueColor) - (quad2.y * 4.0);
    texPos2 = texel.rg * 0.234375 + 0.0078125;
    texPos1 = quad1 * 0.25 + texPos2;
    texPos2 = quad2 * 0.25 + texPos2;
    vec3 newColor1 = texture2D(lookUpSkin, texPos1).rgb;
    vec3 newColor2 = texture2D(lookUpSkin, texPos2).rgb;
    color = mix(newColor1.rgb, newColor2.rgb, fract(blueColor));
    color = clamp(color, 0., 1.);

    highp float blueColor_custom = color.b * 63.0;
    highp vec2 quad1_custom;
    quad1_custom.y = floor(floor(blueColor_custom) / 8.0);
    quad1_custom.x = floor(blueColor_custom) - (quad1_custom.y * 8.0);
    highp vec2 quad2_custom;
    quad2_custom.y = floor(ceil(blueColor_custom) / 8.0);
    quad2_custom.x = ceil(blueColor_custom) - (quad2_custom.y * 8.0);
    highp vec2 texPos1_custom;
    texPos1_custom.x = (quad1_custom.x * 1.0 / 8.0) + 0.5 / 512.0 +
                       ((1.0 / 8.0 - 1.0 / 512.0) * color.r);
    texPos1_custom.y = (quad1_custom.y * 1.0 / 8.0) + 0.5 / 512.0 +
                       ((1.0 / 8.0 - 1.0 / 512.0) * color.g);
    highp vec2 texPos2_custom;
    texPos2_custom.x = (quad2_custom.x * 1.0 / 8.0) + 0.5 / 512.0 +
                       ((1.0 / 8.0 - 1.0 / 512.0) * color.r);
    texPos2_custom.y = (quad2_custom.y * 1.0 / 8.0) + 0.5 / 512.0 +
                       ((1.0 / 8.0 - 1.0 / 512.0) * color.g);
    newColor1 = texture2D(lookUpCustom, texPos1_custom).rgb;
    newColor2 = texture2D(lookUpCustom, texPos2_custom).rgb;
    vec3 color_custom =
        mix(newColor1, newColor2, fract(blueColor_custom));
    color = mix(color, color_custom, whiten);
  }

  gl_FragColor = vec4(color, 1.0);
}
```

这里可以无需关注具体的实现，只关注片段着色器代码的开头以 uniform 开头的变量定义。这部分共有 7 个 sampler2D 类型和 3 个 float 类型的变量。sampler2D 类型代表的是纹理，float 变量则是效果的强度，都是要从 C++ 代码传递过来的参数。

首先要做的是添加一个皮肤掩膜的纹理参数：

```OpenGL
uniform sampler2D inputImageTexture;
uniform sampler2D inputImageTexture2;
uniform sampler2D inputImageTexture3;
uniform sampler2D lookUpGray;
uniform sampler2D lookUpOrigin;
uniform sampler2D lookUpSkin;
uniform sampler2D lookUpCustom;
uniform sampler2D skinMask;
```

然后在 main 函数中，对于每个片段获取皮肤掩膜在该片段上的颜色（可以将其简单理解为像素）：

```OpenGL
void main() {
  vec4 iColor = texture2D(inputImageTexture, textureCoordinate);
  vec4 meanColor = texture2D(inputImageTexture2, textureCoordinate);
  vec4 varColor = texture2D(inputImageTexture3, textureCoordinate);
  vec4 skinMaskColor = texture2D(skinMask, textureCoordinate);
  
  // ......
}
```

跳过中间的处理过程，在 main 函数的末尾，将原图的颜色与处理后的颜色以皮肤掩膜的颜色为比例进行混合。由于皮肤掩膜只有 0 和 1 两种颜色，在皮肤区域值为 1，其他区域值为 0，这段代码只在皮肤区域输出处理过的颜色，其他区域输出原图的颜色。

```OpenGL
void main() {
  // ......
  
  color = mix(iColor.rgb, color, skinMaskColor.r);
  gl_FragColor = vec4(color, 1.0);
}
```

在 C++ 代码中，按照与其他纹理参数相同的方式，从图片文件获取纹理，传递给 OpenGL 渲染：

```C++
// 头文件里定义变量
std::shared_ptr<SourceImage> skinMaskImage_;

// init 函数中用图片文件名初始化
skinMaskImage_ = SourceImage::create(Util::getResourcePath("skin_mask.png"));

// proceed 函数中传入 OpenGL
glActiveTexture(GL_TEXTURE8);
glBindTexture(GL_TEXTURE_2D, skinMaskImage_->getFramebuffer()->getTexture());
_filterProgram->setUniformValue("skinMask", 8);
```

之后需要调整上层代码，将皮肤掩膜保存为 PNG 格式的图片即可。

要注意的是皮肤掩膜图片需以四通道形式存储，以三通道形式存储会有内存对齐问题，导致 SIGBUS 错误的发生。具体可以参考这篇博文: https://blog.csdn.net/zsJum/article/details/19351827

# 结语

写到这里，这个简易修图 APP 的基本功能（磨皮、美白）就已经开发完成了。通过开发这个 APP，我们在项目实践过程中学习了 JNI C++ 的用法、简单的 CMake 写法和第三方 C++ 库引入方法，还连带着学习了机器学习模型和渲染引擎的扫盲型基本常识。

C++、图像处理和渲染相关的知识广度和深度都非常大，这里也介绍一些可以用于慢慢深入这个世界的教程以供参考：

- [LearnOpenGL CN](https://learnopengl-cn.github.io/)：中文版的 OpenGL 入门教程
    
- [OpenCV 中文官方文档](https://woshicver.com/)：学习经典的计算机视觉库
    
- C++ Primer Plus：书籍，非常有名的 C++ 教程