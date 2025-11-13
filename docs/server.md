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

## 问题卡片

### 文件列表

接口: `/api/list`

方法: `GET`

query 参数：无

data 返回格式：

| 参数名 | 类型 | 说明 |
| - | - | - |
| filenames | string[] | 文件名列表，每个文件都是 JSON 格式，里面存储了一套问题卡片 |

### 获取内容

接口: `/api/getContentByName/${fileName}`

方法: `GET`

URL 参数：

| 参数名 | 类型 | 说明 |
| - | - | - |
| fileName | string | 题组 JSON 文件名 |

query 参数：

| 参数名 | 类型 | 说明 |
| - | - | - |
| data_only | string | 为 true 时，body 只返回 data 内的内容，不返回外层；为 false 或其他值时正常返回 |

### 更新内容

接口: `/api/update`

方法: `POST`

body 请求参数：

| 参数名 | 类型 | 说明 |
| - | - | - |
| filename | string | 文件名 |
| content | map<string, any> | 问题卡片内容 |

content 内容格式：

```jsonc
{
  "question_deck": {
    "cards": [
      {
        "question": "问题文本",
        "answer": "答案文本",
        "due_time": 0   // 到期时间，毫秒时间戳
      }
    ]
  }
}
```

data 返回格式：无

### 删除文件

接口: `/api/remove`

方法: `POST`

body 请求参数：

| 参数名 | 类型 | 说明 |
| - | - | - |
| filename | string | 文件名 |

data 返回格式：无