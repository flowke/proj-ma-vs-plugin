import React from 'react';
import { Button, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import './MoreDropdown.scss';

interface MoreDropdownProps {
  /** 菜单项配置 */
  items: MenuProps['items'];
  /** 下拉菜单的位置 */
  placement?: 'bottom' | 'bottomLeft' | 'bottomRight' | 'top' | 'topLeft' | 'topRight';
  /** 触发方式 */
  trigger?: ('click' | 'hover' | 'contextMenu')[];
  /** 按钮的标题提示 */
  title?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义按钮样式 */
  buttonStyle?: React.CSSProperties;
  /** 自定义图标样式 */
  iconStyle?: React.CSSProperties;
  /** 自定义下拉菜单样式 */
  dropdownStyle?: React.CSSProperties;
  /** 菜单样式模式：'default' | 'compact' | 'spacious' */
  menuMode?: 'default' | 'compact' | 'spacious';
  /** 额外的菜单CSS类名 */
  menuClassName?: string;
  /** 点击按钮时的回调 */
  onButtonClick?: (e: React.MouseEvent) => void;
  /** 菜单打开状态改变时的回调 */
  onOpenChange?: (open: boolean) => void;
}

const MoreDropdown: React.FC<MoreDropdownProps> = ({
  items,
  placement = 'bottomRight',
  trigger = ['click'],
  title = '更多操作',
  disabled = false,
  buttonStyle,
  iconStyle,
  dropdownStyle,
  menuMode = 'default',
  menuClassName,
  onButtonClick,
  onOpenChange,
}) => {
  // 默认按钮样式
  const defaultButtonStyle: React.CSSProperties = {
    color: 'var(--vscode-foreground)',
    padding: '0',
    width: '20px',
    height: '20px',
    minWidth: '20px',
    fontSize: '12px',
    ...buttonStyle,
  };

  // 默认图标样式
  const defaultIconStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    ...iconStyle,
  };

  // 处理按钮点击
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onButtonClick?.(e);
  };

  // 构建菜单类名
  const getMenuClassName = () => {
    let className = 'more-dropdown-menu';
    
    if (menuMode !== 'default') {
      className += ` ${menuMode}`;
    }
    
    if (menuClassName) {
      className += ` ${menuClassName}`;
    }
    
    return className;
  };

  return (
    <Dropdown
      placement={placement}
      trigger={trigger}
      disabled={disabled}
      onOpenChange={onOpenChange}
      menu={{ 
        items,
        className: getMenuClassName()
      }}
      popupRender={(menu) => (
        <div 
          className="more-dropdown-container"
          style={dropdownStyle}
        >
          {menu}
        </div>
      )}
    >
      <Button
        type="text"
        size="small"
        icon={<MoreOutlined style={defaultIconStyle} />}
        onClick={handleButtonClick}
        style={defaultButtonStyle}
        title={title}
        disabled={disabled}
      />
    </Dropdown>
  );
};

export default MoreDropdown;
