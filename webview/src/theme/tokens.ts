/**
 * 设计系统 - 设计令牌 (Design Tokens)
 * 统一管理所有设计相关的常量值
 */

// 透明度令牌
export const opacity = {
  hover: 0.9,
  drag: 0.8, 
  ghost: 0.3,
  placeholder: 0.8,
  disabled: 0.5,
} as const;

// 间距令牌
export const spacing = {
  xs: 4,
  sm: 8, 
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// 字体大小令牌
export const fontSize = {
  xs: 11,
  sm: 12,
  md: 13,
  lg: 14,
  xl: 16,
} as const;

// 字体权重令牌
export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// 阴影令牌
export const shadow = {
  dropdown: '0 4px 12px rgba(0, 0, 0, 0.3)',
  drag: '0 4px 12px rgba(0, 0, 0, 0.3)',
  modal: '0 8px 24px rgba(0, 0, 0, 0.2)',
  none: 'none',
} as const;

// 层级令牌
export const zIndex = {
  dropdown: 1000,
  modal: 1050,
  tooltip: 1100,
  drag: 1000,
} as const;

// 过渡动画令牌
export const transition = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
  height: '0.2s ease-in-out',
  none: 'none',
} as const;

// 变换效果令牌
export const transform = {
  dragRotate: 'rotate(2deg)',
  none: 'none',
} as const;

// 光标样式令牌
export const cursor = {
  grab: 'grab',
  grabbing: 'grabbing', 
  pointer: 'pointer',
  default: 'default',
  notAllowed: 'not-allowed',
} as const;

// 尺寸令牌
export const size = {
  iconSm: 12,
  iconMd: 20,
  iconLg: 24,
  borderRadius: 4,
  borderRadiusSm: 2,
  borderRadiusLg: 6,
} as const;

// 边框令牌
export const border = {
  width: 1,
  widthThick: 2,
  none: 0,
} as const;

// VS Code 主题变量映射
export const vscodeColors = {
  // 基础颜色
  primary: 'var(--vscode-button-background)',
  secondary: 'var(--vscode-button-secondaryBackground)',
  foreground: 'var(--vscode-foreground)',
  background: 'var(--vscode-sideBar-background)',
  editorBackground: 'var(--vscode-editor-background)',
  
  // 输入控件
  inputBackground: 'var(--vscode-input-background)',
  inputBorder: 'var(--vscode-input-border)',
  inputForeground: 'var(--vscode-input-foreground)',
  inputPlaceholder: 'var(--vscode-input-placeholderForeground)',
  
  // 交互状态
  hoverBackground: 'var(--vscode-list-hoverBackground)',
  activeBackground: 'var(--vscode-list-activeSelectionBackground)',
  activeForeground: 'var(--vscode-list-activeSelectionForeground)',
  focusBorder: 'var(--vscode-focusBorder)',
  
  // 按钮
  buttonBackground: 'var(--vscode-button-background)',
  buttonForeground: 'var(--vscode-button-foreground)',
  buttonBorder: 'var(--vscode-button-border)',
  buttonSecondaryBackground: 'var(--vscode-button-secondaryBackground)',
  buttonSecondaryForeground: 'var(--vscode-button-secondaryForeground)',
  
  // 下拉菜单
  dropdownBackground: 'var(--vscode-dropdown-background)',
  dropdownBorder: 'var(--vscode-dropdown-border)',
  dropdownForeground: 'var(--vscode-dropdown-foreground)',
  
  // 状态颜色
  errorForeground: 'var(--vscode-errorForeground)',
  errorBackground: 'var(--vscode-list-errorHoverBackground)',
  warningForeground: 'var(--vscode-editorWarning-foreground)',
  successForeground: 'var(--vscode-gitDecoration-addedResourceForeground)',
  disabledForeground: 'var(--vscode-disabledForeground)',
  
  // 分割线和边框
  separator: 'var(--vscode-menu-separatorBackground)',
  panelBorder: 'var(--vscode-panel-border)',
  
  // 描述文字
  descriptionForeground: 'var(--vscode-descriptionForeground)',
} as const;

// 组合令牌 - 常用的样式组合
export const combineTokens = {
  // 拖拽样式
  dragItem: {
    opacity: opacity.drag,
    boxShadow: shadow.drag,
    transform: transform.dragRotate,
    zIndex: zIndex.drag,
    cursor: cursor.grabbing,
  },
  
  // 幽灵样式
  ghostItem: {
    opacity: opacity.ghost,
  },
  
  // 悬停样式
  hoverItem: {
    opacity: opacity.hover,
    cursor: cursor.pointer,
  },
  
  // 模态框样式
  modal: {
    background: vscodeColors.editorBackground,
    boxShadow: shadow.modal,
    zIndex: zIndex.modal,
  },
  
  // 下拉菜单样式
  dropdown: {
    background: vscodeColors.dropdownBackground,
    border: `${border.width}px solid ${vscodeColors.dropdownBorder}`,
    boxShadow: shadow.dropdown,
    zIndex: zIndex.dropdown,
  },
} as const;

// 类型定义
export type OpacityToken = keyof typeof opacity;
export type SpacingToken = keyof typeof spacing;
export type FontSizeToken = keyof typeof fontSize;
export type ShadowToken = keyof typeof shadow;
export type ZIndexToken = keyof typeof zIndex;
export type TransitionToken = keyof typeof transition;
export type VSCodeColorToken = keyof typeof vscodeColors;
