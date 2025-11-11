# 前言

## 1. 两种 UI 开发范式的对比

在大学中第一次开始学习 Web 前端开发时，都会写过这样的代码：

```HTML
<div id="counter">
  <p id="count">0</p>
  <button id="increment">Increment</button>
</div>

<script>
  let count = 0;
  const countDisplay = document.getElementById('count');
  const incrementButton = document.getElementById('increment');

  incrementButton.addEventListener('click', () => {
    count += 1;
    countDisplay.textContent = count;
  });
</script>
```

上半部分的 HTML 标签定义 UI 结构，在下面的 JavaScript 脚本中处理按钮点击事件、更新计数器的值，并手动更新 DOM。

一开始学习 Android 开发时，先学习到的也是类似的写法。首先，用 XML 文件定义 UI 结构：

```XML
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="16dp">

    <TextView
        android:id="@+id/countText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="0"
        android:textSize="24sp" />

    <Button
        android:id="@+id/incrementButton"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Increment" />
</LinearLayout>
```

然后在 Activity 中手动处理 View 的引用和事件监听，在计数器值变化时手动更新 TextView 的内容：

```Kotlin
class MainActivity : AppCompatActivity() {
    private var count = 0
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val countText: TextView = findViewById(R.id.countText)
        val incrementButton: Button = findViewById(R.id.incrementButton)

        incrementButton.setOnClickListener {
            count++
            countText.text = count.toString()
        }
    }
}
```

像上面这种需要明确地指定构建和更新界面的每一步操作，详细描述界面如何从一个状态转换到另一个状态的 UI 开发范式，通常称作**命令式 UI 开发**。这种 UI 开发范式具有如下特点：

- **逐步更新：** 需要明确地指示界面的每一步更新，并处理所有的状态变化和 DOM 操作。
- **详细控制：** 提供了对界面更新的详细控制，可以在需要时进行优化，但代码可能会变得冗长且难以维护。
- **复杂逻辑：** 随着应用规模的增大，状态管理和更新逻辑可能会变得非常复杂。

为了解决命令式 UI 开发在应用规模增大后容易发生的一系列问题，一种新的 UI 开发范式诞生了。于 2013 年由 Facebook 发布的 React 是推动这种范式普及的重要框架之一。使用 React 写一个上面的计数器示例，需要这样写：

