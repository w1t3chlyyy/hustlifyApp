import { useState } from 'react';
import { adminAuth } from '@/lib/adminApi';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';

const AdminApp = () => {
  const [loggedIn, setLoggedIn] = useState(adminAuth.isLoggedIn());

  if (!loggedIn) return <AdminLogin onSuccess={() => setLoggedIn(true)} />;
  return <AdminShell onLogout={() => setLoggedIn(false)} />;
};

export default AdminApp;
