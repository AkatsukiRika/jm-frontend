# 写在前面

从事 Android 开发行业也有近 3 年的时间了，在这期间基本都是以上层（Kotlin、Java）的工作为主，研究方向也主要是 Kotlin Multiplatform、Flutter 等跨端技术。虽然工作中的项目有涉及 Native C++ 这一方面，但很少有机会自己编写相关的代码，比较浅尝辄止。

这次借着工作任务，开发了一个简易的 Android 单端修图 APP。在这个过程中用到了 OpenCV 等 C / C++ 库，引入了一个开源的渲染引擎和 TensorFlow Lite 模型，自己也编写了一些 C++ 代码。在实践中熟悉了之前比较少接触的技术方向，通过整理这篇文档记录一下。

# 创建项目

本次的开发任务是一个类似美图秀秀的简易修图 APP，需要支持美白、磨皮等基本的美颜功能，上层交互比较简单，整个项目就只有三个页面：

![image](/assets/images/documents/img_pe_1.png)

左侧页面是主页，只有一个添加图片的按钮，点击后打开系统相册（无权限时先请求相册权限）。相册选图结束后，打开图片编辑页，页面由全屏图片画布、返回按钮、导出按钮、底部功能区、效果强度滑杆和对比原图按钮组成。点击导出按钮后，打开导出页面，编辑后的图片会被导出至系统相册。

使用 Android Studio 创建项目时，选择 Native C++ 模版：

![image](/assets/images/documents/img_pe_2.png)

并将 C++ 标准设置为 C++ 17，以启用一些新特性：

![image](/assets/images/documents/img_pe_3.png)

# 读取图片

创建好项目后，可以在项目的 app/src/main 路径下看到 cpp 目录，这就是后续我们放置 C++ 代码的路径了。当前这个目录下只有一个 CMakeLists.txt 和 native-lib.cpp 文件。前者说明此 JNI 项目使用 CMake 构建系统来构建，它包含了编译和链接项目所需的指令和配置信息。后者定义了一些 JNI C++ 函数，可以从 Java 层调用。运行此项目，可以看到页面上展示了一个来自 C++ 层的字符串。

为了更好地实现代码分层，我们单独创建一个 NativeLib 单例类，用于和上面的 native-lib.cpp 对接。同时，去掉自带的返回字符串函数，添加两个读取图片的函数。注意加上 external 关键字，表明这是一个 Native 函数：

```Kotlin
object NativeLib {
    init {
        // 这里的 Library 名称要与 CMakeLists.txt 中的 project 名一致
        System.loadLibrary("miniphotoeditor")
    }

    external fun loadBitmap(bitmap: Bitmap): Int

    external fun releaseBitmap(): Int
}
```

在 Android Studio 中，直接把鼠标移到这两个函数上，在弹出的选框中选择 native-lib.cpp 文件，就能创建好对应的 C++ 函数定义。它们看起来会是这样的：

```C++
extern "C"
JNIEXPORT jint JNICALL
Java_com_mygo_miniphotoeditor_NativeLib_loadBitmap(JNIEnv *env, jobject thiz, jobject bitmap) {
    return 0;
}

extern "C"
JNIEXPORT jint JNICALL
Java_com_mygo_miniphotoeditor_NativeLib_releaseBitmap(JNIEnv *env, jobject thiz) {
    return 0;
}
```

下一步我们需要创建一个 C++ 的类，用于存放从 Java 层传进来的 Bitmap 数据，以便于后续在 C++ 中处理它。这里我选择在 cpp 目录下的 cv 子目录中，创建一个头文件 CvLoader.h 和一个源文件 CvLoader.cpp，然后在 CMakeLists.txt 中包含源文件：

```CMake
# CMake 中 set 用于定义变量，这里用于存放项目中所有 C++ 源文件
set(SRC_FILES
        native-lib.cpp
        cv/CvLoader.cpp
        )

# 包含源文件
add_library(${CMAKE_PROJECT_NAME} SHARED
        # List C/C++ source files with relative paths to this CMakeLists.txt.
        ${SRC_FILES})

# 链接 Android 的系统库，处理 Bitmap 需要加上 jnigraphics 库
# log 库顾名思义，用于在 C++ 层处理日志的输出
target_link_libraries(${CMAKE_PROJECT_NAME}
        # List libraries link to the target library
        android
        log
        jnigraphics)
```