```JavaScript
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

在这个示例中，只需要描述界面在不同状态（计数器的值）下的样子，React 会负责处理界面的更新和渲染。

Android 这边，Google 直到 2021 年才宣布其 UI 工具包 Jetpack Compose 可以开始用于生产。用它编写代码看起来是这样子的：

```Kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }

    Column(
        modifier = Modifier.padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = "$count", style = MaterialTheme.typography.h4)
        Button(onClick = { count++ }) {
            Text("Increment")
        }
    }
}
```

可以明显地看出使用 Jetpack Compose 时需要编写的代码行数相比传统的 XML View 要少不少。

这种专注于描述界面的最终状态，而无需明确指定如何一步步构建和更新界面的 UI 开发范式，通常称作**声明式 UI 开发**。它具有如下特点：

- **状态驱动：** 界面基于应用状态自动更新。只需关注状态的变化，界面会自动反映这些变化。
- **简洁明了：** 代码更为简洁，逻辑更为直观，因为只需描述界面的最终状态，而不必操心如何到达这个状态。
- **可组合性：** 组件化开发更容易实现，可以将 UI 划分为多个可重用的组件。

较新推出的 UI 框架大多使用的是这种范式，客户端上的例子有 iOS 的 SwiftUI、鸿蒙的 ArkUI 以及跨平台的 Flutter，前端上的例子也有 Vue 3、Svelte 等等。

## 2. 两种编程范式的对比

当下流行的编程语言常用的编程范式主要有面向对象编程（OOP）和函数式编程（FP）两种。其中，OOP 主要有以下特性：

- **对象和类：** 对象是数据和行为的封装，类是对象的蓝图。
- **封装：** 数据和行为被封装在对象内部，只通过对象的方法访问。
- **继承：** 类可以从另一个类继承属性和方法，促进代码重用。
- **多态：** 不同对象可以以统一的接口进行操作，具体行为由对象的实际类型决定。
- **状态和行为：** 对象的状态由其属性表示，行为由其方法表示。

命令式 UI 开发更倾向于使用 OOP，以类和对象来封装数据和行为，允许状态的直接修改和附带效应。这种方式能够提供强大的灵活性和控制力，但会使代码结构变得较为复杂。

另一种常用的编程范式 FP 则主要有以下特性：

- **纯函数：** 纯函数是指给定相同的输入永远会得到相同的输出，并且没有任何附带效应。
- **不可变性：** 数据一旦创建就不能被修改，所有的数据操作都会返回新的数据。
- **函数是一等公民：** 函数可以作为参数传递给其他函数，或者作为返回值返回。
- **高阶函数：** 高阶函数是指能够接受其他函数作为参数或返回其他函数的函数。
- **函数组合：** 通过组合小函数来构建复杂的功能。

声明式 UI 开发更倾向于使用 FP，使用纯函数来描述界面的状态和行为，通过生成新的状态（而不是修改现有状态）来实现状态的变化。这能够使代码更易读、更易测试和维护。

现代 UI 框架往往结合了这两种编程范式的优点。例如，Jetpack Compose 虽然主要是声明式的，但也允许在必要时使用 OOP 的特性，而 React 也支持通过类组件来实现 OOP 风格的开发（尽管函数组件更为普遍和推荐）。

## 3. 组合优于继承

有一条非常经典的设计原则经常被提到，即「组合优于继承」。这一理念强调通过对象组合而不是通过类继承来构建复杂的功能。对于这个理念，我们可以通过一个简单的示例来实际感受一下。

假设有一个 `Bird` 类和一个 `Penguin` 类，因为企鹅也是鸟类，所以 `Penguin` 继承自 `Bird` 类：

```Java
class Bird {
    public void fly() {
        System.out.println("Flying");
    }
}

class Penguin extends Bird {
    @Override
    public void fly() {
        // Penguins can't fly
        throw new UnsupportedOperationException();
    }
}
```

在这个例子中，企鹅不能飞，因此这种继承关系显然是不合适的。

通过组合的方式，可以定义一个 `FlyBehavior` 接口和两个具体实现类 `CanFly` 和 `NoFly`，并使 `Bird` 类包含一个 `FlyBehavior` 接口的示例，通过传递不同的飞行行为实现来创建具体的鸟类：

```Java
interface FlyBehavior {
    void fly();
}

class CanFly implements FlyBehavior {
    @Override
    public void fly() {
        System.out.println("Flying");
    }
}

class NoFly implements FlyBehavior {
    @Override
    public void fly() {
        System.out.println("Cannot fly");
    }
}

class Bird {
    private FlyBehavior flyBehavior;

    public Bird(FlyBehavior flyBehavior) {
        this.flyBehavior = flyBehavior;
    }

    public void performFly() {
        flyBehavior.fly();
    }
}

class Penguin extends Bird {
    public Penguin() {
        super(new NoFly());
    }
}
```

通过这种组合的方式，可以避免继承带来的紧耦合和复杂性问题，并能够更灵活地构建和扩展系统。Jetpack Compose 和 React 等声明式 UI 框架推荐的也是将一个大的页面拆分成由多个小组件组合（Compose）而成，能让开发者体验到这种开发方式的优点。

# 对比

本次对比 3 种流行的声明式 UI 框架，分别是由 Facebook 开发的前端 UI 框架 React、Google 开发的 Android UI 框架 Jetpack Compose 以及跨平台 UI 框架 Flutter。接下来的部分会使用这 3 种框架分别实现相同的、简易的功能，并对比不同框架的实现代码。

本文涉及到的全部源代码已在 GitHub 上开源，仓库地址为 https://github.com/AkatsukiRika/DeclarativeUI.git ，可克隆并运行 Demo 项目。

## 1. 组件的创建

创建一个最基本的，只展示一行文字的 UI 组件。

### React 实现

React 官方推荐使用函数式组件，通过 JSX，以直接在 JavaScript 代码中嵌入 HTML 的方式描述 UI：

```JavaScript
function ComponentCreation() {
  const style = {
    marginTop: "16px"
  }

  return (
    <div style={style}>Please select a type from the navigation bar to see effects.</div>
  )
}

