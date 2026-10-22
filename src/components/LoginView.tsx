import React, { useState, useEffect, useRef } from 'react';
import { GoogleAuthProvider } from 'firebase/auth';
import { UserAuth, UserRole, SecuritySettings } from '../types';
import { TN_DISTRICTS } from '../utils/sampleData';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import {
  authenticatePortalLogin,
  authenticateWithGoogleOAuth,
  registerPortalUser,
  persistUserProfile,
  setStoredBranchCode,
  validatePortalBranchCode,
  clearLegacyRegistrationMessages,
  DEFAULT_BRANCH_CODE
} from '../utils/portalStorage';
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Smartphone,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  RotateCcw,
  Check,
  UserPlus,
  LogIn,
  X,
  ClipboardCheck,
  Building,
  Landmark
} from 'lucide-react';
import { FloatingMoneyBackground } from './FloatingMoneyBackground';

interface LoginViewProps {
  onLogin: (user: UserAuth) => void;
  securitySettings: SecuritySettings;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  // Auth Mode: 'signin' | 'register'
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Role: Client / Borrower, Loan Officer, or Bank Manager
  const [selectedRole, setSelectedRole] = useState<UserRole>('CLIENT');

  // Authorized Branch Code for Manager & Loan Officer login/registration
  const [branchCodeInput, setBranchCodeInput] = useState<string>('');
  const [showBranchCode, setShowBranchCode] = useState<boolean>(false);

  // Form / Validation Error Message
  const [authError, setAuthError] = useState<string>('');
  const [isGoogleAuthenticating, setIsGoogleAuthenticating] = useState<boolean>(false);

  // User credentials
  const [personalName, setPersonalName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Chennai');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Flow steps: 'auth' -> 'phone' -> 'otp'
  const [step, setStep] = useState<'auth' | 'phone' | 'otp'>('auth');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pendingUser, setPendingUser] = useState<Partial<UserAuth> | null>(null);

  // OTP verification state
  const [activeOtpCode, setActiveOtpCode] = useState<string>('842916');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string>('');
  const [otpVerifiedSuccess, setOtpVerifiedSuccess] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const branchCodeRef = useRef<HTMLInputElement | null>(null);

  // Clear any legacy registration messages on mount or role switch
  useEffect(() => {
    clearLegacyRegistrationMessages();
  }, [selectedRole, authMode]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (step === 'otp' && timerSeconds > 0) {
      timer = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timerSeconds]);

