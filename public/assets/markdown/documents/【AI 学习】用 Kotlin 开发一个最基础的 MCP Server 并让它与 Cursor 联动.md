# 前言

进入 2025 年后，在我的日常工作流里 AI 的使用率显著上升，使用的 AI 工具和用法也在逐步迭代。从一开始仅使用网页版的 ChatGPT / Claude 编写工具类代码，到在 Android Studio 里接入 GitHub Copilot 插件进行代码补全，再到可以独立完成功能开发的 Cursor 和最近流行的 CLI Agent，我一直在使用模型本身及 Cursor 等平台提供的工具，并没有真正研究过具体如何让模型与文件系统和代码库交互。

在今天这篇文档中，我将会通过编写一个 MCP Server 并在 Cursor 中实际调用它的方式，了解 LLM 如何与「现实世界」进行交互，以及我们应该如何封装工具给 LLM 调用，以最大限度为日常工作提效。

# 核心概念

## 1.  MCP
MCP，全称 Model Context Protocol，中文翻译为模型上下文协议，是一套用于定义 **LLM / 客户端** 与 **外部「服务端（Server）」**之间交互方式的标准协议。支持发现与调用工具（Tools）、浏览资源（Resources）、订阅事件（Prompts / Notifications）等，目标是让 AI 客户端以统一方式接入系统能力。
## 2. 传输层
常见为 stdio（本地进程）、SSE（服务端推送）、WebSocket。后续的 Demo 会采用 stdio 方式，便于在本地通过 **JSON-RPC 2.0 + LSP 风格头**交互。
## 3. JSON-RPC 报文
采用 `Content-Length: <n>\r\n\r\n + JSON 体` 的 framing。请求包含 id、method、params，响应包含 id 对应的 result 或 error。
## 4. initialize
客户端启动后首先调用，服务端返回 protocolVersion、serverInfo、capabilities，用于声明支持哪些能力（如 tools）。
## 5. tools
服务端对外暴露的一组可调用操作。客户端可通过 `tools/list` 枚举工具，随后通过 `tools/call` 调用具体工具并获取结构化结果。
# 环境配置