在头文件中，定义类的结构、成员变量以及函数：

```C++
#ifndef MINIPHOTOEDITOR_CVLOADER_H
#define MINIPHOTOEDITOR_CVLOADER_H

#include <jni.h>
#include <android/bitmap.h>

class CvLoader {
public:
    int storeBitmap(JNIEnv* env, jobject bitmap);
    int releaseStoredBitmap();
    
private:
    AndroidBitmapInfo bitmapInfo;    // Bitmap 元数据，如宽度、高度等
    void* pixels = nullptr;          // Bitmap 像素数据
};
```

在源文件中实现加载 Bitmap 和手动释放内存的逻辑：

```C++
#include "CvLoader.h"
#include <android/log.h>
#include <malloc.h>

// 用宏定义来打印日志
#define LOG_TAG "xuanTest"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR,LOG_TAG,__VA_ARGS__)
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,LOG_TAG,__VA_ARGS__)

int CvLoader::storeBitmap(JNIEnv *env, jobject bitmap) {
    if (AndroidBitmap_getInfo(env, bitmap, &bitmapInfo) < 0) {
        LOGE("获取Bitmap信息错误!");
        return 1;
    }
    if (AndroidBitmap_lockPixels(env, bitmap, &pixels) < 0) {
        LOGE("锁定Bitmap错误!");
        return 1;
    }
    size_t bufferSize = bitmapInfo.height * bitmapInfo.stride;
    // void* 是一个通用指针类型，可以指向任何类型的数据，不包含类型信息，需要格外小心使用。
    void* pixelBuffer = malloc(bufferSize);
    if (pixelBuffer != nullptr) {
        memcpy(pixelBuffer, pixels, bufferSize);
        pixels = pixelBuffer;
    }
    AndroidBitmap_unlockPixels(env, bitmap);
    LOGI("Bitmap加载成功");
}

int CvLoader::releaseStoredBitmap() {
    if (pixels != nullptr) {
        free(pixels);
        pixels = nullptr;
        LOGI("Bitmap释放完成");
    }
    return 0;
}
```

把具体的业务逻辑独立出来后，JNI 接口层的逻辑就可以写得比较简单了。我们可以在 native-lib.cpp 中定义一个 CvLoader* 类型的全局变量，方便后续调用其他的图像处理函数。与 Java 不同的就是要手动通过 delete 调用它的析构函数，防止内存泄漏：

```C++
#include "cv/CvLoader.h"
#include <jni.h>

CvLoader* cvLoader;

extern "C"
JNIEXPORT jint JNICALL
Java_com_mygo_miniphotoeditor_NativeLib_loadBitmap(JNIEnv *env, jobject thiz, jobject bitmap) {
    if (cvLoader == nullptr) {
        cvLoader = new CvLoader();
    }
    return cvLoader->storeBitmap(env, bitmap);
}

extern "C"
JNIEXPORT jint JNICALL
Java_com_mygo_miniphotoeditor_NativeLib_releaseBitmap(JNIEnv *env, jobject thiz) {
    if (cvLoader != nullptr) {
        int result = cvLoader->releaseStoredBitmap();
        delete cvLoader;
        cvLoader = nullptr;
        return result;
    }
    return 0;
}
```

回到上层代码，`loadBitmap` 函数可以在图片编辑页 Activity 的 `onCreate` 生命周期调用，而 `releaseBitmap` 在它的 `onDestroy` 生命周期调用。

# 引入 OpenCV Mobile 库

