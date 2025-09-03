Proj MA
====

VS Code / Cursor 扩展，集成 React + Ant Design 的 Webview 面板。

开发
----

1. 运行 `npm install`
2. 运行 `npm run dev`（并行监听扩展与 Webview）
3. 打开 VS Code 调试面板，选择 "Run Extension" 启动扩展宿主

命令
----

- `Proj MA: 打开面板`（命令面板中执行）

目录结构
----

- `src/` 扩展源码
- `webview/` React + Vite Webview 前端
- `media/webview/` Webview 构建产物（由 Vite 输出）

发布
----

- `npm run build`，然后在 VS Code 扩展打包工具中打包为 `.vsix`

