# SCSS 样式架构

本项目已配置支持 SCSS，提供了一套完整的样式架构和工具类。

## 📁 文件结构

```
src/styles/
├── _variables.scss    # 变量定义
├── _mixins.scss      # 混入集合
├── components.scss   # 组件样式
└── README.md        # 使用说明
```

## 🎨 主要特性

### 1. 变量系统
- 颜色变量：基于 VS Code 主题 CSS 变量
- 尺寸变量：间距、字体大小、圆角等
- 动画变量：过渡时间定义

### 2. 混入（Mixins）
- `@include button-base` - 基础按钮样式
- `@include flex-center` - 居中布局
- `@include flex-between` - 两端对齐布局
- `@include text-ellipsis` - 文本省略
- `@include focus-ring` - 焦点样式
- `@include card-style` - 卡片样式
- `@include icon-button` - 图标按钮样式

### 3. 响应式断点
- `@include mobile-only` - 仅移动设备
- `@include tablet-up` - 平板及以上
- `@include desktop-up` - 桌面及以上

### 4. 工具类
- **布局**: `.flex-center`, `.flex-between`
- **文本**: `.text-truncate`, `.text-xs` ~ `.text-xl`
- **间距**: `.p-xs` ~ `.p-xl`, `.m-xs` ~ `.m-xl`
- **组件**: `.card`, `.icon-btn`, `.list-item`

## 🚀 使用示例

### 在组件中使用 SCSS

```scss
// 使用变量
.my-component {
  padding: $spacing-md;
  border-radius: $border-radius;
  color: $primary-color;
}

// 使用混入
.my-button {
  @include button-base;
  @include flex-center;
}

// 使用嵌套和父选择器
.project-item {
  @include list-item;
  
  &__name {
    @include text-ellipsis;
    color: var(--vscode-foreground);
    
    &:hover {
      color: var(--vscode-textLink-foreground);
    }
  }
  
  &--active {
    background-color: var(--vscode-list-activeSelectionBackground);
  }
}
```

### 响应式设计

```scss
.sidebar {
  width: 300px;
  
  @include mobile-only {
    width: 100%;
  }
  
  @include tablet-up {
    width: 250px;
  }
}
```

### VS Code 主题适配

```scss
.custom-input {
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  color: var(--vscode-input-foreground);
  
  &:focus {
    border-color: var(--vscode-focusBorder);
    @include focus-ring;
  }
  
  &::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }
}
```

## 🛠️ 添加新样式

### 添加新变量
在 `_variables.scss` 中添加：

```scss
// 新的颜色变量
$info-color: var(--vscode-editorInfo-foreground);

// 新的尺寸变量
$header-height: 48px;
```

### 添加新混入
在 `_mixins.scss` 中添加：

```scss
@mixin my-custom-mixin($param: default) {
  // 混入内容
  color: $param;
}
```

### 添加组件样式
在 `components.scss` 中添加：

```scss
.my-new-component {
  // 使用 BEM 命名约定
  &__element {
    // 元素样式
  }
  
  &--modifier {
    // 修饰符样式
  }
}
```

## 📝 最佳实践

1. **使用变量**: 优先使用预定义的变量而不是硬编码值
2. **BEM 命名**: 使用块-元素-修饰符命名约定
3. **混入优先**: 常用样式封装为混入以便复用
4. **嵌套层级**: 避免超过 3-4 层的嵌套
5. **VS Code 兼容**: 使用 VS Code 主题变量确保主题适配

## 🔧 构建说明

SCSS 文件会自动编译为 CSS 并输出到 `../media/webview/assets/index.css`。Vite 会自动处理 SCSS 编译，无需额外配置。
