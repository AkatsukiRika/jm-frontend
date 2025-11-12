# 服务端接口文档

## 基本信息

Base URL: `https://www.tang-ping.top`

交互格式：均为 `application/json`

body 外层返回格式：

| 参数名 | 类型 | 说明 |
| - | - | - |
| code | int | 成功：0，失败：1，无资格：2 |
| message | string | 成功返回 success，失败返回错误信息 |
| data | any | 每个接口自己的返回格式 |

## 用户登录

接口: `/api/login`

方法: `POST`

body 请求参数：

| 参数名 | 类型 | 说明 |
| - | - | - |
| username | string | 用户名 |
| password | string | 密码（明文） |

data 返回格式：

| 参数名 | 类型 | 说明 |
| - | - | - |
| token | string? | 成功时返回 JWT Token，失败时不返回 |