> 本文写于 2024 年 1 月，部分内容有时效性，请注意甄别。

# 更新日志

| **更新日期**   | **更新内容**                                                  |
|------------|-----------------------------------------------------------|
| 2024/02/04 | 补充升级到 Windows 11 23H2 版本后使用镜像网络模式的方法。本文中标记为 * 的段落为此次更新新增。 |

# 前言

作为 Android + Flutter 开发人员，使用 macOS 搭建开发环境非常方便。不仅有开箱即用的 Android Studio、Visual Studio Code 等 IDE 和文本编辑器，macOS 的类 UNIX 命令行环境也使得开发者可以灵活调用大量命令行工具。然而，搭载 macOS 的设备售价较为昂贵（特别是内存和 SSD 的价格），若要追求硬件性价比，还是使用 Windows 平台更加实惠。

在 macOS 上开发的项目，使用同一套源码在 Windows 上运行很容易遇到兼容性问题。若使用 Ubuntu 等 Linux 发行版则基本都能兼容，但 Linux 上软件生态的匮乏使得日用 Linux 实在不是个好选择。好在 Windows 11 自带 Linux 子系统（WSL2），支持嵌套虚拟化等高阶特性，并且能够运行 Linux GUI 程序，适合用来打造平替 macOS 的开发环境。

在介绍详细配置过程之前，先放上我的机器配置以作参考：

| 项目 | 参数 |
| --- | --- |
| CPU | Intel Core i9-13900H (14 核心 20 线程) |
| 独立显卡 | NVIDIA RTX4060 (8GB显存) |
| 内存容量 | 32 GB |
| SSD 容量 | 1 TB |
| 屏幕分辨率 | 3200 x 2000 (内置显示器, 165 Hz 刷新率), 3840 x 2160 (外接显示器, 60 Hz 刷新率) |
| 操作系统 | Windows 11 家庭中文版 22H2 |

# WSL2 配置

由于 WSL2 实际上是轻量级的 Hyper-V 虚拟机，在安装基于 WSL2 的发行版之前，需要进入「启用或关闭 Windows 功能」页面：

![image](/assets/images/documents/img_wsl_1.png)

在此页面中，开启「Windows 虚拟机监控程序平台」、「适用于 Linux 的 Windows 子系统」以及「虚拟机平台」三个开关后重启电脑。

WSL2 中支持安装多种 Linux 发行版，常见的 Debian、Ubuntu 等都支持。本文中使用的将会是 Fedora Remix for WSL 这个定制发行版，基于 RedHat 系发行版 Fedora 修改而来，默认包管理器为 dnf，主要亮点是在最新版本中支持开箱即用的桌面环境安装，并能够使用 Windows 自带的远程桌面功能访问 Linux 桌面。

该版本由 Whitewater Foundry 开发，可以直接在 Microsoft Store 购买并下载。进入 Microsoft Store 后搜索 Fedora Remix 即可找到。

![image](/assets/images/documents/img_wsl_2.png)

安装完成后，进入 WSL2 终端环境，输入 `install-desktop.sh`，即可进入安装桌面环境的向导程序，需要按照画面上的提示使用方向键操作。

![image](/assets/images/documents/img_wsl_3.png)

前面的 RDP 端口设置保持默认的 3396 即可。到了这一步，会要求选择需要安装的桌面环境，这里推荐使用 GNOME。它是 Fedora Workstation 官方版本的默认桌面环境，带有对高分屏的良好支持。

安装完毕后，打开 Microsoft 远程桌面工具 mstsc，输入 `localhost:3396` 进行连接，就能访问到完整的 GNOME 环境了。

![image](/assets/images/documents/img_wsl_4.png)

## * 使用 WSL2 2.0 更新的功能

将 Windows 11 更新至 23H2 版本后，WSL2 将迎来 2.0 版本的更新，支持了自动回收内存、自动释放 Linux 虚拟硬盘空间和镜像网络等新功能，使用起来更加简便，和 Windows 的集成性也变得更好。

要开启这些新特性，需要在 Windows 的用户目录下，新建名为 `.wslconfig` 的配置文件，并写入如下内容：

```properties
[wsl2]
memory=16GB
processors=8

[experimental]
# 开启自动回收内存，模式有 gradual, dropcache 和 disabled
autoMemoryReclaim=gradual
# 开启镜像网络
networkingMode=mirrored
# 开启自动释放 Linux 虚拟硬盘空间
sparseVhd=true
```

# WSLg 配置

## 前置准备

上面的方法通过 Xrdp 实现了对 Linux 桌面环境的访问，它是 Microsoft 远程桌面协议（RDP）的开源实现，优点是开箱即用（通过安装 Fedora Remix for WSL），缺点是图形性能不够好，在我的 4K 显示器下拖动窗口能感觉到明显的延迟。本节中通过配置 WSLg 可以实现更流畅、更无缝的 Linux GUI 使用体验。