MCP 官方提供了 TypeScript、Python 等多种语言的 SDK，这其中也包含 Kotlin。作为一名 Android 开发者，我将基于 [MCP Kotlin SDK](https://github.com/modelcontextprotocol/kotlin-sdk) 来开发这个项目，使用的 IDE 则是 IntelliJ IDEA Community。

首先，创建一个 Kotlin 项目，Build System 选择 Gradle，JDK 版本这里我选择的是 17，Gradle DSL 选择的是 Groovy 语言（当然，也可以选择更现代化的 Kotlin DSL）：

![](https://oyw344o0ub.feishu.cn/space/api/box/stream/download/asynccode/?code=ZGI1OGM0NDEzNTRlOGIxYTM4OGQzNjRhYmFhMWVmYjlfazF4RzhlMHRsTEpOdnNWTVFiZ0xuTlh2TTh5VjZ1aDJfVG9rZW46UmxhbGJoSk5Ub25PYnd4Q3lZaGNMS0Y1bldiXzE3NTQ4OTk1NTg6MTc1NDkwMzE1OF9WNA)

创建好项目之后，在 build.gradle 里先添加好 SDK 的依赖并加上 application 块，方便后续打二进制包供 MCP 客户端使用：

```Groovy
dependencies {
    implementation "io.modelcontextprotocol:kotlin-sdk:0.6.0"
}

application {
    mainClass = 'com.tangping.MainKt'
}
```

本次开发的 MCP 服务器将使用 stdio 与客户端通信，没法像普通 Web API 一样通过 Postman 测试，因此需要安装一个叫 MCP Inspector 的工具。这个工具需要用 npm 安装，提供了 Web 界面，能够很直观地测试 MCP 服务器的功能。本地安装了 npm 后，通过如下命令即可安装它：

```Bash
npm install -g @modelcontextprotocol/inspector
```

# 功能开发

我们将开发一个根据用户名来问好的简单工具，以演示 MCP Server 最基础的用法。首先，在 main 函数里定义一个 Server 对象，capabilities 参数中需要加上对 tools 的支持：

```Kotlin
val server = Server(
    serverInfo = Implementation(
        name = "MCPServerDemoKt",
        version = "1.0.0"
    ),
    options = ServerOptions(
        capabilities = ServerCapabilities(
            tools = ServerCapabilities.Tools(listChanged = true)
        )
    )
)
```

接下来为 Server 对象添加一个工具，并定义好工具的名称、描述以及入参：

```Kotlin
server.addTool(
    name = "hello",
    description = "A simple hello world tool",
    inputSchema = Tool.Input(
        properties = buildJsonObject {
            putJsonObject("name") {
                put("type", "string")
                put("description", "The name to greet")
            }
        },
        required = listOf("name")
    ),
    handler = ::handleHello
)
```

上面的 handler 参数指向如下的处理函数，此函数从 request 中解析出名为 name 的参数，并返回内容为 `Hello, $name` 的文本：

```Kotlin
private fun handleHello(request: CallToolRequest): CallToolResult {
    val name = request.arguments["name"]?.jsonPrimitive?.content ?: "World"
    return CallToolResult(
        content = listOf(TextContent(
            text = "Hello, $name!"
        ))
    )
}
```

指定通信方式为 stdio，再以阻塞方式启动服务器，业务代码就开发完毕了：

```Kotlin
val transport = StdioServerTransport(
    inputStream = System.`in`.asInput(),
    outputStream = System.out.asSink().buffered(),
)
runBlocking {
    server.connect(transport)
    val done = Job()
    server.onClose {
        done.complete()
    }
    println("MCP Server running...")
    done.join()
}
```

# 本地测试

用 IDE 运行一下编写好的程序，确认能看到 `MCP Server running...` 这行输出，就可以开始用 MCP Inspector 测试了。首先运行 `./gradlew installDist`，将编译产物和运行依赖打包到一个本地的可运行目录结构中（在这里对应 `build/install/项目名`）：

![](https://oyw344o0ub.feishu.cn/space/api/box/stream/download/asynccode/?code=YjI4OGUyZDc2ODQzMTczYzAzNGUwNzMwMzY3MDAxYWJfSW90OUtBREVpZzZuQkROem9nbWhaQVNscmhSamg2UFRfVG9rZW46RlB0S2JzbEUyb01odzN4MkhrbmNtVVNQblJlXzE3NTQ4OTk1NTg6MTc1NDkwMzE1OF9WNA)

然后复制 bin 下可执行文件的绝对路径，在终端中运行命令 `mcp-inspector <可执行文件的绝对路径>`，浏览器会自动打开：

![](https://oyw344o0ub.feishu.cn/space/api/box/stream/download/asynccode/?code=ZDQxNTc2ZTc1MjY3M2Q5ZWUyZjE0YWEyODc3NGQxNzBfeGhJMTU3cWI5T1NobXRYVEJQQVhJWk5pRlJIR0Q1Nk1fVG9rZW46TDdvNGJRT1lZb3BLSnR4VFIzemMwSHFrbjdmXzE3NTQ4OTk1NTg6MTc1NDkwMzE1OF9WNA)

点击 Connect 按钮，服务器会自动连接上，然后就可以在 Tools 窗口中测试之前写好的 hello 工具了：

![](https://oyw344o0ub.feishu.cn/space/api/box/stream/download/asynccode/?code=MmRkNzFhYjhhMmJiOGQzODM4NjU2NjlhNjhhZDY2NDRfekxCTzhHa2V5UVpJN01nc3JOQUx2Z1Bzc25XOGYwdDlfVG9rZW46SDQwemJ0UHFzb0lkQlV4SmQwR2NnS0J6bjFhXzE3NTQ4OTk1NTg6MTc1NDkwMzE1OF9WNA)

# 连接 Cursor

打开 Cursor，进入 Preferences > Cursor Settings > Tools & Integrations，点击 Add Custom MCP 按钮：

![](https://oyw344o0ub.feishu.cn/space/api/box/stream/download/asynccode/?code=Zjc5NDJlZjJmNDI5MDExOTNhNGRiYzU5YWJlY2M2NWZfVnZnSm5jaUxyUVdlMWpBZ2l0UkxXaHBMeXJqb0xaOFhfVG9rZW46VlNUZGJ2Q2Myb0JpMDR4QmlIcWN2UWMybkJjXzE3NTQ4OTk1NTg6MTc1NDkwMzE1OF9WNA)

用以下内容替换 mcp.json 文件的内容（command 处要填写上面获取到的绝对路径），然后回到 Cursor Settings 页面：

```JSON
{
  "mcpServers": {
    "mcp-server-demo-kt": {
      "command": "/Users/admin/Projects/MCPServerDemoKt/build/install/MCPServerDemoKt/bin/MCPServerDemoKt",
      "args": [],
      "env": {}
    }
  }
}
```

能看到我们编写的 hello 工具已经在 Cursor 可用 MCP 工具的列表中了：

![](https://oyw344o0ub.feishu.cn/space/api/box/stream/download/asynccode/?code=ZjUzNjg5N2VjZDBjYTM3NTQxMjlkNDBiNjZkZGJjOWFfM3BLdm1WNnhmeVRScWc3ZUkydWhUeGJtY3Q0Q0ZGT1RfVG9rZW46RDZnZ2JVd3ozb3FERWJ4SGszTGNMNlpBbnFmXzE3NTQ4OTk1NTg6MTc1NDkwMzE1OF9WNA)

接下来打开 Agent 模式，让 LLM 调用我们的工具，分别对三名用户问好：

![](https://oyw344o0ub.feishu.cn/space/api/box/stream/download/asynccode/?code=Y2ZmZGY0ZDZmMzA5MzYyNjNlZTZiMGVmN2M3MzI4MjlfWllZekE4T2I4NEVwOHNaUWxwWjhFUDdMMXU2NUt6MjNfVG9rZW46T2FEcGJFMFZHbzN1RWx4VXVvTWNFeVVKbmpjXzE3NTQ4OTk1NTg6MTc1NDkwMzE1OF9WNA)

可以看到大模型已经能够调用我们封装好的能力了。

# 参考内容

本篇文章只是用一个最简单的例子演示了 MCP Server 的开发与测试流程，实际上 MCP 的强大之处远不止于此。如果想继续学习更深入的知识，可以参考以下内容：

[【掘金】我用一个周末开发的 MCP 工具，让 Claude 帮我管理了整个项目](https://juejin.cn/post/7532287059374817323)

[【掘金】手把手教你构建自己的 MCP 服务器并把它连接到你的 Cursor](https://juejin.cn/post/7525726627960504383)

以下是 MCP 的官方中英文文档，内含多种语言的 SDK 说明，进行相关开发时若遇到问题推荐先查询官方文档：

[MCP 官方文档（英文）](https://modelcontextprotocol.io/docs/getting-started/intro)

[MCP 官方文档（中文）](https://mcplab.cc/zh/docs/getstarted)