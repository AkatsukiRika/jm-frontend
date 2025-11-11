# OpenPS (Open Photo Studio)

> 开源的 Android 端图片处理程序，使用 GPU 渲染，由 Jetpack Compose 根据 Google 的最新开发规范构建用户界面。

## Information

| Key | Value |
| --- | ----- |
| 兼容平台 | Android 6.0 及以上版本 |
| 最新版本 | 1.4.0 |
| 界面语言 | 英语 |

## Update Notes

### 版本 1.4.0

- 构图功能
    - 支持使用多种纵横比对图像进行裁剪，包括原始比例、自由比例、正方形、长方形等
    - 支持以 90 度增量旋转图像
    - 支持对图像进行水平镜像和垂直翻转

### 版本 1.3.1

- 本地 AI 模型优化
    - 本地 AI 模型转换为 MNN 格式
    - 包体积从上个版本的 110 MB 减少到 79 MB
- Bug 修复
    - 修复了在大图上点击消除模块的生成按钮后，按钮在一段时间内无响应的 Bug
    - 修复了消除区域、人脸框和实际图像区域不对齐的 Bug
- 性能和体验优化
    - 设置照片大小限制后，从图库中选择的小图不会被放大
    - 优化了消除操作后的对比耗时
    - 优化了在消除和其他图像操作叠加时，手势缩放和移动操作的耗时

### 版本 1.3.0

- AI 消除功能
    - 使用 MI-GAN 模型从图像中移除不需要的区域
- UI 更新
    - 操作区域将被分为两个模块：`Eliminate Pen` 和 `Image Effect`
    - 允许在模块之间无缝切换，所有效果均可叠加

### 版本 1.2.0

- 包体积优化
    - 通过模型量化，将包体积减少至上个版本的约一半大小
- 性能优化
    - 优化首次进入相册页时的滑动流畅性
- 滤镜更新
    - 增加 3 个全图滤镜效果

### 版本 1.1.0

- 内置相册页
    - 预览支持
    - 信息展示：文件类型、文件大小与图像分辨率
- 预览清晰度提升
    - 使用 MVP 矩阵用于手势操作
    - 支持以原图分辨率实时预览
- 自定义图像滤镜
    - 5 种不同的全图滤镜效果
- Bug 修复、优化
    - Undo / redo 优化

## Introduction

用户界面层使用 Jetpack Compose + MVVM 架构构建原生 Android UI，渲染层基于 C++ 11 和 OpenGL ES 实现 GPU 滤镜，内置开源的人脸识别和皮肤分割模型，支持多种人像、图片编辑效果，可随意进行效果叠加和每种效果的强度调节。支持实时预览和结果保存，可调整渲染分辨率以保证流畅度。预览过程中支持通过手势对图片进行放大缩小和位移操作。整体使用流程如下：

### 1. 导入图片与调整分辨率（可选）

![img](/assets/images/downloads/img_openps_1.webp)

点击首页 Select Photo 按钮以打开相册，选择任意图片进入处理。点击右上角设置按钮可根据设备性能自行从 4 档分辨率限制模式中选择：1K、2K、4K 及无限制。

### 2. 图片处理（美颜与编辑效果）

![img](/assets/images/downloads/img_openps_2.webp)

顶部工具栏：支持退出当前页面、隐藏 / 显示人脸识别框及保存当前处理结果到相册；

图片区域：实时展示当前渲染效果，支持双指放大、单指拖拽移动手势，默认显示人脸识别框；

操作栏：支持单步撤销（Undo）与重做（Redo），并可通过按住右侧「对比原图」按钮临时展示未经处理的原图；

功能区域：分美颜（Beautify）与编辑（Adjust）两个大类，美颜功能对人脸上的不同区域进行处理，编辑功能则针对整张图像。对于没有识别到人脸的图片，无法使用美颜功能，可以正常使用编辑功能。所有效果均可以通过滑杆调节效果强度，且支持叠加，共有以下 11 种效果：

| 序号 | 英文名称 | 中文名称 |
| --- | ------- | ------- |
| 美颜 1 | Smooth | 磨皮 |
| 美颜 2 | White | 美白 |
| 美颜 3 | Lipstick | 口红 |
| 美颜 4 | Blusher | 腮红 |
| 美颜 5 | Eye Zoom | 大眼 |
| 美颜 6 | Face Slim | 瘦脸 |
| 编辑 1 | Contrast | 对比度 |
| 编辑 2 | Exposure | 曝光 |
| 编辑 3 | Saturation | 饱和度 |
| 编辑 4 | Sharpen | 锐化 |
| 编辑 5 | Brightness | 亮度 |

### 3. 结果保存

![img](/assets/images/downloads/img_openps_3.webp)

在修图页点击右上角按钮即可将修图结果保存至手机相册。从相册页可以返回首页再修一张图。

## Downloads

[GitHub Releases (v1.4.0)](https://github.com/AkatsukiRika/OpenPS/releases/download/v1.4.0/OpenPS-v1.4.0.apk)

[GitHub Releases (v1.3.1)](https://github.com/AkatsukiRika/OpenPS/releases/download/v1.3.1/OpenPS-v1.3.1.apk)

[GitHub Releases (v1.3.0)](https://github.com/AkatsukiRika/OpenPS/releases/download/v1.3.0/OpenPS-v1.3.0.apk)

[GitHub Releases (v1.2.0)](https://github.com/AkatsukiRika/OpenPS/releases/download/v1.2.0/OpenPS-v1.2.0.apk)

[GitHub Releases (v1.1.0)](https://github.com/AkatsukiRika/OpenPS/releases/download/v1.1.0/OpenPS-v1.1.0.apk)

[GitHub Releases (v1.0.0)](https://github.com/AkatsukiRika/OpenPS/releases/download/v1.0.0/OpenPS-v1.0.0.apk)

## References

软件开发时参考、学习并使用了以下开源项目，在此感谢开源贡献者们。

[gpupixel: 跨平台的 OpenGL 渲染引擎，基于 C++11](https://github.com/pixpark/gpupixel)

[face-parsing.PyTorch: 开源的皮肤分割模型](https://github.com/zllrunning/face-parsing.PyTorch)

[MI-GAN: 移动端图像修复模型](https://github.com/Picsart-AI-Research/MI-GAN)

项目开发过程总结了以下技术文档，供参考：

[上篇](https://www.tang-ping.top/documents?id=100200)

[下篇](https://www.tang-ping.top/documents?id=100210)