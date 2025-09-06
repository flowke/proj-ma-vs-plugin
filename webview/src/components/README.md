# MoreDropdown 组件使用指南

## 组件概述

`MoreDropdown` 是一个通用的更多选项下拉菜单组件，提供统一的样式控制和灵活的配置选项。

## 基本用法

```tsx
import { MoreDropdown } from './components';

<MoreDropdown
  items={[
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => handleDelete(),
    }
  ]}
/>
```

## 统一样式控制

### 1. 修改默认样式

在 `MoreDropdown.scss` 文件中，您可以统一控制所有下拉菜单的样式：

```scss
/* 统一控制item的padding */
:root {
  --more-dropdown-item-padding: 8px 16px; /* 修改这里可以统一调整所有菜单项的padding */
  --more-dropdown-item-font-size: 13px;   /* 统一调整字体大小 */
  --more-dropdown-icon-margin: 10px;      /* 统一调整图标间距 */
}
```

### 2. 使用预设模式

组件提供三种预设模式：

```tsx
{/* 默认模式 */}
<MoreDropdown menuMode="default" items={items} />

{/* 紧凑模式 - 更小的padding和字体 */}
<MoreDropdown menuMode="compact" items={items} />

{/* 宽松模式 - 更大的padding和字体 */}
<MoreDropdown menuMode="spacious" items={items} />
```

### 3. 自定义样式类

```tsx
<MoreDropdown 
  menuClassName="custom-dropdown"
  items={items} 
/>
```

然后在CSS中定义：

```scss
.more-dropdown-menu.custom-dropdown {
  .ant-dropdown-menu-item {
    padding: 12px 20px !important;
    border-radius: 4px !important;
  }
}
```

## 组件Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| items | MenuProps['items'] | - | 菜单项配置 |
| placement | string | 'bottomRight' | 下拉菜单位置 |
| trigger | array | ['click'] | 触发方式 |
| title | string | '更多操作' | 按钮提示文字 |
| disabled | boolean | false | 是否禁用 |
| menuMode | string | 'default' | 菜单样式模式 |
| menuClassName | string | - | 额外的菜单CSS类名 |
| buttonStyle | CSSProperties | - | 自定义按钮样式 |
| iconStyle | CSSProperties | - | 自定义图标样式 |
| dropdownStyle | CSSProperties | - | 自定义下拉菜单样式 |

## 常见样式定制

### 1. 全局调整所有下拉菜单的padding

修改 `MoreDropdown.scss` 中的：

```scss
.more-dropdown-menu {
  .ant-dropdown-menu-item {
    padding: 你的自定义值 !important;
  }
}
```

### 2. 调整危险操作的颜色

```scss
.more-dropdown-menu {
  .ant-dropdown-menu-item-danger {
    color: var(--vscode-errorForeground) !important;
    
    &:hover {
      background-color: var(--vscode-list-errorForeground) !important;
    }
  }
}
```

### 3. 调整分割线样式

```scss
.more-dropdown-menu {
  .ant-dropdown-menu-item-divider {
    background-color: var(--vscode-menu-separatorBackground) !important;
    margin: 4px 0 !important; /* 调整分割线上下间距 */
  }
}
```

## 使用示例

### Home.tsx 中的使用

```tsx
<MoreDropdown
  items={[
    {
      key: 'refresh',
      icon: <ReloadOutlined />,
      label: '刷新目录',
      onClick: () => handleRefresh(),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除目录',
      danger: true,
      onClick: () => handleDelete(),
    },
  ]}
/>
```

### Bookmarks.tsx 中的使用

```tsx
<MoreDropdown
  items={[
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制链接',
      onClick: () => handleCopy(),
    },
    {
      key: 'reparse',
      icon: <ReloadOutlined />,
      label: '重新解析',
      onClick: () => handleReparse(),
    },
  ]}
  menuMode="compact" // 使用紧凑模式
/>
```

现在您可以通过修改 `MoreDropdown.scss` 文件来统一控制整个应用中所有下拉菜单的样式！
