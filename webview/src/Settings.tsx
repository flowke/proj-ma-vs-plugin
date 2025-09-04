import React from 'react';
import { Button, Space, Typography, Card } from 'antd';
import { FolderOpenOutlined, FileTextOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { postMessage, isVSCodeApiAvailable } from './vscode-api';

const { Title, Text } = Typography;

export default function Settings() {
  const navigate = useNavigate();

  const handleOpenConfigLocation = () => {
    console.log('[Settings] handleOpenConfigLocation clicked');
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
    console.log('[Settings] handleOpenConfigFile clicked');
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

  return (
    <div style={{ padding: '16px', height: '100vh', backgroundColor: 'var(--vscode-panel-background)' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          style={{ 
            color: 'var(--vscode-foreground)',
            padding: '4px 8px',
          }}
        >
          返回
        </Button>
      </div>
      
      <Title 
        level={3} 
        style={{ 
          color: 'var(--vscode-foreground)', 
          marginBottom: '24px',
          fontSize: '18px',
        }}
      >
        设置
      </Title>

      <Card
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          borderColor: 'var(--vscode-panel-border)',
          borderRadius: '6px',
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <Title 
          level={4} 
          style={{ 
            color: 'var(--vscode-foreground)', 
            marginBottom: '16px',
            fontSize: '16px',
          }}
        >
          配置文件
        </Title>
        
        <Text 
          style={{ 
            color: 'var(--vscode-descriptionForeground)', 
            display: 'block',
            marginBottom: '16px',
          }}
        >
          配置文件位置: ~/.proj-ma.json
        </Text>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={handleOpenConfigLocation}
            block
            style={{
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              borderColor: 'var(--vscode-button-border)',
              color: 'var(--vscode-button-secondaryForeground)',
              textAlign: 'left',
              height: '36px',
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
              height: '36px',
            }}
          >
            打开配置文件
          </Button>
        </Space>
      </Card>
    </div>
  );
}