export default ComponentCreation
```

### Compose 实现

Compose 也是使用函数式组件，并直接以 Kotlin DSL 描述 UI：

```Kotlin
@Composable
fun ComponentCreation() {
    Text(
        text = "Please select a type from the navigation bar to see effects.",
        modifier = Modifier.padding(all = 16.dp)
    )
}
```

### Flutter 实现

Flutter 使用的是类组件，无状态的 UI 组件需要实现 `StatelessWidget` 类，通过覆写 `build` 方法描述 UI：

```Dart
class ComponentCreation extends StatelessWidget {
  const ComponentCreation({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(8.0),
      child: Text('Please select a type from the navigation bar to see effects.'),
    );
  }
}
```

## 2. 条件渲染

根据入参的不同，展示不同的文字。

### React 实现

在 JSX 中使用大括号可以插入 JavaScript 语句，在 JavaScript 语句中使用小括号又可以插入 JSX 代码。以下是用三目运算符实现条件渲染的示例：

```JavaScript
function ConditionalRender({ condition }) {
  return (
    <div>
      {condition ? (
        <p>This component is rendered with condition "true".</p>
      ) : (
        <p>This component is rendered with condition "false".</p>
      )}
    </div>
  );
}

export default ConditionalRender
```

### Compose 实现

Kotlin 没有三目运算符，但是在 Compose 中可以直接无缝衔接 UI 组件和代码逻辑：

```Kotlin
@Composable
fun ConditionalRender(condition: Boolean) {
    if (condition) {
        Text(
            text = "This component is rendered with condition \"true\".",
            modifier = Modifier.padding(all = 16.dp)
        )
    } else {
        Text(
            text = "This component is rendered with condition \"false\".",
            modifier = Modifier.padding(all = 16.dp)
        )
    }
}
```

### Flutter 实现

Flutter 中的 UI 组件都以类的形式封装，需要通过在 `build` 方法中返回的方式创建 UI 组件：

```Dart
class ConditionalRender extends StatelessWidget {
  final bool condition;

  const ConditionalRender({super.key, required this.condition});

  @override
  Widget build(BuildContext context) {
    final text = condition ? 'This component is rendered with condition "true".' : 'This component is rendered with condition "false".';
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Text(text),
    );
  }
}
```

## 3. 传递参数

从父组件传递参数给子组件，子组件根据父组件传递来的不同参数渲染不同的内容。

### React 实现

React 是函数式的，直接通过函数的参数进行传递即可：

```JavaScript
function ParameterDrilling({data}) {
  const style = {
    marginTop: "16px"
  }
  return (
    <div style={style}>This component received data of: {data}</div>
  )
}

export default ParameterDrilling
```

### Compose 实现

Compose 也是相同的实现方式，通过函数传参：

```Kotlin
@Composable
fun ParameterDrilling(data: Int) {
    Text(
        text = "This component received data of: $data",
        modifier = Modifier.padding(all = 16.dp)
    )
}
```

### Flutter 实现

Flutter 则需要通过类的构造方法来实现参数的传递：

```Dart
class ParameterDrilling extends StatelessWidget {
  final int data;

  const ParameterDrilling({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Text('This component received data of: $data'),
    );
  }
}
```

## 4. 定义状态并处理交互

### React 实现

在 React 中，通常通过一种名叫 Hooks 的内置函数定义组件内部状态（States）的 Setter 和 Getter，并在 JSX 中绑定具体的值与事件。例如，对于简单的按钮点击事件，可以这样处理：

```JavaScript
import { useState } from "react"

function EventHandling() {
  const [clicked, setClicked] = useState(false)
  const style = {
    marginTop: "16px"
  }

  return (
    <button style={style} onClick={() => setClicked(true)}>
      {clicked ? "Button clicked" : "Click me"}
    </button>
  )
}

export default EventHandling
```

对于复杂一点的文本框输入，也是类似的做法：

```JavaScript
import { useState } from "react"

