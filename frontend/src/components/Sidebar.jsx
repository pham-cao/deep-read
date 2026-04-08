import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { icon: 'add_box', label: 'New Chat', path: '/chat' },
  { icon: 'history', label: 'History', path: '/history' },
  { icon: 'description', label: 'Documents', path: '/documents' },
];

export default function Sidebar() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Fetch current user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:8000/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    window.location.href = 'http://localhost:8000/auth/logout';
  };

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
          {user?.picture ? (
            <img src={user.picture} alt={user.first_name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          ) : (
            <span className="material-icons-outlined">person</span>
          )}
        </div>
        <div className="sidebar-profile-info">
          <span className="sidebar-profile-name">
            {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Loading...'}
          </span>
          <span className="sidebar-profile-role">{user?.email || 'user@example.com'}</span>
        </div>
        <div className="sidebar-profile-menu-wrapper">
          <button
            className="sidebar-profile-menu"
            id="profile-menu-btn"
            aria-label="Profile menu"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <span className="material-icons-outlined">more_vert</span>
          </button>
          {isProfileMenuOpen && (
            <div className="sidebar-profile-dropdown">
              <button
                className="sidebar-profile-logout"
                onClick={handleLogout}
              >
                <span className="material-icons-outlined">logout</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
