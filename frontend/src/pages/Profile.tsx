import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import styles from './Profile.module.css';

interface ApiClient {
  id: string;
  name: string;
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  createdAt: string;
  totalRequests?: number;
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'api'>('profile');
  
  // Profile form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [projectName, setProjectName] = useState(user?.projectName || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // API Clients
  const [apiClients, setApiClients] = useState<ApiClient[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [showNewApiKey, setShowNewApiKey] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'api') {
      fetchApiClients();
    }
  }, [activeTab]);

  const fetchApiClients = async () => {
    const token = localStorage.getItem('yalavoch_token');
    try {
      const res = await fetch('/dashboard/api-clients', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setApiClients(data.clients);
      }
    } catch (err) {
      console.error('Failed to fetch API clients:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('yalavoch_token');
    try {
      const res = await fetch('/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, projectName, companyName }),
      });

      const data = await res.json();
      if (data.success) {
        updateUser(data.user);
        setMessage('Profile updated successfully');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('yalavoch_token');
    try {
      const res = await fetch('/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setLoading(true);
    setError('');

    const token = localStorage.getItem('yalavoch_token');
    try {
      const res = await fetch('/dashboard/api-clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClientName }),
      });

      const data = await res.json();
      if (data.success) {
        setShowNewApiKey(data.client.apiKey);
        setNewClientName('');
        fetchApiClients();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create API client');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard!');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className={styles.page}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'security' ? styles.active : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Security
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'api' ? styles.active : ''}`}
          onClick={() => setActiveTab('api')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          API Keys
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={styles.successBox}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {message}
        </div>
      )}
      {error && (
        <div className={styles.errorBox}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className={styles.card}>
          <h2>Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className={styles.form}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Phone Number</label>
              <input
                type="text"
                value={user?.phoneNumber || ''}
                disabled
                className={styles.disabled}
              />
              <span className={styles.hint}>Phone number cannot be changed</span>
            </div>

            <div className={styles.inputGroup}>
              <label>Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            {user?.accountType === 'legal_entity' && (
              <div className={styles.inputGroup}>
                <label>Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            )}

            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className={styles.card}>
          <h2>Change Password</h2>
          <form onSubmit={handleChangePassword} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <>
          <div className={styles.card}>
            <h2>Create New API Key</h2>
            <form onSubmit={handleCreateApiClient} className={styles.createForm}>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Service name (e.g., My Mobile App)"
                required
              />
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? 'Creating...' : 'Create'}
              </button>
            </form>

            {showNewApiKey && (
              <div className={styles.newKeyAlert}>
                <strong>⚠️ Save this API key now! It won't be shown again.</strong>
                <div className={styles.keyDisplay}>
                  <code>{showNewApiKey}</code>
                  <button onClick={() => copyToClipboard(showNewApiKey)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <button className={styles.dismissBtn} onClick={() => setShowNewApiKey(null)}>
                  I've saved the key
                </button>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2>Your API Keys</h2>
            {apiClients.length === 0 ? (
              <div className={styles.empty}>
                <p>No API keys yet. Create one above.</p>
              </div>
            ) : (
              <div className={styles.apiList}>
                {apiClients.map((client) => (
                  <div key={client.id} className={styles.apiCard}>
                    <div className={styles.apiHeader}>
                      <div className={styles.apiInfo}>
                        <h3>{client.name}</h3>
                        <span className={`${styles.status} ${client.isActive ? styles.active : styles.inactive}`}>
                          {client.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <span className={styles.requests}>{client.totalRequests?.toLocaleString() || 0} requests</span>
                    </div>
                    <div className={styles.apiKey}>
                      <code>{client.apiKey.slice(0, 20)}...{client.apiKey.slice(-8)}</code>
                      <button onClick={() => copyToClipboard(client.apiKey)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                    <span className={styles.created}>
                      Created: {new Date(client.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