function UserInputHandling() {
  const [text, setText] = useState("")
  const style = {
    marginTop: "16px"
  }

  return (
    <input
      type="text"
      value={text}
      style={style}
      onChange={(e) => setText(e.target.value)}
      placeholder="Enter text"
    />
  )
}

export default UserInputHandling
```

### Compose 实现

在 Compose 中会使用 Kotlin 的委托函数来定义状态，使用状态变量的方式与使用普通变量完全相同。例如，对于按钮点击事件：

```Kotlin
@Composable
fun EventHandling() {
    var clicked by remember { mutableStateOf(false) }

    Button(
        onClick = { clicked = true },
        modifier = Modifier.padding(16.dp)
    ) {
        Text(if (clicked) "Button clicked" else "Click me")
    }
}
```

对于文本框输入也是大同小异的：

```Kotlin
@Composable
fun UserInputHandling() {
    var text by remember { mutableStateOf("") }

    TextField(
        value = text,
        onValueChange = { newText -> text = newText },
        label = { Text("Enter text") },
        modifier = Modifier.padding(16.dp)
    )
}
```

### Flutter 实现

对于这种有状态的组件，在 Flutter 中需要通过继承 `StatefulWidget` 类来创建，并覆写该类的 `createState` 方法创建一个 `State` 类。在 `State` 类的 `build` 方法中可以定义 UI，并通过调用 `setState` 修改该类成员变量的方式来刷新组件的内部状态，触发 UI 界面的变动：

```Dart
class EventHandling extends StatefulWidget {
  const EventHandling({super.key});

  @override
  State<StatefulWidget> createState() => _EventHandlingState();
}

class _EventHandlingState extends State<EventHandling> {
  bool isClicked = false;

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      onPressed: () => setState(() => isClicked = true),
      child: Text(isClicked ? "Button clicked" : "Click me"),
    );
  }
}
```

对于文本框等复杂一点的组件，Flutter 有二次封装 `TextEditingController` 等类，直接与对应的 UI 组件绑定上就可以使用了：

```Dart
class UserInputHandling extends StatefulWidget {
  const UserInputHandling({super.key});

  @override
  State<StatefulWidget> createState() => _UserInputHandlingState();
}

class _UserInputHandlingState extends State<UserInputHandling> {
  late final _controller = TextEditingController(text: "");

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: TextField(
        controller: _controller,
        decoration: const InputDecoration(labelText: 'Enter text'),
      ),
    );
  }
}
```

## 5. 列表和循环

通过编程语言中的循环结构遍历 List、Map 等数据结构，渲染成常见的可滚动长列表展示到界面上。在声明式 UI 框架中，对于每个列表项都会自动（或手动）分配 Key 以减少变更时不必要的刷新，提高性能。

### React 实现

得益于 JavaScript 支持不少函数式的列表操作 API，在 JSX 中由列表生成 HTML 代码比较便利：

```JavaScript
function ListAndLooping({items}) {
  return (
    <ul>
      {items.map((person) => (
        <li key={person.id}>
          Name: {person.name}, Age: {person.age}
        </li>
      ))}
    </ul>
  )
}

export default ListAndLooping
```

### Compose 实现

对于在 Android XML 开发中要使用到 RecyclerView 的此类场景，Compose 提供了 `LazyRow`、`LazyColumn` 等专用组件：

```Kotlin
@Composable
fun ListAndLooping(items: List<Person>) {
    LazyColumn(modifier = Modifier.padding(16.dp)) {
        items(items, key = { person -> person.id }) { person ->
            Text("Name: ${person.name}, Age: ${person.age}")
        }
    }
}

data class Person(val name: String, val age: Int, val id: String)
```

### Flutter 实现

Flutter 也是提供了 `ListView` 组件用于从列表生成 UI，只是用法更接近 OOP 的模式：

```Dart
class Person {
  final String name;
  final int age;
  final String id;

  Person({required this.name, required this.age, required this.id});
}

class ListAndLooping extends StatelessWidget {
  final List<Person> items;

