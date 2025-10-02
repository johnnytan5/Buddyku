import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user_id: string;
  email: string;
  name: string;
  phone: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  last_login: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const userData = localStorage.getItem('user');
    const userId = localStorage.getItem('user_id');
    
    if (userData && userId) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('user_id');
        router.push('/login');
      }
    } else {
      // No user data found, redirect to login
      router.push('/login');
    }
    
    setLoading(false);
  }, [router]);

  const logout = () => {
    // Clear all user data
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Redirect to login
    router.push('/login');
  };

  const isAuthenticated = !!user;

  return {
    user,
    loading,
    isAuthenticated,
    logout
  };
};