WSLg 是微软官方支持的功能，在 Windows 11 + WSL2 的环境下无需特殊配置即可使用。在使用之前请确保安装好了 Windows 上最新的显卡驱动，它能够提供硬件加速的 OpenGL 渲染。

> Intel GPU 驱动程序: https://www.intel.com/content/www/us/en/download/19344/intel-graphics-windows-dch-drivers.html
> AMD GPU 驱动程序: https://www.amd.com/en/support
> NVIDIA GPU 驱动程序: https://www.nvidia.com/Download/index.aspx?lang=en-us
> 直接在 Windows 上安装驱动即可，无需到 Linux 终端进行其他操作。

在上一步安装 GNOME 时已经安装了很多图形化的组件，可以在终端中直接启动。尝试输入 `nautilus`，就能在 Windows 桌面上启动 GNOME 自带的文件管理器。

![image](/assets/images/documents/img_wsl_5.png)

## 高分屏适配

WSLg 目前对高分屏的适配还存在缺陷。它基于 Wayland，对于原生支持 Wayland 的程序（如 nautilus 和 gedit）能实现原生放大，但对于不支持的程序（比如下面要安装的 Google Chrome 等）就会强行缩放，导致显示效果模糊。我摸索出了如下的规避方式，可以关闭 WSLg 自带的缩放处理功能，让每个 Linux GUI 程序自行缩放：

1. 将 Windows 的缩放比例调整为与当前比例接近的非整数倍。我的两台显示器都是 200% 的缩放比例，此处调整为自定义的 199% 并重启电脑。

![image](/assets/images/documents/img_wsl_6.png)

2. 进入 Linux 终端，输入以下命令，通过 gsettings 调整缩放比例（能使 GNOME 自带程序缩放正常）：

```bash
gsettings set org.gnome.settings-daemon.plugins.xsettings overrides "[{'Gdk/WindowScalingFactor', <2>}]"
gsettings set org.gnome.desktop.interface scaling-factor 2
```

3. 用终端编辑 ~/.Xresources 文件，添加如下内容，设置显示器的 DPI：

```bash
Xft.dpi: 192
```

其中 100% 缩放对应的 DPI 值为 96，200% 对应 192。为了保证上面的设置起作用，打开 `~/.bashrc`（或 `~/.zshrc` 等文件），添加如下内容并保存：

```bash
xrdb -merge ~/.Xresources
```

如此一来，Android Studio、Google Chrome 等第三方应用程序就能正确缩放了。

# 开发环境配置

## 网络配置

WSL2 默认采用的是 NAT 网络模式，若要连接主机上的代理，需要打开代理工具的「允许局域网连接」开关，接着在 ~/.bashrc 等文件中封装如下 Shell 函数：

```bash
function fq_start() {
    host_ip=$(cat /etc/resolv.conf | grep "nameserver" | cut -f 2 -d " ")
    export HTTP_PROXY="http://$host_ip:7890"
    export HTTPS_PROXY="http://$host_ip:7890"
    export ALL_PROXY="http://$host_ip:7890"
}

function fq_end() {
    export HTTP_PROXY=""
    export HTTPS_PROXY=""
    export ALL_PROXY=""
}
```

\* 若开启了 WSL2 2.0 版本的镜像网络功能，由于 WSL2 直接共享主机的网络配置，上面的 fq_start() 函数代码就可以修改成以下这样：

```bash
function fq_start() {
    export HTTP_PROXY="http://127.0.0.1:7890"
    export HTTPS_PROXY="http://127.0.0.1:7890"
    export ALL_PROXY="http://127.0.0.1:7890"
}
```

需要使用代理时只需终端输入 `fq_start`，反之则输入 `fq_end` 即可。

## Shell

推荐安装 zsh，默认设置配合 oh-my-zsh 的 zsh-syntax-highlighting 和 zsh-autosuggestions 插件就很好用了。在 Fedora Remix 上安装 zsh 只需要一行命令：

```bash
sudo dnf install zsh
```

