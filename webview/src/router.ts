import { createMemoryRouter } from 'react-router';
import Home from './Home';
import Settings from './Settings';

// 配置路由
export const router = createMemoryRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/settings',
    Component: Settings,
  },
]);