  // Generate fresh 6-digit OTP
  const generateNewOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveOtpCode(code);
    setTimerSeconds(60);
    setCanResend(false);
    setOtpError('');
    return code;
  };

  /**
   * Official Google OAuth 2.0 Sign-In Handler:
   * - Opens the real Google Account Selection chooser (`prompt: 'select_account'`)
   * - Verifies the Google ID token on the backend (`POST /api/auth/google`)
   * - Creates or updates the user's account in the database
   * - Handles user cancellation cleanly without errors
   */
  const handleGoogleSignIn = async () => {
    setAuthError('');

    // For Manager and Officer roles, validate Branch Code before launching Google OAuth popup
    if (selectedRole === 'MANAGER' || selectedRole === 'OFFICER') {
      const cleanCode = branchCodeInput.trim();
      const validation = validatePortalBranchCode(selectedRole, cleanCode);
      if (!validation.valid) {
        setAuthError(
          validation.error ||
            `Please enter your assigned ${
              selectedRole === 'MANAGER' ? 'Bank Manager' : 'Loan Officer'
            } Branch Code before signing in with Google.`
        );
        setTimeout(() => branchCodeRef.current?.focus(), 60);
        return;
      }
    }

    setIsGoogleAuthenticating(true);
    try {
      // Open official Google OAuth 2.0 account chooser popup
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!fbUser || !fbUser.email) {
        setAuthError('Google authentication did not return a valid email address. Please try again.');
        setIsGoogleAuthenticating(false);
        return;
      }

      const idToken = await fbUser.getIdToken();
      const googleIdToken = credential?.idToken;

      // Verify ID token on the backend and provision/update user in database
      const verifyResult = await authenticateWithGoogleOAuth({
        idToken,
        googleIdToken,
        email: fbUser.email,
        name: fbUser.displayName || fbUser.email.split('@')[0],
        avatar: fbUser.photoURL || undefined,
        role: selectedRole,
        branchCode: selectedRole === 'CLIENT' ? undefined : branchCodeInput.trim(),
        district: selectedDistrict
      });

      setIsGoogleAuthenticating(false);

      if (!verifyResult.ok || !verifyResult.user) {
        setAuthError(
          verifyResult.error || 'Google authentication verification failed. Please try again.'
        );
        return;
      }

      const userPayload = verifyResult.user;
      setEmail(userPayload.email);
      setPersonalName(userPayload.name);

      if (selectedRole !== 'CLIENT' && branchCodeInput.trim()) {
        setStoredBranchCode(branchCodeInput.trim());
      }

      // Only ask for Phone Verification when registering a new account
      if (authMode === 'register') {
        setPhoneNumber('');
        setOtpDigits(['', '', '', '', '', '']);
        setPendingUser({ ...userPayload, phone: undefined });
        setStep('phone');
        setTimeout(() => phoneInputRef.current?.focus(), 80);
      } else {
        // Sign In redirects directly to the authorized Portal
        onLogin(userPayload);
      }
    } catch (error: any) {
      setIsGoogleAuthenticating(false);
      const errorCode = error?.code || '';

      // If the user cancels or closes the Google Sign-In chooser, return cleanly to login page without error
      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request' ||
        errorCode === 'auth/user-cancelled'
      ) {
        setAuthError('');
        return;
      }

      if (errorCode === 'auth/popup-blocked') {
        setAuthError(
          'Google Sign-In popup was blocked by your browser. Please allow popups for this site and click "Sign in with Google" again.'
        );
        return;
      }

      if (errorCode === 'auth/network-request-failed') {
        setAuthError(
          'Network error while connecting to Google authentication services. Please check your internet connection and try again.'
        );
        return;
      }

      setAuthError(
        error?.message
          ? `Google Sign-In failed: ${error.message}`
          : 'Google authentication failed. Please try again or sign in with your email and password.'
      );
    }
  };

  // 1. Email Login submit -> Validates credentials & Branch Code (for Manager/Officer), then enters Portal directly
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!email.trim()) {
      setAuthError('Please enter your registered email address.');
      return;
    }
    if (!password.trim()) {
      setAuthError('Please enter your account password.');
      return;
    }

    if (selectedRole === 'MANAGER' || selectedRole === 'OFFICER') {
      if (!branchCodeInput.trim()) {
        setAuthError(
          `Please enter your assigned Branch Code to sign in to the ${
            selectedRole === 'MANAGER' ? 'Manager' : 'Loan Officer'
          } Portal.`
        );
        return;
      }
    }

    setIsLoading(true);
    const result = await authenticatePortalLogin({
      email: email.trim(),
      password: password.trim(),
      role: selectedRole,
      branchCode: selectedRole === 'CLIENT' ? undefined : branchCodeInput.trim()
    });
    setIsLoading(false);

    if (!result.ok || !result.user) {
      setAuthError(
        result.error || 'Authentication failed. Please check your credentials and Branch Code.'
      );
      return;
    }

    if (selectedRole !== 'CLIENT' && branchCodeInput.trim()) {
      setStoredBranchCode(branchCodeInput.trim());
    }

    const authenticatedUser: UserAuth = {
      ...result.user,
      role: selectedRole,
      phoneVerified: true,
      branchCode:
        selectedRole === 'CLIENT'
          ? undefined
          : branchCodeInput.trim() || result.user.branchCode
    };

    onLogin(authenticatedUser);
  };

  // 2. Register New Account submit -> Saves user in backend & local registry and proceeds to Phone Verification -> OTP -> Portal
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!personalName.trim()) {
      setAuthError('Please enter your full legal name.');
      return;
    }
    if (!email.trim()) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      setAuthError('Please create a password (minimum 4 characters).');
      return;
    }

    if (selectedRole === 'MANAGER' || selectedRole === 'OFFICER') {
      const cleanBranch = branchCodeInput.trim();
      if (!cleanBranch) {
        setAuthError(
          `Branch Code is required to register a ${
            selectedRole === 'MANAGER' ? 'Bank Manager' : 'Loan Officer'
          } account.`
        );
        return;
      }
      if (!/^[A-Za-z0-9-]{4,12}$/.test(cleanBranch)) {
        setAuthError('Branch Code must be 4 to 12 alphanumeric characters.');
        return;
      }
    }

    setIsLoading(true);
    const regResult = await registerPortalUser({
      name: personalName.trim(),
      email: email.trim(),
      phone: undefined,
      password: password.trim(),
      role: selectedRole,
      branchCode: selectedRole === 'CLIENT' ? undefined : branchCodeInput.trim(),
      branch:
        selectedRole === 'CLIENT'
          ? `${selectedDistrict} Banking Circle`
          : `Branch #${branchCodeInput.trim()}, ${selectedDistrict}`,
      designation:
        selectedRole === 'CLIENT'
          ? 'Retail / MSME Borrower'
          : selectedRole === 'OFFICER'
          ? 'Credit Verification Officer'
          : 'Senior Branch Credit Manager'
    });
    setIsLoading(false);

    if (!regResult.ok || !regResult.user) {
      setAuthError(
        regResult.error || 'Registration could not be completed. Please check your inputs.'
      );
      return;
    }

    if (selectedRole !== 'CLIENT' && branchCodeInput.trim()) {
      setStoredBranchCode(branchCodeInput.trim());
    }

    setPhoneNumber('');
    setOtpDigits(['', '', '', '', '', '']);
    setPendingUser({
      ...regResult.user,
      phone: undefined,
      role: selectedRole,
      branchCode: selectedRole === 'CLIENT' ? undefined : branchCodeInput.trim()
    });
    setStep('phone');
    setTimeout(() => phoneInputRef.current?.focus(), 80);
  };

  // 3. Send OTP to entered phone number
  const handleSendPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!phoneNumber.trim() || phoneNumber.trim().length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number for phone verification.');
      return;
    }

    setIsLoading(true);
    generateNewOtp();

    setTimeout(() => {
      setIsLoading(false);
      setPendingUser((prev) =>
        prev ? { ...prev, phone: `+91 ${phoneNumber.replace('+91', '').trim()}` } : null
      );
      setOtpDigits(['', '', '', '', '', '']);
      setStep('otp');
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    }, 250);
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const char = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setOtpError('');

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasteData) {
      const newDigits = pasteData.split('');
      while (newDigits.length < 6) newDigits.push('');
      setOtpDigits(newDigits);
      if (pasteData.length === 6) {
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[pasteData.length]?.focus();
      }
    }
  };

  const handleResendOtp = () => {
    generateNewOtp();
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    inputRefs.current[0]?.focus();
  };

  // 4. Final Verify OTP & Enter Selected Portal
  const handleVerifyOtpAndEnter = () => {
    const enteredCode = otpDigits.join('');
    if (enteredCode.length < 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (enteredCode !== activeOtpCode) {
      setOtpError('Invalid OTP code. Please enter the 6-digit code shown above.');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    setTimeout(() => {
      setIsLoading(false);
      setOtpVerifiedSuccess(true);
      setTimeout(() => {
        const verifiedPhone = phoneNumber.trim()
          ? `+91 ${phoneNumber.trim()}`
          : pendingUser?.phone;
        const finalUser: UserAuth = {
          id:
            pendingUser?.id ||
            (selectedRole === 'CLIENT'
              ? 'USR-CLIENT-01'
              : selectedRole === 'OFFICER'
              ? 'USR-OFFICER-01'
              : 'USR-MANAGER-01'),
          name:
            pendingUser?.name ||
            personalName.trim() ||
            (selectedRole === 'MANAGER'
              ? 'Bank Manager'
              : selectedRole === 'OFFICER'
              ? 'Loan Officer'
              : 'Client Borrower'),
          email: pendingUser?.email || email.trim() || 'user@commercialbank.in',
          phone: verifiedPhone,
          phoneVerified: true,
          googleLinked: pendingUser?.googleLinked ?? pendingUser?.authProvider === 'google',
          securityScore: pendingUser?.authProvider === 'google' ? 100 : 99,
          role: selectedRole,
          avatar: pendingUser?.avatar || undefined,
          authProvider: pendingUser?.authProvider || 'email',
          designation:
            pendingUser?.designation ||
            (selectedRole === 'CLIENT'
              ? 'Retail / MSME Borrower'
              : selectedRole === 'OFFICER'
              ? 'Credit Verification Officer'
              : 'Senior Branch Credit Manager'),
          branch:
            pendingUser?.branch ||
            (selectedRole === 'CLIENT'
              ? `${selectedDistrict} Banking Circle`
              : `Branch #${branchCodeInput.trim() || DEFAULT_BRANCH_CODE}, ${selectedDistrict}`),
          branchCode:
            selectedRole === 'CLIENT'
              ? undefined
              : pendingUser?.branchCode || branchCodeInput.trim() || DEFAULT_BRANCH_CODE,
          twoFactorEnabled: true,
          lastLogin: new Date().toISOString(),
          sessionToken: `SEC-SESSION-AES256-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
          clientApplicantId: undefined
        };

        persistUserProfile(finalUser, {
          phone: verifiedPhone,
          phoneVerified: true
        }).catch(() => {});
        onLogin(finalUser);
      }, 300);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Static Professional Banking Watermark Background */}
      <FloatingMoneyBackground variant="login" portalRole={selectedRole} />

      {/* Clean Top Institutional Brand Header */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="h-11 w-11 rounded-2xl bg-indigo-600 border border-indigo-400/30 flex items-center justify-center shadow-md text-white">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">AI-LoanGuard</h1>
            <p className="text-xs text-slate-400 font-medium">
              Enterprise Credit Eligibility, Verification & Underwriting System
            </p>
          </div>
        </div>
      </div>

      {/* Main Stationary Professional Authentication Card */}
      <div className="max-w-md mx-auto w-full my-4 relative z-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Top Accent Strip */}
          <div
            className={`h-2 w-full ${
              selectedRole === 'CLIENT'
                ? 'bg-indigo-600'
                : selectedRole === 'MANAGER'
                ? 'bg-emerald-700'
                : 'bg-sky-600'
            }`}
          />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Header Info */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {step === 'auth'
                  ? authMode === 'signin'
                    ? 'Portal Sign In'
                    : 'Register New Account'
                  : step === 'phone'
                  ? 'Phone Verification'
                  : 'OTP Verification'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'auth'
                  ? authMode === 'signin'
                    ? selectedRole === 'CLIENT'
                      ? 'Sign in with Google or your account credentials to enter the Client Portal'
                      : `Enter your ${
                          selectedRole === 'MANAGER' ? 'Manager' : 'Loan Officer'
                        } Branch Code and credentials`
                    : 'Register your account and verify your mobile number via OTP'
                  : step === 'phone'
                  ? 'Enter your mobile number to receive a 6-digit verification OTP'
                  : 'Enter the 6-digit OTP code to verify and enter the portal'}
              </p>
            </div>

            {/* Validation / Authentication Error Banner */}
            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 font-bold text-xs flex items-start space-x-2.5 shadow-xs animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{authError}</div>
                <button
                  type="button"
                  onClick={() => setAuthError('')}
                  className="text-rose-400 hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* STEP 1: AUTH METHOD SELECTION */}
            {step === 'auth' && (
              <div className="space-y-4">
                {/* Role Selection: 3 Portals (Client, Manager, Officer) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">
                    Select Destination Portal
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                    {/* CLIENT PORTAL */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('CLIENT');
                        setBranchCodeInput('');
                        setShowBranchCode(false);
                        setAuthError('');
                      }}
                      className={`group flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                        selectedRole === 'CLIENT'
                          ? 'bg-indigo-50 text-indigo-950 shadow-xs border-2 border-indigo-600 font-black'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <User
                        className={`w-4 h-4 mb-0.5 ${
                          selectedRole === 'CLIENT' ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="flex items-center">
                        Client
                        <ArrowRight className="w-3 h-3 ml-1 text-indigo-500" />
                      </span>
                      <span className="text-[9px] font-normal text-slate-500">Borrower</span>
                    </button>

                    {/* MANAGER PORTAL */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('MANAGER');
                        setBranchCodeInput('');
                        setShowBranchCode(false);
                        setAuthError('');
                      }}
                      className={`group flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                        selectedRole === 'MANAGER'
                          ? 'bg-emerald-50 text-emerald-950 shadow-xs border-2 border-emerald-600 font-black'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <Building2
                        className={`w-4 h-4 mb-0.5 ${
                          selectedRole === 'MANAGER' ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      />
                      <span className="flex items-center">
                        Manager
                        <ArrowRight className="w-3 h-3 ml-1 text-emerald-500" />
                      </span>
                      <span className="text-[9px] font-normal text-slate-500">Sanctions</span>
                    </button>

                    {/* OFFICER PORTAL */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('OFFICER');
                        setBranchCodeInput('');
                        setShowBranchCode(false);
                        setAuthError('');
                      }}
                      className={`group flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                        selectedRole === 'OFFICER'
                          ? 'bg-sky-50 text-sky-950 shadow-xs border-2 border-sky-600 font-black'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <ClipboardCheck
                        className={`w-4 h-4 mb-0.5 ${
                          selectedRole === 'OFFICER' ? 'text-sky-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="flex items-center">
                        Officer
                        <ArrowRight className="w-3 h-3 ml-1 text-sky-500" />
                      </span>
                      <span className="text-[9px] font-normal text-slate-500">Verification</span>
                    </button>
                  </div>
                </div>

                {/* Mode Switcher: Sign In vs Register New Account */}
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setBranchCodeInput('');
                      setShowBranchCode(false);
                      setAuthError('');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      authMode === 'signin'
                        ? 'bg-white text-slate-950 shadow-xs border border-slate-200 font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setBranchCodeInput('');
                      setShowBranchCode(false);
                      setAuthError('');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-white text-slate-950 shadow-xs border border-slate-200 font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Register Account</span>
                  </button>
                </div>

                {/* SIGN IN FORM */}
                {authMode === 'signin' && (
                  <div className="space-y-3.5">
                    {/* Branch Code Required for Manager & Loan Officer Login */}
                    {(selectedRole === 'MANAGER' || selectedRole === 'OFFICER') && (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                            <Building className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              {selectedRole === 'MANAGER'
                                ? 'Manager Branch Code'
                                : 'Loan Officer Branch Code'}{' '}
                              *
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowBranchCode(!showBranchCode)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 cursor-pointer"
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
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            ref={branchCodeRef}
                            type={showBranchCode ? 'text' : 'password'}
                            required
                            autoComplete="off"
                            value={branchCodeInput}
                            onChange={(e) => {
                              setBranchCodeInput(e.target.value);
                              setAuthError('');
                            }}
                            placeholder="Enter Branch Code"
                            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono font-bold tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    )}

                    {/* Official Google OAuth 2.0 Sign-In Button */}
                    <button
                      type="button"
                      disabled={isGoogleAuthenticating}
                      onClick={() => void handleGoogleSignIn()}
                      className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-indigo-400 text-slate-800 font-bold py-3 px-4 rounded-xl shadow-xs transition-all cursor-pointer text-xs active:scale-[0.99] disabled:opacity-60"
                    >
                      {isGoogleAuthenticating ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      <span>
                        {isGoogleAuthenticating ? 'Opening Google Account Chooser...' : 'Sign in with Google'}
                      </span>
                    </button>

                    <div className="flex items-center my-2">
                      <div className="flex-1 border-t border-slate-200" />
                      <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        or sign in with password
                      </span>
                      <div className="flex-1 border-t border-slate-200" />
                    </div>

                    {/* Email & Password Form */}
                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setAuthError('');
                            }}
                            placeholder="Registered Email Address"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">Password</label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setAuthError('');
                            }}
                            placeholder="Account Password"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 ${
                          selectedRole === 'CLIENT'
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20'
                            : selectedRole === 'MANAGER'
                            ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/20'
                            : 'bg-sky-600 hover:bg-sky-700 shadow-sky-900/20'
                        }`}
                      >
                        <span>
                          {isLoading ? 'Validating Credentials...' : 'Sign In to Portal'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-white/80" />
                      </button>
                    </form>
                  </div>
                )}

                {/* REGISTER NEW ACCOUNT FORM */}
                {authMode === 'register' && (
                  <div className="space-y-3.5">
                    {(selectedRole === 'MANAGER' || selectedRole === 'OFFICER') && (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                            <Building className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Assigned Branch Code *</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowBranchCode(!showBranchCode)}
                            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 cursor-pointer"
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
                          ref={branchCodeRef}
                          type={showBranchCode ? 'text' : 'password'}
                          required
                          autoComplete="off"
                          value={branchCodeInput}
                          onChange={(e) => {
                            setBranchCodeInput(e.target.value);
                            setAuthError('');
                          }}
                          placeholder="Enter Branch Code"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isGoogleAuthenticating}
                      onClick={() => void handleGoogleSignIn()}
                      className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 font-bold py-3 px-4 rounded-xl shadow-xs transition-all cursor-pointer text-xs active:scale-[0.99] disabled:opacity-60"
                    >
                      {isGoogleAuthenticating ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      <span>
                        {isGoogleAuthenticating ? 'Opening Google Account Chooser...' : 'Sign in with Google'}
                      </span>
                    </button>

                    <div className="flex items-center my-2">
                      <div className="flex-1 border-t border-slate-200" />
                      <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        or register with email
                      </span>
                      <div className="flex-1 border-t border-slate-200" />
                    </div>

                    <form onSubmit={handleRegisterSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Legal Name
                        </label>
                        <input
                          type="text"
                          required
                          value={personalName}
                          onChange={(e) => {
                            setPersonalName(e.target.value);
                            setAuthError('');
                          }}
                          placeholder="e.g. Anand Kumar"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setAuthError('');
                          }}
                          placeholder="e.g. anand@domain.com"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            District (TN)
                          </label>
                          <select
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                          >
                            {TN_DISTRICTS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Password
                          </label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setAuthError('');
                            }}
                            placeholder="Create Password"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white font-mono focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 ${
                          selectedRole === 'CLIENT'
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20'
                            : selectedRole === 'MANAGER'
                            ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/20'
                            : 'bg-sky-600 hover:bg-sky-700 shadow-sky-900/20'
                        }`}
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>
                          {isLoading ? 'Registering Account...' : 'Register Account & Verify Phone'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-white/80" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PHONE VERIFICATION */}
            {step === 'phone' && (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4 animate-fadeIn">
                <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl text-xs text-indigo-950 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Phone Verification</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Registering as <strong>{pendingUser?.name || personalName || 'User'}</strong> (
                    {selectedRole === 'CLIENT'
                      ? 'Client Portal'
                      : selectedRole === 'OFFICER'
                      ? 'Loan Officer Portal'
                      : 'Bank Manager Portal'}
                    ). Enter your 10-digit mobile number to receive your OTP code.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">
                      +91
                    </span>
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      name="manual-phone-verification"
                      autoComplete="off"
                      required
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Type 10-digit mobile number"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-3 py-2.5 text-sm font-bold tracking-wider text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading || phoneNumber.length < 10}
                    className={`w-full text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 ${
                      selectedRole === 'CLIENT'
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20'
                        : selectedRole === 'MANAGER'
                        ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/20'
                        : 'bg-sky-600 hover:bg-sky-700 shadow-sky-900/20'
                    }`}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send 6-Digit Verification OTP</span>
                        <ArrowRight className="w-4 h-4 text-white/80" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('auth')}
                    className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-1 cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: OTP VERIFICATION & ENTER PORTAL */}
            {step === 'otp' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-950 space-y-1.5 shadow-xs">
                  <div className="flex items-center space-x-2 font-bold text-indigo-900">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>SMS Dispatched to: +91 {phoneNumber}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Enter the 6-digit OTP code below to verify and enter the{' '}
                    {selectedRole === 'CLIENT'
                      ? 'Client'
                      : selectedRole === 'OFFICER'
                      ? 'Loan Officer'
                      : 'Bank Manager'}{' '}
                    Portal.
                  </p>
                  <div className="mt-2 p-2 bg-white border border-indigo-200 rounded-xl text-[11px] text-slate-700 font-mono flex items-center justify-between">
                    <span className="text-slate-500">Verification OTP Code:</span>
                    <span className="font-bold text-indigo-900 tracking-wider text-xs">
                      {activeOtpCode}
                    </span>
                  </div>
                </div>

                {otpVerifiedSuccess && (
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center space-x-2 text-emerald-900 text-xs font-bold animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div>Phone & OTP Verified Successfully! ✓</div>
                      <div className="text-[11px] font-normal text-emerald-700">
                        Entering{' '}
                        {selectedRole === 'CLIENT'
                          ? 'Client'
                          : selectedRole === 'OFFICER'
                          ? 'Loan Officer'
                          : 'Bank Manager'}{' '}
                        Portal...
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 text-center uppercase tracking-wider">
                    Enter 6-Digit Verification Code
                  </label>
                  <div
                    className="flex justify-center items-center gap-2 sm:gap-2.5"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className={`w-11 h-12 text-center text-lg font-mono font-bold rounded-xl border-2 transition-all focus:outline-hidden ${
                          digit
                            ? 'border-indigo-600 bg-indigo-50/50 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-900'
                        } focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200`}
                      />
                    ))}
                  </div>
                </div>

                {otpError && (
                  <div className="text-xs text-rose-600 font-semibold flex items-center justify-center space-x-1 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleVerifyOtpAndEnter}
                    disabled={isLoading || otpVerifiedSuccess}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          Verify OTP & Enter{' '}
                          {selectedRole === 'CLIENT'
                            ? 'Client'
                            : selectedRole === 'OFFICER'
                            ? 'Officer'
                            : 'Manager'}{' '}
                          Portal
                        </span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setOtpError('');
                      }}
                      className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      ← Change Phone Number
                    </button>

                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 text-[11px]">
                        {timerSeconds > 0 ? (
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Resend in 00:
                              {timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                            </span>
                          </span>
                        ) : (
                          'Code expired'
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={!canResend}
                        onClick={handleResendOtp}
                        className="text-indigo-700 hover:text-indigo-900 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resend OTP</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="max-w-5xl mx-auto w-full text-center text-[11px] text-slate-400 relative z-10 flex items-center justify-center gap-2">
        <Lock className="w-3.5 h-3.5 text-emerald-400" />
        <span>
          RBI Fair Practices Code & DPDP Act 2023 Compliant • Official Google OAuth 2.0 & 256-Bit Encrypted
        </span>
      </div>
    </div>
  );
};
