# 躺平工具箱 (TangPing Tools)

## Information

| Key | Value |
| -- | -- |
| 兼容平台 | Android 7.0+ |
| 最新版本 | 1.0.0 |
| 界面语言 | 英语 |

## Introduction

使用 Jetpack Compose 开发的一款小工具，用于记忆面试八股文、外语单词等背诵 / 记忆型内容。相比于常用的 Anki 等软件，功能与界面更加简单，只有一些基本功能。

TangPing Tools 主要包含以下两种功能：

### 1. 记忆卡片制作

支持制作用户自定义的记忆卡组。每组记忆卡组能够存储多个问题，制作期间可一键保存至本应用的 cache 目录下，制作完成后支持删除、修改当前卡组。卡组保存至本地的格式为 JSON，也可以使用 Sublime Text 等其他编辑器查看及修改。

### 2. 记忆卡片背诵

每张记忆卡片会以添加到卡组中的 Unix 时间戳作为首次的到期时间（Due Time）。进入背诵页面后，你需要根据自己对当前卡片内容的熟悉程度，从陌生（Unfamiliar）、犹豫（Hesitated）和熟悉（Recalled）中选择一种。当前卡片的下一个到期时间会根据熟悉程度的不同而变动，变动规则如下：

| 熟悉程度 | 下一个到期时间 |
| -- | -- |
| Unfamiliar | 当前时间 + 1 分钟 |
| Hesitated | 当前时间 + 10 分钟 |
| Recalled | 当前时间 + 3 天 |

背诵卡组的来源，支持从「记忆卡片制作」中制作的卡组中读入，也支持输入 http 开头的 URL 来从远端载入 JSON 文件。远端载入的 JSON 文件在首次背诵后也会存入本地的 cache 目录下。

## Downloads

[Release 1.0.0](/assets/files/tptools-app-release.apk)