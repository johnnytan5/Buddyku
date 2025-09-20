'use client';

import { User, Mail, Phone, MapPin, Heart, UserCheck } from 'lucide-react';

export default function ProfilePage() {
  // Sample profile data - in a real app, this would come from an API or state management
  const profileData = {
    name: "Alex Johnson",
    email: "alex.johnson@email.com",
    phone: "+60 12-345 6789",
    areaOfLiving: "Petaling Jaya, Malaysia",
    emergencyContact: {
      name: "Sarah Johnson",
      relation: "Sister",
      phone: "+60 19-876 5432"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 w-full">
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
            
            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-blue-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Area of Living</p>
                <p className="text-gray-800 font-medium">{profileData.areaOfLiving}</p>
              </div>
            </div>
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
            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-pink-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="text-gray-800 font-medium">{profileData.emergencyContact.name}</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
              <UserCheck className="w-5 h-5 text-pink-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Relation</p>
                <p className="text-gray-800 font-medium">{profileData.emergencyContact.relation}</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
              <Phone className="w-5 h-5 text-pink-500 mr-4" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Phone</p>
                <p className="text-gray-800 font-medium">{profileData.emergencyContact.phone}</p>
              </div>
            </div>
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