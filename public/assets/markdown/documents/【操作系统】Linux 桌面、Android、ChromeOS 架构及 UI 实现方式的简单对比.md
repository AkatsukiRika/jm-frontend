# 写在前面

本人目前从事 Android 开发（应用层，非 Framework），有多年使用 Linux 发行版（主要是 Debian 和 RedHat 系）的经验。本文内容由本人自互联网收集、整合相关资料而来，作为个人技术学习补充知识，可能会有疏漏或错误。

# 提出疑问

使用 Ubuntu、Fedora 等常见的 Linux 发行版时，在遇到一些与图形界面相关的问题并尝试解决的过程中，常常会接触到 X11、Wayland 等技术名词。若同时在使用 Android 和 ChromeOS 这两个同样基于 Linux 的操作系统，基于使用体验的对比，很容易产生如下疑问：

1. 它们是否使用同样的内核，上层部分的实现有什么区别？

2. Android、ChromeOS 及 Linux 发行版在 UI 部分的实现有何异同？

3. 是否可以在 Android 或 ChromeOS 系统上原生运行 Linux 程序（或反之）？

下文的内容将主要围绕着上述 3 个疑问点展开，只涉及概括性的架构简析，不涉及具体的代码实现或更底层的原理。

# 架构示意

![image](/assets/images/documents/img_linux_1.png)

# 架构简析

## Android

Android 作为目前最广泛使用的移动平台，分层相较于另外两个桌面系统要更复杂一些。其底层使用的是由 Google 进行了裁剪和定制的 Linux 内核，上层则包含以下几个主要部分：

- **硬件抽象层（HAL）**：连接 Android Framework 与内核设备驱动的重要桥梁，向下屏蔽设备及其驱动的实现细节，向上为系统服务及 Framework 提供统一的设备访问接口。同时 Google 基于保护硬件厂商知识产权的考量，允许硬件厂商不公开源码，将设备相关的实现放在 HAL 层中并以共享库（.so）的形式提供。

- **Android 运行时**：这一部分在 Android 5.0 以前采用的是 Dalvik，这是一种基于 JVM 的解释器，基于解释方式执行 Java 代码，后被采用 AOT 编译方式的 ART 取代。Dalvik 和 ART 通过执行 DEX 文件来运行 Java 代码，这是一种专为 Android 设计的字节码格式，类比于 JDK 的 .class 文件。

- **原生 C/C++ 库**：Android 平台提供了 Java 框架 API 用于向应用提供一些原生库的功能，如 [Java OpenGL API](https://developer.android.com/develop/ui/views/graphics/opengl/about-opengl)。除此以外，也可以通过 NDK 直接从原生代码访问这些平台库。

- **Java API 框架**：这一层包含平常在编写 Android 原生 App 时很常用到的基础组件，Android 的四大组件 Activity、Service、BroadcastReceiver 和 ContentProvider 都属于这一层。Framework 开发岗位的职责主要包含 Java API 框架（俗称 Java Framework）、原生 C/C++ 库（俗称 Native Framework）和 Android 运行时这三层。

- **应用程序**：这一层包含电子邮件、短信等 Android 系统自带的系统应用和用户后续安装的应用，Android 应用层开发岗位的职责主要属于这一部分。

## ChromeOS

这是一款由 Google 基于 Linux 内核设计的桌面操作系统，使用 Google Chrome 浏览器作为主要用户界面，其开放源代码版本为 Chromium OS。在大陆地区，有基于 Chromium OS 构建的符合大陆用户使用习惯的发行版，名为 FydeOS。ChromeOS 的架构主要包含以下部分：

- **Linux 内核及系统库**：ChromeOS 的这一部分是基于 Gentoo Linux 构建的，但经过了 Google 的深度定制。

- **Freon**：这是 Google 自定义的图形堆栈，从 X11 演变而来。

- **窗口管理器**：负责处理用户和多个客户端窗口交互，控制窗口的摆放、输入窗口聚焦以及快捷键操作等。这一部分也是由 Google 自研的。

- **Chromium**：用于实现 Chrome OS 的桌面体验，使用的是 Google Chromium 浏览器中的开源组件，包括 HTML5 排版引擎和运行 JavaScript 的 V8 引擎等。

- **应用程序**：Chrome OS 的原生应用即为 Web 应用（PWA），可以使用 React、Vue 等各种流行的前端框架进行开发，很多 PWA 应用也支持保存到本地，在无网的条件下运行。

## Linux 桌面发行版

许多厂商和 Linux 社区在 Linux 内核之上开发了许多工具，如常用的 GNOME 桌面、Firefox 浏览器等，将 Linux 内核和这些应用一起打包后就被称作 Linux 发行版本。常见的 Linux 发行版本有 Ubuntu、Fedora 等。对于有桌面的发行版，它们的架构大体可以分为以下部分：

- **Linux 内核**：所有 Linux 发行版的内核都源自 Linus Torvalds 和其维护团队发布的上游内核（Mainline Kernel），根据具体发行版的不同，会基于上游内核进行一定程度的补丁和定制。

- **系统库**：构成 Linux 操作系统核心功能的基础部分，包含 C 标准库（LibC）和许多其他关键的系统库，例如动态链接器、安全和加密库等。

- **X11 / Wayland**：与 ChromeOS 的 Freon 同层，作为 Linux 桌面的图形堆栈，用于标准化应用程序、桌面环境和显卡之间的数据交换过程。

- **窗口管理器及桌面环境**：用于实现 Linux 发行版的桌面体验，不同桌面环境使用的技术栈有区别，如 GNOME 使用的是基于 C 的 GTK，KDE Plasma 使用基于 C++ 的 QT 等。

- **应用程序**：相比 Android 和 ChromeOS，Linux 的上层应用程序则非常自由。既可以直接使用 C / C++ 编写程序并编译为机器码运行，也可以运行 Java、Dart 等虚拟机，或使用 Electron 基于 Web 前端技术开发应用。

# 解答疑问

进行了上面的分析后，就可以解答前文提出的疑问了：

1. 它们使用的均是 Linux 内核，但经过了不同程度的裁剪和定制，上层部分的实现参见「架构简析」一节的内容。

2. Android 的 UI 使用 SurfaceFlinger、WindowManager 等组件实现，专注于移动设备的触控体验；ChromeOS 的 UI 使用定制的图形堆栈（Freon）和基于 Web 技术的图形界面；而 Linux 桌面发行版提供传统的桌面体验，使用标准的图形堆栈（X11 / Wayland）和丰富的桌面环境，支持广泛的应用生态。

3. Android 中缺少许多标准的 GNU 库，无法原生支持 Linux 应用；ChromeOS 更接近传统意义上的 Linux 发行版，但被 Google 以安全性等原因施加了较多限制；同时，其他的 Linux 发行版没有 Dalvik / ART，无法直接运行 Android 应用。而 ChromeOS 的原生应用大多是 PWA 形式的 Web App，在 Linux 发行版中可以直接运行。

# 参考内容

[知乎专栏：Android 到底是不是 Linux？](https://zhuanlan.zhihu.com/p/144508175)

[知乎回答：Google 在 Android 和 ChromeOS 上使用的技术栈](https://www.zhihu.com/question/388609932/answer/1223116613)

[Android Developers: Platform Architecture](https://developer.android.com/guide/platform)

[Cloud Atlas Beta 文档：Chromium OS 架构](https://cloud-atlas.readthedocs.io/zh-cn/latest/linux/chromium_os/chromium_os_arch.html)