  const ListAndLooping({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      itemCount: items.length,
      itemBuilder: (context, index) {
        final person = items[index];
        return ListTile(
          key: Key(person.id),
          title: Text('Name: ${person.name}, Age: ${person.age}'),
        );
      },
    );
  }
}
```

## 6. 插槽（Slots）

插槽是体现组合思想的一种开发技术，指的是在组件中空出一个「插槽」以插入其他 UI 代码片段。

### React 实现

在 JavaScript 中函数是一等公民，而 React 的组件也是一个个函数。因此，插槽直接通过函数传参就能实现：

```JavaScript
function Slots({header, content}) {
  return (
    <div>
      {header}
      {content}
    </div>
  )
}

export default Slots
```

### Compose 实现

Compose 也一样可以通过函数传参实现插槽。这种创建 Compose UI 的函数参数要加上 `@Composable` 注解：

```Kotlin
@Composable
fun Slots(
    header: @Composable () -> Unit,
    content: @Composable () -> Unit
) {
    Column(modifier = Modifier.padding(16.dp)) {
        header()
        content()
    }
}
```

### Flutter 实现

Flutter 中所有的 UI 组件都是 `Widget` 类的子类，创建插槽就是在一个组件类中填入其他组件类的实例：

```Dart
class Slots extends StatelessWidget {
  final Widget header;
  final Widget content;

  const Slots({super.key, required this.header, required this.content});

  @override
  Widget build(BuildContext context) {
    return Column(children: [header, content]);
  }
}
```

## 7. 样式

编写样式是在 UI 开发中很重要的一环，编写组件样式的便利程度有时对开发效率有着决定性的影响。

### React 实现

Web 上的样式当然可以使用 CSS 文件实现，但在 React 中也可以通过使用 JavaScript 对象来封装样式：

```JavaScript
function Styles() {
  const style = {
    padding: "16px",
    backgroundColor: "blue",
    color: "white",
    marginTop: "16px"
  }

  return <div style={style}>Styles Demonstration</div>
}

