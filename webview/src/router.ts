import { createMemoryRouter } from 'react-router';
import Home from './Home';
import Settings from './Settings';
import Bookmarks from './Bookmarks';
import Repositories from './Repositories';

// 获取上次选择的 tab
const getLastTabPath = () => {
  const lastTab = localStorage.getItem('proj-ma-last-tab');
  const tabPathMap: Record<string, string> = {
    'home': '/',
    'bookmarks': '/bookmarks',
    'repos': '/repos',
    'settings': '/settings',
  };
  return tabPathMap[lastTab || ''] || '/';
};

// 配置路由
export const router = createMemoryRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/bookmarks',
    Component: Bookmarks,
  },
  {
    path: '/repos',
    Component: Repositories,
  },
  {
    path: '/settings',
    Component: Settings,
  },
], {
  initialEntries: [getLastTabPath()],
});