然后按照 [这篇指南](https://segmentfault.com/a/1190000039860436#item-3-4) 在代理环境下安装 oh-my-zsh 和相应插件即可。

## 浏览器

通过 Fedora Remix 提供的脚本安装的 GNOME 桌面环境是不自带浏览器的。好在 Fedora 上可以通过命令行方式安装 Google Chrome 浏览器，安装过程可以直接在 Windows Terminal 操作，无需打开 mstsc。只需依次输入如下命令：

```bash
sudo dnf install fedora-workstation-repositories
sudo dnf config-manager --set-enabled google-chrome
sudo dnf install google-chrome-stable
```

安装完成后，还是在终端输入 `google-chrome` 即可打开。

## 中文输入法

Fedora Remix 中的中文字体应当开箱即用，可在 Google Chrome 中确认。输入法框架推荐安装 fcitx5，装上自带的中文插件就能很顺畅地输入中文了。只需如下命令：

```bash
sudo dnf install fcitx5 fcitx5-chinese-addons fcitx5-gtk fcitx5-qt fcitx5-configtool fcitx5-autostart
```

安装完毕后可以登录 mstsc，在程序列表中找到「Fcitx 配置」，将中文输入法添加至「当前输入法」分组：

![image](/assets/images/documents/img_wsl_7.png)

由于后续主要会使用 WSLg 而非 mstsc 中的 GNOME 环境开发，这里将以下这行命令添加到 `~/.zshrc` 中，实现 fcitx5 的自启动：

```bash
nohup fcitx5 >/dev/null 2>&1 &
```

目前已知这种方法存在局限性，在 WSL2 虚拟机首次启动时 fcitx5 会初始化失败，此时需要登录一次 mstsc 再开启新的终端会话。在新开启的终端会话中运行 GUI 应用，会发现可以输入中文了。

# 开发工具

## 1. Visual Studio Code

官方网站: https://code.visualstudio.com/

选择 RPM 包，根据指引安装即可。安装后在终端使用 `code` 命令启动。

## 2. Android Studio

官方网站: https://developer.android.com/studio

从官网下载的 Android Studio 是二进制文件，需要通过运行 Shell 脚本打开。推荐将下载好的压缩包解压，再将文件夹移动至 `/opt` 目录下，然后在 `~/.zshrc` 中封装一个命令别名：

```bash
alias android-studio="sh /opt/android-studio/bin/studio.sh"
```

这样就可以通过一行命令来打开 Android Studio 了。

## 3. KVM（Android 模拟器加速）

Windows 11 上的 WSL2 默认支持嵌套虚拟化，这意味着能够在 WSL2 中开启 KVM，加速 Android Studio 自带模拟器的运行。

首先运行下面这行命令，检查当前 CPU 是否支持虚拟化，如果终端没有输出就是不支持，可以跳过此节，使用软件模拟方式运行 Android 模拟器：

```bash
egrep '^flags.*(vmx|svm)' /proc/cpuinfo
```

在 Fedora 上安装相关软件包很简单，只需要一行命令即可：

```bash
sudo dnf install @virtualization
```

安装完成后，启动 libvirtd 服务，并将它加入开机启动项：

```bash
sudo systemctl start libvirtd
sudo systemctl enable libvirtd
```

再使用如下命令确认 libvirtd 是否正在运行，若输出 Active 就是正在运行：

```bash
sudo systemctl is-active libvirt
```
打开 Android Studio 的模拟器，模拟器开机时若出现一个包含 Nested Virtualization 字样的提示框，则证明 KVM 加速已经启动成功。

\* 通过嵌套虚拟化的方式启动 WSL2 中的 Android AVD 性能损失过大，在启动镜像网络后不再建议这样使用。建议使用 Windows 端的第三方 Android 模拟器（如网易 MUMU 等），通过 adb 在 WSL2 中访问。

# 已知缺点

按照上面步骤配置的开发环境仍有不足之处，但可以满足基本的开发使用需求。若要进行前端、服务端等其他开发，也可以很方便地安装 IDE 和相应环境。使用到现在，主要发现的缺点有以下几点：

1. **对设备配置要求较高**：WSL2 本身就是基于微软的 Hyper-V 虚拟化运行，而 Android Studio 上的模拟器又是在此基础上嵌套运行了 KVM，相比直接在宿主机上运行更吃性能。亲测使用 Android Studio 打开一个小型 Compose Multiplatform 项目并打开模拟器运行时，内存使用量达到 24 / 32 GB，CPU 占用率也较高，打开模拟器会听到明显的风扇噪音。

2. **网络与 USB 支持**：WSL2 本身的网段与主机不互通，这就使得 adb 等应用的使用变得更为复杂。网络部分在 Windows 11 的 23H2 版本上**已得到解决**，但 WSL2 对 USB 的支持仍需要依赖 USB over IP，会增加一定的配置复杂度。

3. **磁盘 IO 性能问题**：WSL2 与主机之间的磁盘 IO 通过网络方式进行，速度很慢。这个问题解决起来比较简单：只需把所有的开发工具和项目都放在 WSL2 的文件系统下即可。得益于 WSL2 与 Windows 良好的集成性，可以直接通过资源管理器来查看和管理 WSL2 上的文件。

综上，按本文中的方案基本能够配置好平替 macOS 的软件开发环境。也期待 Microsoft 能把 WSL2 打磨得更好，例如优化 WSLg 的高分屏适配，让 WSL2 能够做到开箱即用。