由于后续需要使用到 TensorFlow Lite 模型推理，在前处理、后处理过程中都需要进行一些多维矩阵和图像处理类的操作。OpenCV 作为一个常用的计算机视觉库提供了很多方便的函数，我们可以直接在项目中引入它。OpenCV 官方提供 Java API，但完整版的库占用体积过大，这里选择了 [nihui/opencv-mobile](https://github.com/nihui/opencv-mobile) 这个缩小版的实现。

进入 GitHub Releases 页面下载好 [opencv-mobile-4.10.0-android.zip](https://github.com/nihui/opencv-mobile/releases/download/v28/opencv-mobile-4.10.0-android.zip) 并解压，将结果放到 app/src/main/cpp/lib 目录，结构如下：

![image](/assets/images/documents/img_pe_4.png)

可以看到 OpenCV 库本身带有一些 cmake 后缀名的文件，这意味着我们只需要指定引入 OpenCV 的根目录，无需编写很多复杂的 CMake 逻辑，就可以开始使用它了：

```CMake
# 设置根目录
set(OpenCV_DIR ${CMAKE_SOURCE_DIR}/lib/opencv-mobile-4.10.0-android/sdk/native/jni)
find_package(OpenCV REQUIRED)

# 链接
target_link_libraries(${CMAKE_PROJECT_NAME}
        # List libraries link to the target library
        android
        log
        jnigraphics
        ${OpenCV_LIBS})
```

接下来按照开发 Android 时的习惯，创建一个 CvUtils 工具类，并定义一个将 Bitmap 转换为 OpenCV 矩阵的静态函数：

```C++
// CvUtils.h
#ifndef MINIPHOTOEDITOR_CVUTILS_H
#define MINIPHOTOEDITOR_CVUTILS_H

#include <opencv2/opencv.hpp>
#include <android/bitmap.h>

class CvUtils {
public:
    static cv::Mat bitmapToMat(const AndroidBitmapInfo bitmapInfo, const void* pixels);
};

#endif //MINIPHOTOEDITOR_CVUTILS_H

// CvUtils.cpp
#include "CvUtils.h"
#include <android/log.h>

#define LOG_TAG "xuanTest"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR,LOG_TAG,__VA_ARGS__)

cv::Mat CvUtils::bitmapToMat(const AndroidBitmapInfo bitmapInfo, const void* pixels) {
    cv::Mat resultMat;
    if (bitmapInfo.format == ANDROID_BITMAP_FORMAT_RGBA_8888) {
        resultMat.create(bitmapInfo.height, bitmapInfo.width, CV_8UC4);
        memcpy(resultMat.data, pixels, bitmapInfo.height * bitmapInfo.stride);
        return resultMat;
    } else {
        LOGE("传入的Bitmap必须是RGBA格式!");
        return cv::Mat();
    }
}
```

在 CvLoader 里包含 CvUtils 头文件，更改 `storeBitmap` 函数的实现，在保存 Bitmap 数据时，顺便转换一份 OpenCV 矩阵保存在成员变量中：

```C++
// CvLoader.h
#include <opencv2/opencv.hpp>

class CvLoader {
// ……
private:
    cv::Mat originalMat;
}

// CvLoader.cpp
int CvLoader::storeBitmap(JNIEnv *env, jobject bitmap) {
    // ……
    LOGI("Bitmap加载成功");
    originalMat = CvUtils::bitmapToMat(bitmapInfo, pixels);
    if (originalMat.empty()) {
        LOGE("Bitmap转Mat时出现错误!");
        return 1;
    } else {
        LOGI("Bitmap转Mat成功");
        return 0;
    }
}
```

# 引入 TensorFlow Lite C API

后续在开发美颜功能时，经常需要用到各种人脸区域的信息。这些信息可以通过引入开源的皮肤分割模型进行处理。本次使用的是 https://github.com/zllrunning/face-parsing.PyTorch 预训练模型，并将其转换为 tflite 格式以便于手机端推理。

我们使用 NDK 进行推理，查阅官网文档 https://ai.google.dev/edge/lite/android/development?hl=zh-cn 的 TFLite C API 一节，按步骤下载 AAR 包，解压后同样放到项目的 cpp/lib 目录下，形成以下结构：

![image](/assets/images/documents/img_pe_5.png)

这个库没有自带 CMake 配置文件，就需要我们自己设置它的编译和链接过程：

```CMake
# 包含头文件
set(TFLite_ROOT ${CMAKE_SOURCE_DIR}/lib/tensorflow-lite-2.16.1)
include_directories(${TFLite_ROOT}/headers)

# 设置 so 库的路径
if (${CMAKE_ANDROID_ARCH_ABI} STREQUAL "armeabi-v7a")
    set(TFLite_LIB_DIR ${TFLite_ROOT}/jni/armeabi-v7a)
elseif (${CMAKE_ANDROID_ARCH_ABI} STREQUAL "arm64-v8a")
    set(TFLite_LIB_DIR ${TFLite_ROOT}/jni/arm64-v8a)
elseif (${CMAKE_ANDROID_ARCH_ABI} STREQUAL "x86")
    set(TFLite_LIB_DIR ${TFLite_ROOT}/jni/x86)
elseif (${CMAKE_ANDROID_ARCH_ABI} STREQUAL "x86_64")
    set(TFLite_LIB_DIR ${TFLite_ROOT}/jni/x86_64)
else()
    message(FATAL_ERROR "Unsupported ABI: ${ANDROID_ABI}")
endif()

# 引入 TFLite 的 so 库
add_library(tflite SHARED IMPORTED)
set_target_properties(tflite PROPERTIES IMPORTED_LOCATION ${TFLite_LIB_DIR}/libtensorflowlite_jni.so)

# 链接
target_link_libraries(${CMAKE_PROJECT_NAME}
        # List libraries link to the target library
        android
        log
        jnigraphics
        tflite
        ${OpenCV_LIBS})
```

更改 CMakeLists.txt 后，就可以通过 `#include <tensorflow/lite/c/c_api.h>` 来引入 TensorFlow Lite C API 了。

# 运行 TFLite 机器学习模型

这一步又分为「预处理」、「模型推理」和「后处理」三个关键步骤。

## 1. 预处理
    

预处理是指在数据输入模型之前对数据进行的各种处理步骤，目的是提高数据质量、确保数据格式与模型的要求一致。这个模型的输入数据格式是 (1, 3, 512, 512) 的四维矩阵，类型是 float32。相比 YOLO v8 等模型，这个模型的预处理不是很复杂，适合机器学习方面经验不足的开发者上手。以下是用 C++ 代码实现的预处理过程：

```C++
// 定义 mean 和 std
const cv::Vec3f mean(0.485f, 0.456f, 0.406f);
const cv::Vec3f standard(0.229f, 0.224f, 0.225f);

std::vector<float32_t> SkinModelProcessor::preprocess(const cv::Mat& src_img) {
    // 将 RGBA 转换为 RGB
    cv::Mat img;
    cvtColor(src_img, img, cv::COLOR_RGBA2RGB);

    // 调整图像大小为 512x512
    resize(img, img, cv::Size(512, 512), 0, 0, cv::INTER_LINEAR);

    // 转换为 float 类型并归一化
    img.convertTo(img, CV_32F, 1.0 / 255.0);

    // 减去均值并除以标准差
    for (int i = 0; i < img.rows; ++i) {
        for (int j = 0; j < img.cols; ++j) {
            cv::Vec3f& pixel = img.at<cv::Vec3f>(i, j);
            pixel[0] = (pixel[0] - mean[0]) / standard[0];
            pixel[1] = (pixel[1] - mean[1]) / standard[1];
            pixel[2] = (pixel[2] - mean[2]) / standard[2];
        }
    }

    // 变换维度为 (1, 3, 512, 512)
    std::vector<float32_t> result(1 * 3 * 512 * 512);
    int idx = 0;
    for (int c = 0; c < 3; ++c) {
        for (int i = 0; i < 512; ++i) {
            for (int j = 0; j < 512; ++j) {
                result[idx++] = img.at<cv::Vec3f>(i, j)[c];
            }
        }
    }

    return result;
}
```

## 2. 模型推理
    

推理是指使用训练好的模型对新数据进行预测的过程，这个过程包括加载模型、准备输入数据和调用模型计算。这部分流程较长，但逻辑不复杂，下面是调用 TFLite C API 的实现：

```C++
#include <tensorflow/lite/c/c_api.h>

int CvLoader::runSkinModelInference(const char* modelBuffer, off_t modelSize) {
    if (pixels == nullptr || originalMat.empty()) {
        LOGE("Bitmap未加载!");
        return 1;
    }
    auto preprocessResult = SkinModelProcessor::preprocess(originalMat);
    LOGI("皮肤模型预处理完成, 预处理结果大小: %zu", preprocessResult.size());

    // 加载TFLite模型
    TfLiteModel* model = TfLiteModelCreate(modelBuffer, modelSize);
    if (model == nullptr) {
        LOGE("加载TFLite模型失败!");
        return 1;
    }

    // 创建解释器选项
    TfLiteInterpreterOptions* options = TfLiteInterpreterOptionsCreate();
    TfLiteInterpreterOptionsSetNumThreads(options, 2);

    // 创建解释器
    TfLiteInterpreter* interpreter = TfLiteInterpreterCreate(model, options);
    if (interpreter == nullptr) {
        TfLiteModelDelete(model);
        TfLiteInterpreterOptionsDelete(options);
        LOGE("创建解释器失败!");
        return 1;
    }

    // 分配Tensor Buffers
    if (TfLiteInterpreterAllocateTensors(interpreter) != kTfLiteOk) {
        TfLiteInterpreterDelete(interpreter);
        TfLiteModelDelete(model);
        TfLiteInterpreterOptionsDelete(options);
        LOGE("分配Tensor Buffers失败!");
        return 1;
    }

    // 获取输入Tensor
    TfLiteTensor* inputTensor = TfLiteInterpreterGetInputTensor(interpreter, 0);
    if (inputTensor == nullptr) {
        TfLiteInterpreterDelete(interpreter);
        TfLiteModelDelete(model);
        TfLiteInterpreterOptionsDelete(options);
        LOGE("获取输入Tensor失败!");
        return 1;
    }

    // 获取输入类型和维度
    TfLiteType tensorType = TfLiteTensorType(inputTensor);
    int32_t tensorDims = TfLiteTensorNumDims(inputTensor);
    LOGI("输入Tensor类型: %d", tensorType);
    for (int32_t i = 0; i < tensorDims; i++) {
        int32_t tensorDim = TfLiteTensorDim(inputTensor, i);
        LOGI("输入Tensor维度: %d, 大小: %d", i, tensorDim);
    }

    // 准备输入数据
    if (TfLiteTensorCopyFromBuffer(inputTensor, preprocessResult.data(), preprocessResult.size() * sizeof(float32_t)) != kTfLiteOk) {
        TfLiteInterpreterDelete(interpreter);
        TfLiteModelDelete(model);
        TfLiteInterpreterOptionsDelete(options);
        LOGE("准备输入数据失败!");
        return 1;
    }

    // 运行推理
    if (TfLiteInterpreterInvoke(interpreter) != kTfLiteOk) {
        TfLiteInterpreterDelete(interpreter);
        TfLiteModelDelete(model);
        TfLiteInterpreterOptionsDelete(options);
        LOGE("运行推理失败!");
        return 1;
    }

    // 获取输出Tensor
    const TfLiteTensor* outputTensor = TfLiteInterpreterGetOutputTensor(interpreter, 0);
    if (!outputTensor) {
        TfLiteInterpreterDelete(interpreter);
        TfLiteModelDelete(model);
        TfLiteInterpreterOptionsDelete(options);
        LOGE("获取输出Tensor失败!");
        return 1;
    }

    // 获取输出类型和维度
    tensorType = TfLiteTensorType(outputTensor);
    tensorDims = TfLiteTensorNumDims(outputTensor);
    LOGI("输出Tensor类型: %d", tensorType);
    for (int32_t i = 0; i < tensorDims; i++) {
        int32_t tensorDim = TfLiteTensorDim(outputTensor, i);
        LOGI("输出Tensor维度: %d, 大小: %d", i, tensorDim);
    }

    // 获取输出数据
    std::vector<float32_t> outputData(TfLiteTensorByteSize(outputTensor) / sizeof(float32_t));
    if (TfLiteTensorCopyToBuffer(outputTensor, outputData.data(), outputData.size() * sizeof(float32_t)) != kTfLiteOk) {
        TfLiteInterpreterDelete(interpreter);
        TfLiteModelDelete(model);
        TfLiteInterpreterOptionsDelete(options);
        LOGE("获取输出数据失败!");
        return 1;
    }
    
    // TODO: 后处理
}
```

## 3. 后处理
    

后处理是指对模型输出的结果进行处理，以便更好地解读和使用。这个模型的输出格式是 (1, 19, 512, 512) 的四维矩阵，数据类型是 float32。第二维代表整张图片共被分为了 19 个区域，后两维则代表缩放为 512*512 的原图。对于其中的每一个像素点，19 个分类的数值中哪个维度的数值最高，就代表着该点属于此分类。

基于此原理，可以由原始输出数据先整理出一个 512*512 的二维矩阵，矩阵上的每一个点对应了模型推理出该点对应的皮肤分类：

```C++
std::vector<cv::Mat> SkinModelProcessor::postprocess(const cv::Mat& model_out, int src_img_height, int src_img_width) {
    // 将 model_out 处理为 (19, 512, 512) 的三维数组
    std::vector<cv::Mat> channels;
    for (int i = 0; i < 19; ++i) {
        cv::Mat channel(512, 512, CV_32F, (void*)(model_out.ptr<float>() + i * 512 * 512));
        channels.push_back(channel);
    }

    // 将每个通道合并为一个二维矩阵
    cv::Mat parsing = cv::Mat::zeros(512, 512, CV_32S);
    for (int i = 0; i < 512; ++i) {
        for (int j = 0; j < 512; ++j) {
            float max_val = -FLT_MAX;
            int max_idx = -1;
            for (int c = 0; c < 19; ++c) {
                float val = channels[c].at<float>(i, j);
                if (val > max_val) {
                    max_val = val;
                    max_idx = c;
                }
            }
            parsing.at<int>(i, j) = max_idx;
        }
    }
    
    // TODO: 后续实现
}
```

接下来，我们先把这个矩阵调整回原图的大小，并创建几个后续会用得上的区域[掩膜](https://blog.csdn.net/bitcarmanlee/article/details/79132017)，就完成了模型部分的工作：

```C++
std::vector<cv::Mat> SkinModelProcessor::postprocess(const cv::Mat& model_out, int src_img_height, int src_img_width) {
    // 前略
    
    // 调整大小到原始图像尺寸
    cv::Mat resized_parsing;
    resize(parsing, resized_parsing, cv::Size(src_img_width, src_img_height), 0, 0, cv::INTER_NEAREST);
    
    auto skin_mask = create_mask(resized_parsing, [](int val) { return val >= 1 && val <= 13; });
    auto teeth_mask = create_mask(resized_parsing, [](int val) { return val == 11; });
    auto eyes_mask = create_mask(resized_parsing, [](int val) { return val == 4 || val == 5 || val == 6; });
    
    return {resized_parsing, skin_mask, teeth_mask, eyes_mask};
}

cv::Mat SkinModelProcessor::create_mask(const cv::Mat &parsing_result, std::function<bool(int)> condition) {
    // 创建掩膜的操作
    cv::Mat mask_image = cv::Mat::zeros(parsing_result.size(), CV_8UC3);
    for (int i = 0; i < parsing_result.rows; ++i) {
        for (int j = 0; j < parsing_result.cols; ++j) {
            if (condition(parsing_result.at<int>(i, j))) {
                mask_image.at<cv::Vec3b>(i, j) = cv::Vec3b(255, 255, 255);
            }
        }
    }
    return mask_image;
}
```

# 未完待续

本文中，我们成功创建了一个 Android JNI 项目，引入了 OpenCV Mobile 库，并通过 TensorFlow Lite C API 接入了一个开源的皮肤分割模型。后半部分，我们将接入一个开源的渲染引擎，完成整个美颜 Demo 的开发流程。考虑到本文篇幅已经很长，后半部分将另开一篇文档阐述。