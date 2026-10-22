import React, { useState, useEffect, useRef } from 'react';
import { UserAuth } from '../types';
import { validateAndReadProfileImage, persistUserProfile } from '../utils/portalStorage';
import {
  User,
  Mail,
  Smartphone,
  Building2,
  ShieldCheck,
  UploadCloud,
  Camera,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building,
  Lock,
  BadgeCheck
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: UserAuth;
  onUpdateProfile: (updated: Partial<UserAuth>) => void;
  onUpdatePhone?: (phone: string) => void;
  branchCode?: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateProfile,
  onUpdatePhone,
  branchCode = '111222'
}) => {
  const [name, setName] = useState<string>(currentUser.name || '');
  const [email, setEmail] = useState<string>(currentUser.email || '');
  const [phone, setPhone] = useState<string>(
    currentUser.phone ? currentUser.phone.replace('+91', '').trim() : ''
  );
  const [designation, setDesignation] = useState<string>(
    currentUser.designation ||
      (currentUser.role === 'MANAGER'
        ? 'Senior Branch Credit Manager'
        : currentUser.role === 'OFFICER'
        ? 'Credit Verification Officer'
        : 'Retail / MSME Borrower')
  );
  const [branch, setBranch] = useState<string>(
    currentUser.branch || 'Anna Salai Main Branch, Chennai'
  );
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    currentUser.avatar
  );
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone ? currentUser.phone.replace('+91', '').trim() : '');
    setDesignation(
      currentUser.designation ||
        (currentUser.role === 'MANAGER'
          ? 'Senior Branch Credit Manager'
          : currentUser.role === 'OFFICER'
          ? 'Credit Verification Officer'
          : 'Retail / MSME Borrower')
    );
    setBranch(currentUser.branch || 'Anna Salai Main Branch, Chennai');
    setAvatarPreview(currentUser.avatar);
  }, [currentUser]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');
    setSaveSuccess('');
    if (!file) return;

    const validation = await validateAndReadProfileImage(file);
    if (!validation.valid || !validation.dataUrl) {
      setUploadError(
        validation.error || 'Invalid image file. Please upload a JPG, JPEG, or PNG image.'
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFileName(file.name);
    setAvatarPreview(validation.dataUrl);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview(undefined);
    setSelectedFileName('');
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setSaveSuccess('');

    if (!name.trim() || !email.trim()) {
      setUploadError('Full Legal Name and Email Address are required.');
      return;
    }

    setIsSaving(true);
    try {
      const formattedPhone = phone.trim() ? `+91 ${phone.trim()}` : currentUser.phone;
      const updatedUser = await persistUserProfile(currentUser, {
        name: name.trim(),
        email: email.trim(),
        phone: formattedPhone,
        designation: designation.trim(),
        branch: branch.trim(),
        avatar: avatarPreview,
        removeAvatar: !avatarPreview
      });

      onUpdateProfile({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        designation: updatedUser.designation,
        branch: updatedUser.branch,
        avatar: updatedUser.avatar
      });

      if (onUpdatePhone && formattedPhone) {
        onUpdatePhone(formattedPhone);
      }

      setSaveSuccess('Profile & photo saved successfully! Your photo will remain saved after page refresh.');
      setSelectedFileName('');
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      setUploadError('Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isManager = currentUser.role === 'MANAGER';
  const isOfficer = currentUser.role === 'OFFICER';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Portal Profile Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl border relative overflow-hidden ${
          isManager
            ? 'bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 border-emerald-500/40'
            : isOfficer
            ? 'bg-gradient-to-r from-sky-800 via-blue-900 to-slate-900 border-sky-500/40'
            : 'bg-gradient-to-r from-indigo-700 via-blue-700 to-teal-700 border-indigo-400/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={name || currentUser.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-lg bg-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-3xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                  {(name || currentUser.name || 'U').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 bg-amber-400 hover:bg-amber-300 text-slate-950 p-1.5 rounded-xl shadow-md border border-white cursor-pointer transition-transform active:scale-95"
                title="Change Profile Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
                  {isManager
                    ? 'Bank Manager Profile'
                    : isOfficer
                    ? 'Loan Officer Profile'
                    : 'Client Borrower Profile'}
                </span>
                {(isManager || isOfficer) && (
                  <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full tracking-wider">
                    Branch Code: ••••••
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1">{name || currentUser.name}</h2>
              <p className="text-xs text-white/80 font-medium">
                {designation} • {branch}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-black/25 border border-white/15 px-3.5 py-2 rounded-2xl text-xs self-start sm:self-center">
            <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Verified Identity • ID: {currentUser.id}</span>
          </div>
        </div>
      </div>

      {/* Main Profile & Photo Upload Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Profile Photo Upload Section */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>Profile Photo Upload</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload or update your official portal profile photo. Supported formats: JPG, JPEG, PNG (Max 5 MB).
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full self-start sm:self-center">
                Independent Per-User Storage Active
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Live Image Preview Box */}
              <div className="relative shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile preview"
                    className="w-28 h-28 rounded-2xl object-cover border-2 border-sky-500 shadow-md bg-white"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-slate-200 border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-slate-500">
                    <User className="w-10 h-10 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold uppercase">No Photo</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{avatarPreview ? 'Change / Update Photo' : 'Select Image from Device'}</span>
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>

                {selectedFileName && (
                  <div className="text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl inline-block">
                    Selected file: <strong>{selectedFileName}</strong> (Preview ready — click "Save Profile Changes" below to persist)
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  Your uploaded photo is validated for JPG, JPEG, or PNG format and persisted to your individual account profile so it stays saved across page refreshes and logins.
                </p>
              </div>
            </div>
          </div>

          {/* Error & Success Feedback */}
          {uploadError && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-800 font-bold flex items-center space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {/* User Details Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Mobile Number (2FA)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="9840288219"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-3 py-2 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role / Designation
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Branch / Banking Circle
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>AES-256 Encrypted Profile Storage</span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Profile & Photo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
