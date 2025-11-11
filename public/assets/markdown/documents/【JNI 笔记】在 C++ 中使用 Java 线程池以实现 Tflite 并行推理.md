# 引入

尝试接入一个 `.tflite` 格式的模型，它接受一个 1024 * 1024 的矩阵输入，而初始输入经过预处理后形成了一个 3072 * 3072 的矩阵，需要分 9 块送入模型推理。这段代码是使用 C++ 和 Tensorflow Lite C API 实现的，因此急需一种在 JNI C++ 中实现多线程并行的方法。

# 方案

在 C++ 中通过 `#include <thread>` 头文件也可以开启线程，但在 C++ 中实现一个线程池复杂性较高。由于这段代码逻辑仅考虑在 Android 运行，可以借助 Java 里的 `ExecutorService`，通过 JNI 技术调用 Java 层的线程池实现并行处理。

# 实现

## 1. Java 层的准备
    

在 Java 层中增加一个 `NativeCallable` 类，它实现 `Callable` 接口的同时存储指向 C++ 层 `std::function` 的指针，用来支持通过 JNI 调用 C++ 任务。

```Java
public class NativeCallable implements Callable<Void> {
    private final long nativeTaskPtr;

    public NativeCallable(long nativeTaskPtr) {
        this.nativeTaskPtr = nativeTaskPtr;
    }

    @Override
    public Void call() throws Exception {
        try {
            nativeCall(nativeTaskPtr);
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            deleteNativeCall(nativeTaskPtr);
        }
        return null;
    }

    private native void nativeCall(long taskPtr);

    private native void deleteNativeCall(long taskPtr);
}
```

实现 JNI 层的 `nativeCall` 和 `deleteNativeCall` 函数如下：

```C++
extern "C"
JNIEXPORT void JNICALL
Java_com_example_demo_interop_NativeCallable_nativeCall(JNIEnv *env, jobject thiz, jlong task_ptr) {
    auto* task = reinterpret_cast<std::shared_ptr<std::function<void()>>*>(task_ptr);
    if (task && *task) {
        (**task)();
    }
}

extern "C"
JNIEXPORT void JNICALL
Java_com_example_demo_interop_NativeCallable_deleteNativeCall(JNIEnv *env, jobject thiz, jlong task_ptr) {
    auto* task = reinterpret_cast<std::shared_ptr<std::function<void()>>*>(task_ptr);
    if (task) {
        delete task;
    }
}
```

