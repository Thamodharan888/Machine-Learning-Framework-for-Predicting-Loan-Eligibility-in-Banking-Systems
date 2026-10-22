import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Cpu,
  FileSpreadsheet,
  BarChart3,
  ShieldAlert,
  Sparkles,
  MapPin,
  LogOut,
  User,
  Building2,
  Lock,
  FileText,
  Clock,
  Calculator,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff,
  FileEdit,
  Building,
  X,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Edit,
  UploadCloud,
  Check,
  Smartphone,
  Mail,
  Camera,
  Upload,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { PRESET_CASE_STUDIES } from '../utils/sampleData';
import { ApplicantInput, UserAuth, UserRole } from '../types';
import { SecurityCheckupModal } from './SecurityCheckupModal';
import { validateAndReadProfileImage, persistUserProfile } from '../utils/portalStorage';

export type NavTab =
  | 'underwriter'
  | 'applications'
  | 'analytics'
  | 'security'
  | 'officer_queue'
  | 'client_apply'
  | 'client_status'
  | 'client_health'
  | 'client_calculator'
  | 'profile';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onSelectCaseStudy: (study: ApplicantInput) => void;
  currentUser: UserAuth;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
  dataMaskingActive: boolean;
  onUpdatePhone?: (phone: string) => void;
  onUpdateProfile?: (updated: Partial<UserAuth>) => void;
  branchCode?: string;
  onUpdateBranchCode?: (newCode: string) => void;
  onOpenChatbot?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectCaseStudy,
  currentUser,
  onSwitchRole,
  onLogout,
  dataMaskingActive,
  onUpdatePhone,
  onUpdateProfile,
  branchCode = '111222',
  onUpdateBranchCode,
  onOpenChatbot
}) => {
  const [showCheckupModal, setShowCheckupModal] = useState<boolean>(false);
  const [showSampleCases, setShowSampleCases] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showBranchCodeModal, setShowBranchCodeModal] = useState<boolean>(false);
  const [branchCodeInput, setBranchCodeInput] = useState<string>('');
  const [showBranchCode, setShowBranchCode] = useState<boolean>(false);
  const [branchCodeToast, setBranchCodeToast] = useState<string>('');
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);
  const [loadedCaseNotice, setLoadedCaseNotice] = useState<string>('');

  // Profile Edit Local State
  const [editName, setEditName] = useState<string>(currentUser.name);
  const [editEmail, setEditEmail] = useState<string>(currentUser.email);
  const [editPhone, setEditPhone] = useState<string>(
    currentUser.phone ? currentUser.phone.replace('+91', '').trim() : ''
  );
  const [editDesignation, setEditDesignation] = useState<string>(
    currentUser.designation || ''
  );
  const [editBranch, setEditBranch] = useState<string>(currentUser.branch || '');
  const [editAvatar, setEditAvatar] = useState<string | null>(
    currentUser.avatar || null
  );
  const [avatarUploadError, setAvatarUploadError] = useState<string>('');
  const [selectedPhotoName, setSelectedPhotoName] = useState<string>('');
  const [profileSavedToast, setProfileSavedToast] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setEditName(currentUser.name);
    setEditEmail(currentUser.email);
    setEditPhone(currentUser.phone ? currentUser.phone.replace('+91', '').trim() : '');
    setEditDesignation(currentUser.designation || '');
    setEditBranch(currentUser.branch || '');
    setEditAvatar(currentUser.avatar || null);
  }, [currentUser]);

  const isManager = currentUser.role === 'MANAGER';
  const isOfficer = currentUser.role === 'OFFICER';
  const isClient = currentUser.role === 'CLIENT';

  const handleSelectPreset = (study: ApplicantInput, title: string) => {
    onSelectCaseStudy(study);
    setActiveTab('underwriter');
    setShowSampleCases(false);
    setLoadedCaseNotice(title);
    setTimeout(() => setLoadedCaseNotice(''), 3500);
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAvatarUploadError('');
    if (!file) return;

    const validation = await validateAndReadProfileImage(file);
    if (!validation.valid || !validation.dataUrl) {
      setAvatarUploadError(
        validation.error || 'Invalid file format. Please select a JPG, JPEG, or PNG image.'
      );
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      return;
    }

    setSelectedPhotoName(file.name);
    setEditAvatar(validation.dataUrl);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvatarUploadError('');
    const formattedPhone = editPhone ? `+91 ${editPhone.trim()}` : currentUser.phone;

    const persisted = await persistUserProfile(currentUser, {
      name: editName.trim(),
      email: editEmail.trim(),
      phone: formattedPhone,
      designation: editDesignation.trim(),
      branch: editBranch.trim(),
      avatar: editAvatar || undefined,
      removeAvatar: !editAvatar
    });

    if (onUpdateProfile) {
      onUpdateProfile({
        name: persisted.name,
        email: persisted.email,
        phone: persisted.phone,
        designation: persisted.designation,
        branch: persisted.branch,
        avatar: persisted.avatar
      });
    }
    if (onUpdatePhone && editPhone) {
      onUpdatePhone(`+91 ${editPhone.trim()}`);
    }
    setProfileSavedToast('✓ Profile & photo updated and saved!');
    setSelectedPhotoName('');
    setTimeout(() => {
      setProfileSavedToast('');
      setShowEditProfileModal(false);
    }, 1200);
  };

  // Sample Cases Modal for Bank Manager (renders with createPortal to guarantee visibility)
  const sampleCasesModal =
    showSampleCases && isManager && typeof document !== 'undefined'
      ? createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSampleCases(false);
            }}
            className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-white animate-scaleUp">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">
                      Bank Manager Preset Case Studies
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Select a benchmark profile to load directly into Credit Underwriter
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSampleCases(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Case Studies List */}
              <div className="p-4 space-y-2.5 max-h-[65vh] overflow-y-auto divide-y divide-slate-800/60">
                {PRESET_CASE_STUDIES.map((cs) => (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => handleSelectPreset(cs.data, cs.title)}
                    className="w-full text-left p-3 rounded-2xl border border-slate-800 hover:border-amber-400 hover:bg-slate-800/80 transition-all flex items-center justify-between cursor-pointer group mt-2 first:mt-0"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-xs text-slate-100 group-hover:text-amber-300 transition-colors">
                          {cs.title}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-black ${
                            cs.tag === 'Eligible'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : cs.tag === 'Manual Review'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {cs.tag}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{cs.subtitle}</div>
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-2 font-mono">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">
                          Income: ₹{cs.data.monthly_income.toLocaleString('en-IN')}
                        </span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                          Loan: ₹{cs.data.loan_amount.toLocaleString('en-IN')}
                        </span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300">
                          CIBIL: {cs.data.credit_score}
                        </span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">
                          {cs.data.location}
                        </span>
                      </div>
                    </div>
                    <div className="text-amber-400 group-hover:translate-x-1 transition-transform pl-2">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[11px] text-slate-400">
                Clicking any case immediately evaluates explainable AI risk factors & SHAP scores
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  // Branch Code Change Modal (Only in Manager and Officer Portals)
  const branchCodeModal =
    showBranchCodeModal && (isManager || isOfficer) && typeof document !== 'undefined'
      ? createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowBranchCodeModal(false);
            }}
            className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden text-white animate-scaleUp">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">
                      Branch Code
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure operational branch identifier
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBranchCodeModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!branchCodeInput.trim()) return;
                  if (onUpdateBranchCode) {
                    onUpdateBranchCode(branchCodeInput.trim());
                  }
                  try {
                    localStorage.setItem('ai_loanguard_branch_code', branchCodeInput.trim());
                  } catch (err) {}
                  setBranchCodeToast(`✓ Branch Code updated to ${branchCodeInput.trim()} successfully!`);
                  setTimeout(() => {
                    setBranchCodeToast('');
                    setShowBranchCodeModal(false);
                  }, 1200);
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl space-y-1">
                  <div className="text-slate-300 font-semibold text-xs flex items-center justify-between">
                    <span>Operational Branch Code:</span>
                    <span className="font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded tracking-widest">
                      {showBranchCode ? branchCode || '111222' : '••••••'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Bank Managers and Credit Verification Officers can enter and update the operational branch code.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Enter Branch Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBranchCode(!showBranchCode)}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
                    >
                      {showBranchCode ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type={showBranchCode ? 'text' : 'password'}
                    required
                    autoComplete="off"
                    value={branchCodeInput}
                    onChange={(e) => setBranchCodeInput(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
                    placeholder="Enter branch code"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-amber-300 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                {branchCodeToast && (
                  <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold text-center animate-fadeIn">
                    {branchCodeToast}
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Save Branch Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBranchCodeInput('');
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="Clear input"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  // Edit Profile Modal (Available in Client, Officer, and Manager portals)
  const editProfileModal =
    showEditProfileModal && typeof document !== 'undefined'
      ? createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowEditProfileModal(false);
            }}
            className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          >
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-scaleUp">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Edit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Edit User Profile</h3>
                    <p className="text-[11px] text-slate-500">
                      Update your identity, credentials, and account details
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
                {/* User Avatar & Profile Photo Upload (JPG, JPEG, PNG with preview & persistence) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-3.5">
                    <div className="relative group shrink-0">
                      {editAvatar ? (
                        <img
                          src={editAvatar}
                          alt={editName || 'Profile Photo'}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                          {editName.trim().charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition cursor-pointer"
                        title="Upload Profile Photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{editName || 'Portal User'}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {isManager
                          ? 'Senior Branch Credit Manager'
                          : isOfficer
                          ? 'Credit Verification Officer'
                          : 'Retail / MSME Borrower'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {selectedPhotoName ? `Selected: ${selectedPhotoName}` : 'Supported: JPG, JPEG, PNG (Max 5MB)'}
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        onChange={handleAvatarFileSelect}
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center space-x-1 shadow-xs transition cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{editAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>
                        {editAvatar && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditAvatar(null);
                              setSelectedPhotoName('');
                              if (avatarInputRef.current) avatarInputRef.current.value = '';
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {avatarUploadError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-bold flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{avatarUploadError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number (2FA)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role / Designation
                    </label>
                    <input
                      type="text"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                      placeholder="e.g. Credit Officer"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Branch / Banking Circle
                    </label>
                    <input
                      type="text"
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value)}
                      placeholder="e.g. Chennai Circle"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {profileSavedToast && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center space-x-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileSavedToast}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <header className="bg-[#0c1e3d] border-b border-sky-900/60 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Portal Type */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() =>
              setActiveTab(
                isManager
                  ? 'underwriter'
                  : isOfficer
                  ? 'officer_queue'
                  : 'client_apply'
              )
            }
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20 text-slate-950 font-black">
              <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">AI-LoanGuard</span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    isManager
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : isOfficer
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  }`}
                >
                  {isManager
                    ? 'Bank Manager Portal'
                    : isOfficer
                    ? 'Loan Officer Portal'
                    : 'Client Loan Portal'}
                </span>
              </div>
            </div>
          </div>

          {/* Role-Specific Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-1">
            {/* 1. BANK MANAGER TABS */}
            {isManager && (
              <>
                <button
                  onClick={() => setActiveTab('underwriter')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'underwriter'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Credit Underwriter</span>
                </button>

                <button
                  onClick={() => setActiveTab('applications')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'applications'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Applications & Overrides</span>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'analytics'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Model & Fairness</span>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'security'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>Security Center</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Profile</span>
                </button>
              </>
            )}

            {/* 2. LOAN OFFICER TABS */}
            {isOfficer && (
              <>
                <button
                  onClick={() => setActiveTab('officer_queue')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'officer_queue'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Officer Verification Queue</span>
                </button>

                <button
                  onClick={() => setActiveTab('applications')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'applications'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>All Applications</span>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'analytics'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Model & Bias</span>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'security'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>Security Center</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-sky-500 text-slate-950 shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Profile</span>
                </button>
              </>
            )}

            {/* 3. CLIENT TABS */}
            {isClient && (
              <>
                <button
                  onClick={() => setActiveTab('client_apply')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'client_apply'
                      ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Apply for Loan</span>
                </button>

                <button
                  onClick={() => setActiveTab('client_status')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'client_status'
                      ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Application Status</span>
                </button>

                <button
                  onClick={() => setActiveTab('client_health')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'client_health'
                      ? 'bg-sky-400 text-slate-950 shadow-xs font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Eligibility & Credit Health</span>
                </button>

                <button
                  onClick={() => setActiveTab('client_calculator')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'client_calculator'
                      ? 'bg-sky-400 text-slate-950 shadow-xs font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>EMI Calculator</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-sky-400 text-slate-950 shadow-xs font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Profile</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            {/* AI Chatbot Button in Header - Available in ALL Portals */}
            {onOpenChatbot && (
              <button
                type="button"
                onClick={onOpenChatbot}
                title="Open AI Portal Chatbot"
                className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 border border-amber-300 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden md:inline">AI Chatbot</span>
              </button>
            )}

            {/* Security Checkup Button in Header - SHOWN ONLY FOR MANAGER & OFFICER (Removed from Client Portal) */}
            {!isClient && (
              <button
                onClick={() => setShowCheckupModal(true)}
                title="Run Security Checkup"
                className="flex items-center space-x-1.5 bg-sky-950/90 hover:bg-sky-900 text-sky-200 border border-sky-600/70 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Security Checkup</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-1 py-0.2 rounded">
                  98%
                </span>
              </button>
            )}

            {/* Preset Banking Profiles / Sample Cases - STRICTLY for Bank Manager ONLY */}
            {isManager && (
              <button
                type="button"
                onClick={() => setShowSampleCases(true)}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-200 border border-amber-500/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="View & test preset banking case studies"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sample Cases</span>
              </button>
            )}

            {/* Branch Code Badge & Change Option (Strictly for Manager & Officer Portals - Hidden Code) */}
            {(isManager || isOfficer) && (
              <button
                type="button"
                onClick={() => {
                  setBranchCodeInput('');
                  setShowBranchCode(false);
                  setShowBranchCodeModal(true);
                }}
                className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors shadow-xs"
                title="Click to enter or update branch code."
              >
                <Building className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 text-[11px] hidden sm:inline">Branch:</span>
                <span className="font-mono font-black text-amber-300 text-[11px] bg-slate-900/90 px-1.5 py-0.2 rounded border border-slate-700 tracking-widest">
                  ••••••
                </span>
                <span className="text-[10px] text-sky-400 underline font-semibold hidden md:inline ml-0.5">
                  Enter Code
                </span>
              </button>
            )}

            {/* User Profile Pill with Edit Option (Available in both Client, Officer, and Manager portals) */}
            <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700/80 px-2 py-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setShowEditProfileModal(true)}
                className="flex items-center space-x-2 cursor-pointer hover:opacity-90 transition-opacity"
                title="Click to Edit Profile"
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-lg object-cover shrink-0 shadow-xs border border-amber-400"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {(currentUser?.name || 'U').trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden xl:block text-left text-xs leading-tight">
                  <div className="font-bold text-slate-200 truncate max-w-[110px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                    {currentUser.role}
                  </div>
                </div>
              </button>

              {/* Edit Profile Button Icon */}
              <button
                type="button"
                onClick={() => setShowEditProfileModal(true)}
                className="p-1 hover:bg-slate-700 rounded-lg text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Edit Profile"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Prominent Log Out Button */}
            <button
              onClick={onLogout}
              title="Sign out of portal"
              className="flex items-center space-x-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Loaded Case Study Toast Notice */}
        {loadedCaseNotice && (
          <div className="py-1 px-3 bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-between rounded-lg mb-1 animate-fadeIn">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
              <span>Loaded Preset: {loadedCaseNotice} into Credit Underwriter</span>
            </div>
            <button
              onClick={() => setLoadedCaseNotice('')}
              className="text-slate-900 font-bold px-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center overflow-x-auto py-2 space-x-2 border-t border-slate-800 scrollbar-none text-xs">
          {isManager && (
            <>
              <button
                onClick={() => setActiveTab('underwriter')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'underwriter' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Underwriter
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'applications' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Applications
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'analytics' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'security' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'profile' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Profile
              </button>
            </>
          )}

          {isOfficer && (
            <>
              <button
                onClick={() => setActiveTab('officer_queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'officer_queue' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Officer Queue
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'applications' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Applications
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'analytics' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Model Bias
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'profile' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Profile
              </button>
            </>
          )}

          {isClient && (
            <>
              <button
                onClick={() => setActiveTab('client_apply')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  activeTab === 'client_apply' ? 'bg-indigo-500 text-white font-black' : 'text-slate-300'
                }`}
              >
                Apply for Loan
              </button>
              <button
                onClick={() => setActiveTab('client_status')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  activeTab === 'client_status' ? 'bg-indigo-500 text-white font-bold' : 'text-slate-300'
                }`}
              >
                Application Status
              </button>
              <button
                onClick={() => setActiveTab('client_health')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'client_health' ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Credit Health
              </button>
              <button
                onClick={() => setActiveTab('client_calculator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'client_calculator' ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                EMI Calculator
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === 'profile' ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Profile
              </button>
            </>
          )}

          {/* Edit Profile button on mobile */}
          <button
            onClick={() => setShowEditProfileModal(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800 whitespace-nowrap flex items-center space-x-1"
          >
            <Edit className="w-3 h-3 text-amber-400" />
            <span>Edit Profile</span>
          </button>

          {/* Mobile Sample Cases button - STRICTLY for Manager ONLY */}
          {isManager && (
            <button
              onClick={() => setShowSampleCases(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800 whitespace-nowrap flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Sample Cases</span>
            </button>
          )}

          {/* Mobile Change Branch Code button (Manager & Officer Only - Hidden Code) */}
          {(isManager || isOfficer) && (
            <button
              onClick={() => {
                setBranchCodeInput('');
                setShowBranchCode(false);
                setShowBranchCodeModal(true);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800 whitespace-nowrap flex items-center space-x-1"
            >
              <Building className="w-3 h-3 text-amber-400" />
              <span>Branch Code (••••••)</span>
            </button>
          )}

          {/* Mobile Log Out button */}
          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-300 bg-rose-950/80 border border-rose-800 whitespace-nowrap flex items-center space-x-1"
          >
            <LogOut className="w-3 h-3" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Render Sample Cases Portal Modal */}
      {sampleCasesModal}

      {/* Render Edit Profile Modal */}
      {editProfileModal}

      {/* Render Branch Code Change Modal (Manager & Officer Only) */}
      {branchCodeModal}

      {/* Security Checkup Modal - for Manager and Officer */}
      {showCheckupModal && !isClient && (
        <SecurityCheckupModal
          currentUser={currentUser}
          onClose={() => setShowCheckupModal(false)}
          onUpdatePhone={onUpdatePhone}
        />
      )}
    </header>
  );
};
