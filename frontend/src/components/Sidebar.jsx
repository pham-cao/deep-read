import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { icon: 'add_box', label: 'New Chat', path: '/chat' },
  { icon: 'history', label: 'History', path: '/history' },
  { icon: 'description', label: 'Documents', path: '/documents' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar" id="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon material-icons-outlined">architecture</span>
        </div>
        <div className="sidebar-brand-text">
          <h1 className="sidebar-title">Fluid Architect</h1>
          <span className="sidebar-subtitle">Design System Expert</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
            id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span className="material-icons-outlined sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profile */}
      <div className="sidebar-profile">
        <div className="sidebar-profile-avatar">
          <span className="material-icons-outlined">person</span>
        </div>
        <div className="sidebar-profile-info">
          <span className="sidebar-profile-name">Architect Profile</span>
          <span className="sidebar-profile-role">Admin Level</span>
        </div>
        <button className="sidebar-profile-menu" id="profile-menu-btn" aria-label="Profile menu">
          <span className="material-icons-outlined">more_vert</span>
        </button>
      </div>
    </aside>
  );
}