export default Styles
```

### Compose 实现

Compose 中使用的是 `Modifier` 的链式调用来为一个组件添加样式，调用顺序非常重要：

```Kotlin
@Composable
fun Styles() {
    Text(
        "Hello, World!",
        modifier = Modifier
            .background(Color.Blue)
            .padding(16.dp),
        color = Color.White
    )
}
```

### Flutter 实现

Flutter 在样式方面使用的是对象嵌套的形式，例如要为某个组件增加外边距就需要为它嵌套一个 `Padding` 组件。`Container` 等组件相当于封装了一部分样式组件，可以将这些样式的值通过参数直接传入，减少嵌套层数：

```Dart
class Styles extends StatelessWidget {
  const Styles({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Container(
        padding: const EdgeInsets.all(16.0),
        color: Colors.blue,
        child: const Text('Hello, World!', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
```

## 8. 作用域数据传播（Scoped Data Propagation）

作用域数据传播是一种更高效的数据共享方式，用于在子树的多个层级之间方便地传递数据，而无需显式地通过每个中间组件传递。

### React 实现

React 中通过 `Context` 提供了一个局部的全局作用域，并配有相应的 Hooks：

```JavaScript
import { createContext, useContext } from "react"

const CustomContext = createContext()

export function DataPropagation({data}) {
  return (
    <CustomContext.Provider value={data}>
      <Intermediate />
    </CustomContext.Provider>
  )
}

function Intermediate() {
  return <Child />;
}

function Child() {
  const data = useContext(CustomContext);
  return <p>Received data: {data}</p>;
}
```

### Compose 实现

Compose 也提供了实现这个功能的 API，这个 API 就是 `CompositionLocal`，并通过 Kotlin 的中缀函数提升了使用的便利性：

```Kotlin
val LocalData = compositionLocalOf { "Default data" }

@Composable
fun DataPropagation(data: String) {
    CompositionLocalProvider(LocalData provides data) {
        Intermediate()
    }
}

@Composable
fun Intermediate() {
    Child()
}

@Composable
fun Child() {
    val data = LocalData.current
    Text(
        text = "Received data: $data",
        modifier = Modifier.padding(16.dp)
    )
}
```

### Flutter 实现

Flutter 中则是需要通过继承 `InheritedWidget` 实现同样的功能，相比于其他两个框架需要编写更多的模版代码：

```Dart
class CustomInheritedWidget extends InheritedWidget {
  final String data;

  const CustomInheritedWidget({super.key, required super.child, required this.data});

  @override
  bool updateShouldNotify(CustomInheritedWidget oldWidget) {
    return oldWidget.data != data;
  }

  static CustomInheritedWidget of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<CustomInheritedWidget>()!;
  }
}

class DataPropagation extends StatelessWidget {
  final String data;

  const DataPropagation({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return CustomInheritedWidget(
      data: data,
      child: const Intermediate()
    );
  }
}

class Intermediate extends StatelessWidget {
  const Intermediate({super.key});

  @override
  Widget build(BuildContext context) {
    return const Child();
  }
}

class Child extends StatelessWidget {
  const Child({super.key});

  @override
  Widget build(BuildContext context) {
    final data = CustomInheritedWidget.of(context).data;
    return Text("Received data: $data");
  }
}
```

## 9. 附带效应（Side Effects）

在「前言 - 两种编程范式的对比」一节中有讲到纯函数的概念，附带效应则是指在函数执行过程中，对外部状态或系统产生的影响（这些影响会令函数变得不「纯」）。由于声明式 UI 框架大多需要保证生成 UI 的函数是纯函数（因为它的调用次数、调用时机不确定），这些框架都会提供专门的附带效应 API，以使开发者有办法执行网络请求、打印日志等独立于 UI 的操作。

### React 实现

React 中使用 `useEffect` 即可管理附带效应。要注意的是，React 默认采用严格模式，会通过在开发模式下触发额外的渲染和初始化行为来帮助开发者发现一些潜在的问题。因此，这段代码中的 `alert` 会触发两次：

```JavaScript
import { useEffect } from "react"

function SideEffects() {
  useEffect(() => {
    setTimeout(() => {
      alert("Side effect triggered!")
    }, 1500)
  }, [])
  const style = {
    marginTop: "16px"
  }

  return <div style={style}>
    Side effect will be triggered after 1500ms.
  </div>
}

export default SideEffects
```

### Compose 实现

Compose 中起同样作用的函数则是 `LaunchedEffect`，它会开启一个协程，并在每次传入的 `key` 参数改变时取消当前协程，并再次执行新的协程。因此，它还可以用于执行一些响应式的逻辑：

```Kotlin
@Composable
fun SideEffects() {
    val context = LocalContext.current
    LaunchedEffect(key1 = Unit) {
        delay(1500)
        Toast.makeText(context, "Side effect triggered", Toast.LENGTH_SHORT).show()
    }

    Text(
        text = "Side effect will be triggered after 1500ms.",
        modifier = Modifier.padding(16.dp)
    )
}
```

### Flutter 实现

Flutter 在这方面更接近于 Android 传统的 Activity、Fragment 开发方式，为每一个 `Widget` 都定义了一些生命周期方法，可以覆写这些方法来执行一些与 UI 无关的初始化操作：

```Dart
class SideEffects extends StatefulWidget {
  const SideEffects({super.key});

  @override
  State<StatefulWidget> createState() => _SideEffectsState();
}

class _SideEffectsState extends State<SideEffects> {
  @override
  void initState() {
    super.initState();
    triggerSideEffect();
  }

  void triggerSideEffect() async {
    await Future.delayed(const Duration(milliseconds: 1500));
    if (mounted) {
      showToast('Side effect triggered!', context: context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(8.0),
      child: Text('Side effect will be triggered after 1500ms.'),
    );
  }
}
```

# 总结

通过从 9 个方面对比 React、Compose 和 Flutter 三种声明式 UI 框架的实现，能够方便从其中的一种框架迁移至其他两种，缩短学习进程；也可以通过对比学习，加深对函数式编程及声明式 UI 开发模式的理解。

本文中的对比只涉及到了表层的方面，对于框架代码的底层实现、性能调优等方面没有深入探究。基于这些框架，也有不少更进阶的开发技术（如 Android 的 MVI 架构、React 的 Redux 等）等待我们去精进学习。

此外，本文在编写过程中参考了以下内容，可作为扩展阅读：

- Compare Declarative UI Frameworks: https://www.jetpackcompose.app/compare-declarative-frameworks

- 组合优于继承: https://cloud.tencent.com/developer/article/1838005