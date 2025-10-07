'use client';

import { User, Calendar, Mail, Phone, MapPin, Heart, UserCheck, Loader2, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProfileData {
  user_id: string;
  email: string;
  name: string;
  phone: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at?: string;
  last_login?: string;
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    // Only fetch profile data if user is authenticated
    if (isAuthenticated && user) {
      fetchProfileData();
    }
  }, [isAuthenticated, user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the authenticated user's ID
      if (!user?.user_id) {
        setError('No user ID available');
        return;
      }
      
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.user_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch profile');
      }

      const data = await response.json();
      setProfileData(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use the auth hook's logout function
      logout();
    } catch (err) {
      console.error('Error during logout:', err);
      // Even if there's an error, still logout
      logout();
    } finally {
      setLogoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 w-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 w-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchProfileData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 w-full">
      {/* Header with Logout */}
      <div className="flex justify-between items-center p-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors duration-200 shadow-sm text-sm"
        >
          {logoutLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
            </>
          )}
        </button>
      </div>
      
      {/* Profile Cards */}
      <div className="space-y-4 p-4 pb-20">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mr-4">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
          </div>

          <div className="space-y-5">
            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-blue-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="text-gray-800 font-medium">{profileData.name}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-blue-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-gray-800 font-medium">{profileData.email}</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
              <Phone className="w-5 h-5 text-blue-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Phone</p>
                <p className="text-gray-800 font-medium">{profileData.phone}</p>
              </div>
            </div>
            
            {profileData.created_at && (
              <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-blue-500 mr-4" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Member Since</p>
                  <p className="text-gray-800 font-medium">
                    {new Date(profileData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-red-100 rounded-full flex items-center justify-center mr-4">
              <Heart className="w-6 h-6 text-pink-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Emergency Contact</h2>
          </div>
          
          <div className="space-y-5">
            {profileData.emergency_contact_name ? (
              <>
                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-pink-500 mr-4" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className="text-gray-800 font-medium">{profileData.emergency_contact_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-pink-500 mr-4" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Phone</p>
                    <p className="text-gray-800 font-medium">{profileData.emergency_contact_phone}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500">No emergency contact information available</p>
                <p className="text-sm text-gray-400 mt-1">Add emergency contact details in your profile settings</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-200 rounded-full flex items-center justify-center mr-4">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Profile Status</p>
              <p className="text-green-700 font-semibold text-lg">Complete & Ready</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}