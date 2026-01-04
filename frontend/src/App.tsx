import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import SentOtps from './pages/SentOtps';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import ApiDocs from './pages/ApiDocs';
import DashboardLayout from './components/DashboardLayout';

interface User {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  projectName: string;
  accountType: string;
  balance: number;
  isVerified: boolean;
  companyName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('yalavoch_token');
    const savedUser = localStorage.getItem('yalavoch_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('yalavoch_token', newToken);
    localStorage.setItem('yalavoch_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('yalavoch_token');
    localStorage.removeItem('yalavoch_user');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('yalavoch_user', JSON.stringify(updatedUser));
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--color-bg-primary)'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/docs" element={<ApiDocs />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="sent-otps" element={<SentOtps />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
