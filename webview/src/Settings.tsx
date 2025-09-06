import React, { useEffect, useState } from 'react';
import { Button, Space, Typography, Card, Radio, Divider } from 'antd';
import { FolderOpenOutlined, FileTextOutlined, ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';
import type { ProjectConfig } from './types';
import { DEFAULT_CONFIG } from './types';

const { Title, Text } = Typography;

export default function Settings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      
      if (message?.type === 'configLoaded' && message.payload) {
        setConfig(message.payload);
      }
    };
    
    window.addEventListener('message', handler);
    
    // 加载配置
    try {
      postMessage({ type: 'loadConfig' });
    } catch (e) {
      console.warn('[Settings] failed to request config load', e);
    }
    
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleOpenConfigLocation = () => {
    if (!isVSCodeApiAvailable()) {
      console.warn('[Settings] VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    const success = postMessage({ type: 'openConfigLocation' });
    if (!success) {
      alert('发送消息失败，请检查VS Code扩展是否正常运行');
    }
  };

  const handleOpenConfigFile = () => {
    if (!isVSCodeApiAvailable()) {
      console.warn('[Settings] VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }
    const success = postMessage({ type: 'openConfigFile' });
    if (!success) {
      alert('发送消息失败，请检查VS Code扩展是否正常运行');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleEditorChange = (editor: 'vscode' | 'cursor') => {
    console.log('[Settings] handleEditorChange:', editor);
    if (!isVSCodeApiAvailable()) {
      console.warn('[Settings] VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }

    const updated = {
      ...config,
      settings: {
        ...config.settings,
        defaultEditor: editor,
      },
    };
    setConfig(updated);
    postMessage({ type: 'saveConfig', payload: updated });
  };

  const handleClearEditorSetting = () => {
    console.log('[Settings] handleClearEditorSetting');
    if (!isVSCodeApiAvailable()) {
      console.warn('[Settings] VS Code API 不可用');
      alert('VS Code API 不可用，请确保在 VS Code 扩展环境中运行');
      return;
    }

    const updated = {
      ...config,
      settings: {
        ...config.settings,
        defaultEditor: undefined,
      },
    };
    setConfig(updated);
    postMessage({ type: 'saveConfig', payload: updated });
  };

  return (
    <div style={{ padding: '0', height: '100vh' }}>
      <div style={{ marginBottom: '8px', marginLeft: '8px' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          size='small'
          onClick={handleBack}
          style={{ 
            color: 'var(--vscode-foreground)',
            padding: '4px 0',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          返回
        </Button>
      </div>
      
      <Title 
        level={3} 
        style={{ 
          color: 'var(--vscode-foreground)', 
          marginBottom: '12px',
          fontSize: '16px',
          padding: '0 8px',
        }}
      >
        设置
      </Title>

      <Card
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          borderColor: 'var(--vscode-panel-border)',
          borderRadius: '4px',
          margin: '0 8px',
        }}
        bodyStyle={{ padding: '8px' }}
      >
        <Title 
          level={4} 
          style={{ 
            color: 'var(--vscode-foreground)', 
            marginBottom: '8px',
            fontSize: '14px',
          }}
        >
          配置文件
        </Title>
        
        <Text 
          style={{ 
            color: 'var(--vscode-descriptionForeground)', 
            display: 'block',
            marginBottom: '8px',
            fontSize: '12px',
          }}
        >
          配置文件位置: ~/.proj-ma.json
        </Text>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={handleOpenConfigLocation}
            block
            style={{
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              borderColor: 'var(--vscode-button-border)',
              color: 'var(--vscode-button-secondaryForeground)',
              textAlign: 'left',
              height: '28px',
            }}
          >
            打开配置文件所在位置
          </Button>

          <Button
            icon={<FileTextOutlined />}
            onClick={handleOpenConfigFile}
            block
            style={{
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              borderColor: 'var(--vscode-button-border)',
              color: 'var(--vscode-button-secondaryForeground)',
              textAlign: 'left',
              height: '28px',
            }}
          >
            打开配置文件
          </Button>
        </Space>
      </Card>

      <Card
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          borderColor: 'var(--vscode-panel-border)',
          borderRadius: '4px',
          margin: '8px',
        }}
        bodyStyle={{ padding: '8px' }}
      >
        <Title 
          level={4} 
          style={{ 
            color: 'var(--vscode-foreground)', 
            marginBottom: '8px',
            fontSize: '14px',
          }}
        >
          <EditOutlined style={{ marginRight: '4px' }} />
          编辑器设置
        </Title>
        
        <div 
          style={{ 
            color: 'var(--vscode-descriptionForeground)', 
            display: 'block',
            marginBottom: '8px',
            fontSize: '12px',
          }}
        >
          选择点击编辑器图标时使用的默认编辑器
        </div>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Radio.Group 
            value={config.settings.defaultEditor} 
            onChange={(e) => handleEditorChange(e.target.value)}
            style={{ width: '100%', display: 'block' }}
          >
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div
                style={{ 
                  width: '100%',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  border: '1px solid transparent',
                  backgroundColor: config.settings.defaultEditor === 'vscode' ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                  color: config.settings.defaultEditor === 'vscode' ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)'
                }}
              >
                <Radio 
                  value="vscode"
                  style={{ 
                    width: '100%',
                    margin: 0,
                    color: 'inherit'
                  }}
                >
                  VS Code
                </Radio>
              </div>
              <div
                style={{ 
                  width: '100%',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  border: '1px solid transparent',
                  backgroundColor: config.settings.defaultEditor === 'cursor' ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                  color: config.settings.defaultEditor === 'cursor' ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)'
                }}
              >
                <Radio 
                  value="cursor"
                  style={{ 
                    width: '100%',
                    margin: 0,
                    color: 'inherit'
                  }}
                >
                  Cursor
                </Radio>
              </div>
            </div>
          </Radio.Group>

          {config.settings.defaultEditor && (
            <>
              <Divider style={{ margin: '2px 0', borderColor: 'var(--vscode-panel-border)' }} />
              <Button
                onClick={handleClearEditorSetting}
                style={{
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  borderColor: 'var(--vscode-button-border)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  height: '24px',
                }}
              >
                清除设置（下次点击时重新选择）
              </Button>
            </>
          )}

          {!config.settings.defaultEditor && (
            <Text 
              style={{ 
                color: 'var(--vscode-descriptionForeground)', 
                fontSize: '12px',
                fontStyle: 'italic',
              }}
            >
              当前未设置默认编辑器，点击编辑器图标时将弹出选择对话框
            </Text>
          )}
        </Space>
      </Card>
    </div>
  );
}
