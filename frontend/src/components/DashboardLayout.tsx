import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/dashboard/sent-otps', label: 'Sent OTPs', icon: 'send' },
    { path: '/dashboard/reports', label: 'Reports', icon: 'chart' },
    { path: '/dashboard/profile', label: 'Profile', icon: 'user' },
  ];

  const getIcon = (name: string) => {
    switch (name) {
      case 'home':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 'send':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        );
      case 'chart':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      case 'user':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleTopUp = async () => {
    const amount = parseInt(topUpAmount);
    if (amount < 10000) {
      alert('Minimum top-up amount is 10,000 UZS');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('yalavoch_token');
      const res = await fetch('/dashboard/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Successfully topped up! New balance: ${data.newBalance} UZS`);
        setShowTopUp(false);
        setTopUpAmount('');
        // Refresh user data
        window.location.reload();
      }
    } catch (error) {
      alert('Top-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.logo}>
          <img src="/yalavoch-logo.png" alt="Yalavoch" className={styles.logoImg} />
          <span className={styles.logoText}>Yalavoch</span>
        </Link>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
            >
              {getIcon(item.icon)}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link to="/docs" className={styles.docsLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>API Documentation</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>
              {menuItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className={styles.headerRight}>
            <button className={styles.balanceBtn} onClick={() => setShowTopUp(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>{Number(user?.balance || 0).toLocaleString()} UZS</span>
            </button>

            <div className={styles.userMenu}>
              <button className={styles.userBtn} onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className={styles.avatar}>
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <span className={styles.userName}>{user?.firstName} {user?.lastName}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showUserMenu && (
                <div className={styles.dropdown}>
                  <Link to="/dashboard/profile" className={styles.dropdownItem} onClick={() => setShowUserMenu(false)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profile
                  </Link>
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className={styles.modalOverlay} onClick={() => setShowTopUp(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Top Up Balance</h2>
              <button className={styles.closeBtn} onClick={() => setShowTopUp(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.currentBalance}>
                Current balance: <strong>{Number(user?.balance || 0).toLocaleString()} UZS</strong>
              </p>

              <div className={styles.amountGroup}>
                <label>Amount (UZS)</label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="10,000"
                  min="10000"
                />
                <span className={styles.hint}>Minimum: 10,000 UZS</span>
              </div>

              <div className={styles.quickAmounts}>
                {[10000, 50000, 100000, 500000].map((amount) => (
                  <button
                    key={amount}
                    className={styles.quickBtn}
                    onClick={() => setTopUpAmount(String(amount))}
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowTopUp(false)}>
                Cancel
              </button>
              <button className={styles.confirmBtn} onClick={handleTopUp} disabled={loading}>
                {loading ? 'Processing...' : 'Top Up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