关于 `Callable` 接口本身的介绍可以参照这篇文档：[JAVA 并发编程——Callable 接口和 FutureTask 简介和使用](https://segmentfault.com/a/1190000040058171)

## 2. 定义线程池
    

增加一个包装类 `JNIThreadPool`，头文件定义如下：

```C++
class JNIThreadPool {
public:
    JNIThreadPool(JNIEnv* env, jobject executor);

    ~JNIThreadPool();

    void submit(std::function<void()> task);

    void await();

private:
    JavaVM* javaVM;
    jobject executorRef;
    jclass futureClass;
    jmethodID submitMethod;
    jmethodID getFutureResult;

    jclass nativeCallableClass;
    jmethodID nativeCallableConstructor;

    std::vector<jobject> futures;
    std::mutex mutex;

    std::vector<std::shared_ptr<std::function<void()>>> tasks;
};
```

在构造函数中通过 JNI 调用 Java 方法，初始化所需 Java 类、方法和构造方法的引用：

```C++
JNIThreadPool::JNIThreadPool(JNIEnv *env, jobject executor) {
    env->GetJavaVM(&javaVM);
    executorRef = env->NewGlobalRef(executor);

    jclass executorClass = env->GetObjectClass(executor);
    submitMethod = env->GetMethodID(executorClass, "submit", "(Ljava/util/concurrent/Callable;)Ljava/util/concurrent/Future;");

    futureClass = (jclass) env->NewGlobalRef(env->FindClass("java/util/concurrent/Future"));
    getFutureResult = env->GetMethodID(futureClass, "get", "()Ljava/lang/Object;");

    nativeCallableClass = (jclass) env->NewGlobalRef(env->FindClass("com/mitakeran/aidocfilterdemo/interop/NativeCallable"));
    nativeCallableConstructor = env->GetMethodID(nativeCallableClass, "<init>", "(J)V");
}
```

`submit` 函数用于提交一个任务到线程池并开始运行它，实际上就是通过 JNI 调用先前封装的 `NativeCallable` 类里的 `call` 方法：

```C++
void JNIThreadPool::submit(std::function<void()> task) {
    JNIEnv* env;
    javaVM->AttachCurrentThread(&env, nullptr);

    auto taskPtr = std::make_shared<std::function<void()>>(std::move(task));
    tasks.push_back(taskPtr);

    jobject callable = env->NewObject(
        nativeCallableClass,
        nativeCallableConstructor,
        reinterpret_cast<jlong>(new std::shared_ptr<std::function<void()>>(taskPtr))
    );

    jobject future = env->CallObjectMethod(executorRef, submitMethod, callable);
    futures.push_back(env->NewGlobalRef(future));

    env->DeleteLocalRef(callable);
}
```

`await` 则用于等待所有线程上的任务完成，在本例中需等待所有任务完成后方可进行模型的后处理：

```C++
void JNIThreadPool::await() {
    JNIEnv* env;
    javaVM->AttachCurrentThread(&env, nullptr);

    for (jobject future : futures) {
        jthrowable exception;
        env->CallObjectMethod(future, getFutureResult);
        exception = env->ExceptionOccurred();
        if (exception) {
            env->ExceptionClear();
            env->DeleteLocalRef(exception);
        }
        env->DeleteGlobalRef(future);
    }
    
    futures.clear();
    tasks.clear();
}
```

析构函数则是做一些全局引用的清理：

```C++
JNIThreadPool::~JNIThreadPool() {
    JNIEnv* env;

    if (javaVM->GetEnv((void**)&env, JNI_VERSION_1_6) == JNI_OK) {
        env->DeleteGlobalRef(executorRef);
        env->DeleteGlobalRef(futureClass);
        env->DeleteGlobalRef(nativeCallableClass);

        tasks.clear();
        futures.clear();
    }
}
```

## 3. 使用线程池
    

去掉具体业务相关的代码，对如上 `JNIThreadPool` 的使用方式如下：

```C++
cv::Mat ImageProcessor::applyDeblur(const cv::Mat &input, JNIEnv* env, jobject javaExecutor) {
    JNIThreadPool threadPool(env, javaExecutor);
    
    // ……省略预处理逻辑……
    
    cv::Mat resized;    // 3072 * 3072，原数据预处理后的结果
    cv::Mat outputBuffer = cv::Mat::zeros(3072, 3072, CV_32F);    // 模型推理、汇总后的结果
    
    const int pad = 1024;
    std::mutex resultMutex;
    std::vector<float> patchBuffer(pad * pad);
    
    for (int x = 0; x < 3; x++) {
        for (int y = 0; y < 3; y++) {
            cv::Mat patch = resized(cv::Range(x*pad, x*pad+pad),
                            cv::Range(y*pad, y*pad+pad));
                            
            threadPool.submit([](this, patch, x, y, &outputBuffer, &resultMutex){
                // ……省略推理逻辑……
            
                cv::Mat outputPatch(pad, pad, CV_32F);    // 单块模型输出被写入到这里
                
                {
                    // 保证线程安全地将输出写入到汇总后的结果中
                    std::lock_guard<std::mutex> lock(resultMutex);
                    outputPatch.copyTo(outputBuffer(cv::Range(x*pad, x*pad+pad),
                                cv::Range(y*pad, y*pad+pad)));
                }
            });
        }
    }
    
    threadPool.await();
    
    // ……省略后处理逻辑……
}
```

上面 `submit` 参数里的独立大括号代表的是单独的作用域，离开作用域后锁就会失效，是用来为写入操作加锁的一种方式。

# 踩坑

本例中使用了 Tflite 的 C API 运行模型推理，而它的 `TfLiteInterpreter` 和 `TfLiteInterpreterOptions` 都不是线程安全的，这代表我们需要为每个线程用独立的选项创建独立的解释器实例。对调用模型推理函数的类增加如下逻辑：

```C++
class ImageProcessor {
private:
    // 线程局部存储的Interpreter
    struct InterpreterWrapper {
        TfLiteInterpreter* interpreter;
        
        InterpreterWrapper() : interpreter(nullptr) {}
        ~InterpreterWrapper() {
            if (interpreter) {
                TfLiteInterpreterDelete(interpreter);
            }
        }
    };
    
    // 使用线程局部存储确保每个线程有自己的interpreter
    static thread_local InterpreterWrapper threadInterpreter;
    
    TfLiteModel* model;  // 模型可以在线程间共享

    // 获取当前线程的interpreter
    TfLiteInterpreter* getInterpreter() {
        if (!threadInterpreter.interpreter) {
            // 为当前线程创建新的interpreter
            TfLiteInterpreterOptions* options = TfLiteInterpreterOptionsCreate();
            // 配置interpreter选项...
            threadInterpreter.interpreter = TfLiteInterpreterCreate(model, options);
            TfLiteInterpreterOptionsDelete(options);
            
            // 分配tensors
            if (TfLiteInterpreterAllocateTensors(threadInterpreter.interpreter) != kTfLiteOk) {
                LOGE("Failed to allocate tensors!");
                return nullptr;
            }
        }
        return threadInterpreter.interpreter;
    }
}

// 定义线程局部存储的interpreter
thread_local ImageProcessor::InterpreterWrapper ImageProcessor::threadInterpreter;
```

在实际获取解释器时，通过调用 `getInterpreter` 函数获取，就不会出现多个线程同时调用同一个 Interpreter 实例导致的崩溃了。