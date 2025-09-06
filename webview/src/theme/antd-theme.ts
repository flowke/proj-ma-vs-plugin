/**
 * Ant Design 主题配置
 * 使用设计token统一管理主题
 */

import { ThemeConfig } from 'antd';
import { vscodeColors, fontSize, spacing, fontWeight, size, opacity, shadow, zIndex } from './tokens';

export const antdTheme: ThemeConfig = {
  token: {
    // 基础颜色
    colorPrimary: vscodeColors.primary,
    colorBgContainer: vscodeColors.background,
    colorText: vscodeColors.foreground,
    colorBorder: 'transparent',
    colorSplit: 'transparent',
    
    // 字体配置
    fontSize: fontSize.md,
    fontSizeIcon: fontSize.sm,
    fontWeightStrong: fontWeight.medium,
    
    // 边框圆角
    borderRadius: size.borderRadius,
    borderRadiusLG: size.borderRadiusLg,
    borderRadiusSM: size.borderRadiusSm,
    
    // 间距配置
    padding: spacing.md,
    paddingLG: spacing.lg,
    paddingSM: spacing.sm,
    paddingXS: spacing.xs,
    
    // 阴影配置
    boxShadow: shadow.none,
    boxShadowSecondary: shadow.dropdown,
  },
  
  components: {
    Layout: {
      colorBgContainer: vscodeColors.background,
    },
    
    Collapse: {
      headerBg: 'transparent',
      contentBg: 'transparent',
      borderRadiusLG: 0,
      headerPadding: `0 0 0 0`,
      contentPadding: `8px 0 8px`,
      colorBorder: 'transparent',
      colorText: vscodeColors.foreground,
      colorTextHeading: vscodeColors.foreground,
      fontSize: fontSize.md,
      fontSizeIcon: fontSize.sm,
    },
    
    List: {
      itemPadding: `${spacing.xs / 2}px 0`,
    },
    
    Input: {
      colorBgContainer: vscodeColors.inputBackground,
      colorBorder: vscodeColors.inputBorder,
      colorText: vscodeColors.inputForeground,
      colorTextPlaceholder: vscodeColors.inputPlaceholder,
      activeBorderColor: vscodeColors.focusBorder,
      hoverBorderColor: vscodeColors.inputBorder,
      activeShadow: shadow.none,
      boxShadow: shadow.none,
    },
    
    Form: {
      labelColor: vscodeColors.foreground,
      labelRequiredMarkColor: vscodeColors.errorForeground,
    },
    
    Modal: {
      contentBg: vscodeColors.editorBackground,
      headerBg: vscodeColors.editorBackground,
      titleColor: vscodeColors.foreground,
      titleFontSize: fontSize.md,
      colorIcon: vscodeColors.foreground,
      colorIconHover: vscodeColors.foreground,
      paddingContentHorizontal: spacing.md,
      paddingMD: spacing.md,
    },
    
    Button: {
      colorText: vscodeColors.buttonForeground,
      colorBgContainer: vscodeColors.buttonBackground,
      colorBorder: vscodeColors.buttonBorder,
      colorPrimary: vscodeColors.buttonBackground,
      colorPrimaryText: vscodeColors.buttonForeground,
      colorTextDisabled: vscodeColors.disabledForeground,
      opacityLoading: opacity.hover,
    },
    
    Dropdown: {
      colorBgElevated: vscodeColors.dropdownBackground,
      colorBorder: vscodeColors.dropdownBorder,
      colorText: vscodeColors.dropdownForeground,
      controlItemBgHover: vscodeColors.hoverBackground,
      controlItemBgActive: vscodeColors.activeBackground,
      colorTextDescription: vscodeColors.descriptionForeground,
      fontSize: fontSize.md,
      paddingBlock: spacing.xs + 2, // 6px
      zIndexPopup: zIndex.dropdown,
    },
    
    Select: {
      colorBgContainer: vscodeColors.inputBackground,
      colorBorder: vscodeColors.inputBorder,
      colorText: vscodeColors.inputForeground,
      colorTextPlaceholder: vscodeColors.inputPlaceholder,
      colorBgElevated: vscodeColors.dropdownBackground,
      optionSelectedBg: vscodeColors.activeBackground,
      optionSelectedColor: vscodeColors.activeForeground,
      optionActiveBg: vscodeColors.hoverBackground,
      colorPrimary: vscodeColors.focusBorder,
      fontSize: fontSize.md,
      zIndexPopup: zIndex.dropdown,
    },
    
    Divider: {
      colorSplit: vscodeColors.separator,
      margin: spacing.sm,
      marginLG: spacing.md,
    },
    
    // 新增：Message组件配置
    Message: {
      zIndexPopup: zIndex.modal,
      colorBgElevated: vscodeColors.editorBackground,
      colorText: vscodeColors.foreground,
      fontSize: fontSize.md,
    },
    
    // 新增：Tooltip组件配置  
    Tooltip: {
      colorBgSpotlight: vscodeColors.editorBackground,
      colorTextLightSolid: vscodeColors.foreground,
      fontSize: fontSize.sm,
      zIndexPopup: zIndex.tooltip,
    },

    // Radio组件配置
    Radio: {
      // 基础颜色
      colorPrimary: vscodeColors.focusBorder,
      colorBgContainer: vscodeColors.inputBackground,
      colorBorder: vscodeColors.inputBorder,
      colorText: vscodeColors.foreground,
      
      // 选中状态颜色
      colorTextDisabled: vscodeColors.disabledForeground,
      
      // Radio button 样式
      buttonSolidCheckedBg: vscodeColors.activeBackground,
      buttonSolidCheckedColor: vscodeColors.activeForeground,
      
      // 交互状态颜色
      colorBorderSecondary: vscodeColors.inputBorder,  // 默认边框
      colorPrimaryHover: vscodeColors.focusBorder,     // hover状态
      colorPrimaryActive: vscodeColors.focusBorder,    // 激活状态
      
      // 圆圈内部样式
      dotColorDisabled: vscodeColors.disabledForeground,
      
      // 尺寸配置
      radioSize: 14,
      dotSize: 6,
      
      // 间距配置
      marginXS: spacing.sm, // 8px - 增加单选框之间的间距
      paddingXS: spacing.xs, // 4px - 增加内边距
      
      // 确保边框可见性
      lineWidth: 1,
      lineType: 'solid',
    },
  },
};

// 拖拽相关的样式常量（用于内联样式）
export const dragStyles = {
  chosen: {
    transform: 'none',
  },
  
  drag: {
    opacity: opacity.drag,
    boxShadow: shadow.drag,
    transform: 'rotate(2deg)',
    zIndex: zIndex.drag,
  },
  
  ghost: {
    opacity: opacity.ghost,
  },
  
  transition: {
    none: 'none',
    height: '0.2s ease-in-out',
  },
  
  cursor: {
    grab: 'grab',
    grabbing: 'grabbing',
    pointer: 'pointer',
  },
  
  spacing: {
    marginBottom: `${spacing.sm}px`,
    padding: {
      modal: {
        header: `${spacing.sm}px ${spacing.md}px`,
        body: `${spacing.md}px`,
        close: {
          top: `${spacing.xs + 2}px`,
          right: `${spacing.sm}px`,
          width: `${size.iconMd}px`,
          height: `${size.iconMd}px`,
        },
      },
      dropdown: `${spacing.xs + 2}px ${spacing.md}px`,
    },
    margin: {
      divider: `${spacing.xs}px 0`,
      collapse: `${spacing.sm}px`,
    },
  },
};

export default antdTheme;
