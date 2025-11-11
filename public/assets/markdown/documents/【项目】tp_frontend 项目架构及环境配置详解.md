# 项目简介
`tp_frontend` 是一个使用 Flutter 搭建的 Web 项目，包含前端和服务端，支持在 macOS 和 Linux 平台上开发和部署，部署后的 Web 站点可通过任意现代化的主流浏览器访问。

# 项目架构
该项目的架构如下图所示：

![image](assets/images/documents/img_tpfe_1.png)

前端 UI 部分由 Flutter Web 实现，渲染在其 Canvas Kit 模式下。由于 Flutter 在 Web 平台不支持多线程，计算量较大的功能代码使用 NodeJS 开发，从 Dart 层调用编译后的 JavaScript 代码。

服务端部分同样使用 Dart 开发，数据库使用 MongoDB。Flutter 部分编译出 release 产物后，通过 nginx 将 `index.html` 开放给浏览器访问，同时还需要对 nginx 进行简单配置以支持 `assets` 目录下的静态资源访问。

# 环境配置

## 平台要求

由于开发、部署过程中涉及到 Shell 脚本的调用，本项目仅支持在 macOS 及 Linux 环境上运行，Windows 平台可使用 WSL。

IDE 推荐使用 Android Studio + Visual Studio Code，Android Studio 上安装 Flutter 插件，用于 Dart 前后端的开发，VSCode 则用于 NodeJS 和脚本代码的编写。也可仅使用 VSCode 配置插件完成全部开发任务。

## 环境安装

安装 Flutter SDK，可参考以下来自 Flutter CN 官方网站的教程：

- 在 macOS 上安装和配置 Flutter 开发环境: https://flutter.cn/docs/get-started/install/macos
- 在 Linux 上安装和配置 Flutter 开发环境: https://flutter.cn/docs/get-started/install/linux

IDE 使用 Android Studio 和 Visual Studio Code，浏览器使用 Google Chrome，可访问以下官方网站，免费下载：

- Android Studio (来自 Google): https://developer.android.com/studio?hl=zh-cn
- Visual Studio Code (来自 Microsoft): https://code.visualstudio.com/
- Google Chrome 浏览器: https://www.google.com/chrome/

安装必要的命令行工具，包括：

- git
- python3
- node
- nginx

这部分可直接通过包管理器安装（如 macOS 上的 brew 或 Ubuntu 上的 apt），`node` 推荐使用版本 18 及以上。

本项目采用 MongoDB 社区版，这是一种基于类 JSON 格式存储的 NoSQL 数据库，请参考如下官网教程进行安装及配置，推荐安装版本 7 及以上：

- Install MongoDB Community Edition on macOS: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/#std-label-install-mdb-community-macos
- Install MongoDB Community Edition on Linux: https://www.mongodb.com/docs/manual/administration/install-on-linux/

# 开始开发

## Flutter + Dart 前后端

> 确保 Flutter 环境变量配置正确，在终端中可以正确运行 `flutter` 和 `dart` 命令后再执行下列步骤。

本项目的 Dart 部分分为 Flutter Web 前端和 Dart 服务端两个模块。首先在项目根目录下执行 `flutter pub get` 来安装前端依赖，再进入到 `server` 目录下执行 `dart pub get` 安装服务端依赖。

确保 MongoDB 后台服务已开启后，进入 `server` 目录下执行 `dart main.dart` 命令即可开始运行服务端。

前端可使用 Android Studio 直接点击运行按钮，自动调用 Chrome 运行，也可通过如下命令启动 Web 服务器：

```shell
flutter run -d web-server --web-port=8080 --web-renderer canvaskit
```

## NodeJS

> 本项目中的 NodeJS 部分主要用于实现一些 Flutter Web 上无法简单支持的操作，如 Web Worker. 如果不需要更改 NodeJS 代码，可无需关注。

NodeJS 模块的路径位于根目录的 `web/javascript` 子目录下。其中，`dist` 目录下存放 Webpack 编译产物，由外层的 `index.html` 开放接口给 Dart 层调用。

若需要进行 NodeJS 开发，需先在 `web/javascript` 目录下执行 `npm install` 以安装依赖。更改完 `src` 目录下的代码后，运行 `npm run build` 重新生成 `dist` 目录下的编译产物。

# 部署上线

## Nginx 配置

安装好 nginx 后，需要进行一定配置以支持静态资源访问。对配置文件 `nginx.conf` 的更改如下所示：

```conf
http {
    server {
        listen          80;
        listen          [::]:80;
        server_name     _;
        index           index.html;
        # 编译产物 web 目录的路径
        root            /home/akari/web/;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # 支持静态资源访问
        location ~ ^/(.+)$ {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
            add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';

            if ($request_method = 'OPTIONS') {
                return 204;
            }
            try_files $uri $uri/ /index.html;
        }
    }
}
```

## 打包部署

确认 NodeJS 层的 `dist` 产物为最新后，即可运行一键式脚本，编译 Flutter Web 产物并将其推送至远端。在终端中切换至 `scripts` 目录，运行 `deploy.sh` 脚本即可。

Flutter Web 的编译产物直接使用 nginx 即可支持访问。Dart 服务端部分需要在服务端安装 Dart SDK，并使用 `nohup dart main.dart &` 命令后台运行。