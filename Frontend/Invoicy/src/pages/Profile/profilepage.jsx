import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, User, Mail, Building, Phone, MapPin, CreditCard, DollarSign, Camera } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS, BASE_URL } from '../../utils/apiPaths';
import toast from 'react-hot-toast';
import InputField from '../../components/ui/InputField';
import TextareaField from '../../components/ui/TextareaField';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';

const ProfilePage = () => {
  const { user, loading, updateUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const avatarBlobUrlRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    phone: '',
    address: '',
    tin: '',
    currency: 'GHS',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        businessName: user.businessName || '',
        phone: user.phone || '',
        address: user.address || '',
        tin: user.tin || '',
        currency: user.currency || 'GHS',
      });
    }
  }, [user]);

  // Load profile picture as blob URL (so credentials are sent)
  useEffect(() => {
    if (!user?.profilePicture) {
      if (avatarBlobUrlRef.current) {
        URL.revokeObjectURL(avatarBlobUrlRef.current);
        avatarBlobUrlRef.current = null;
      }
      setAvatarUrl(null);
      return;
    }
    const url = `${BASE_URL}${API_PATHS.AUTH.PROFILE_PICTURE(user.profilePicture)}`;
    axiosInstance.get(url, { responseType: 'blob' })
      .then((res) => {
        if (avatarBlobUrlRef.current) URL.revokeObjectURL(avatarBlobUrlRef.current);
        const objectUrl = URL.createObjectURL(res.data);
        avatarBlobUrlRef.current = objectUrl;
        setAvatarUrl(objectUrl);
      })
      .catch(() => setAvatarUrl(null));
    return () => {
      if (avatarBlobUrlRef.current) {
        URL.revokeObjectURL(avatarBlobUrlRef.current);
        avatarBlobUrlRef.current = null;
      }
    };
  }, [user?.profilePicture]);

  const handleProfilePhotoChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image (JPEG, PNG, GIF or WebP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2MB or smaller');
      return;
    }
    setUploadingPhoto(true);
    const formDataPhoto = new FormData();
    formDataPhoto.append('photo', file);
    axiosInstance.post(API_PATHS.AUTH.PROFILE_PICTURE_UPLOAD, formDataPhoto, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then((res) => {
        updateUser(res.data);
        toast.success('Profile picture updated');
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to upload picture');
      })
      .finally(() => {
        setUploadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  const isAdminOrOwner = user?.role === 'owner' || user?.role === 'admin';

  const currencyOptions = [
    { label: 'GHS - Ghana Cedis', value: 'GHS' },
    { label: 'USD - US Dollar', value: 'USD' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'GBP - British Pound', value: 'GBP' },
    { label: 'NGN - Nigerian Naira', value: 'NGN' },
    { label: 'KES - Kenyan Shilling', value: 'KES' },
    { label: 'ZAR - South African Rand', value: 'ZAR' },
    { label: 'XOF - West African CFA Franc', value: 'XOF' },
    { label: 'XAF - Central African CFA Franc', value: 'XAF' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const response = await axiosInstance.put(API_PATHS.AUTH.UPDATE_PROFILE, formData);
      updateUser(response.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-white rounded-xl border border-gray-200 dark:border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-200 bg-white dark:bg-white rounded-t-xl">
          <h3 className="text-xl font-bold text-black dark:text-black">My Profile</h3>
          <p className="text-sm text-black dark:text-black mt-1">Manage your personal and business information</p>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-6 space-y-6 bg-white dark:bg-white">
          {/* Profile picture */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-200">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleProfilePhotoChange}
              disabled={uploadingPhoto}
            />
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-300 bg-gray-100 dark:bg-gray-700 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {uploadingPhoto ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </span>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-black dark:text-black">Profile picture</p>
              <p className="text-xs text-gray-500 dark:text-gray-600 mt-0.5">
                Click the photo to change. JPEG, PNG, GIF or WebP, max 2MB.
              </p>
            </div>
          </div>

          {/* Email Field (Read-only) */}
          <div className="bg-white dark:bg-white">
            <label className="block text-sm font-medium text-black dark:text-black mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                readOnly
                value={user?.email || ''}
                disabled
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-300 rounded-lg bg-white dark:bg-white text-black dark:text-black cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-black dark:text-black">Email cannot be changed</p>
          </div>

          {/* Full Name */}
          <div className="bg-white dark:bg-white">
            <InputField
              label="Full Name"
              name="name"
              icon={User}
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Business Information Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-200 bg-white dark:bg-white">
            <h4 className="text-sm font-medium text-black dark:text-black mb-1">
              Business Information
            </h4>
            <p className="text-sm text-black dark:text-black mb-4">
              This will be used to prefill your "Bill From" sections in invoices.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-white">
              <div className="bg-white dark:bg-white">
                <InputField
                  label="Business Name"
                  name="businessName"
                  icon={Building}
                  type="text"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="Enter your business name"
                />
              </div>
              <div className="bg-white dark:bg-white">
                <InputField
                  label="Phone"
                  name="phone"
                  icon={Phone}
                  type="text"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your business phone number"
                />
              </div>
              <div className="md:col-span-2 bg-white dark:bg-white">
                <TextareaField
                  label="Address"
                  name="address"
                  icon={MapPin}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your business address"
                />
              </div>
              <div className="bg-white dark:bg-white">
                <InputField
                  label="TIN (Tax Identification Number)"
                  name="tin"
                  icon={CreditCard}
                  type="text"
                  value={formData.tin}
                  onChange={handleInputChange}
                  placeholder="Enter your business TIN"
                />
              </div>
            </div>
          </div>

          {/* Organization Currency Section - Admin/Owner Only */}
          {isAdminOrOwner && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-200 bg-white dark:bg-white">
              <h4 className="text-sm font-medium text-black dark:text-black mb-1">
                Organization Currency
              </h4>
              <p className="text-sm text-black dark:text-black mb-4">
                Set the default currency for your organization. This will be used throughout the application for invoices, reports, and financial calculations.
              </p>
              <div className="bg-white dark:bg-white">
                <SelectField
                  label="Default Currency"
                  name="currency"
                  icon={DollarSign}
                  value={formData.currency}
                  onChange={handleInputChange}
                  options={currencyOptions}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-200 bg-white dark:bg-white">
            <Button
              type="submit"
              isLoading={isUpdating}
              className="w-full md:w-auto"
            >
              Update Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
