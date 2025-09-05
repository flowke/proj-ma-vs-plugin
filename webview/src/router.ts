import { createMemoryRouter } from 'react-router';
import Home from './Home';
import Settings from './Settings';
import Bookmarks from './Bookmarks';
import Repositories from './Repositories';

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
]);
