import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  return (
    <div className="app-layout" id="app-layout">
      <Sidebar />
      <main className="app-main" id="app-main">
        <Outlet />
      </main>
    </div>
  );
}
