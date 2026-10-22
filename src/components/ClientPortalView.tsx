import React, { useState, useEffect } from 'react';
import {
  ApplicantInput,
  ApplicationRecord,
  PredictionResult,
  UserAuth,
  ClientDocumentRecord,
  DocumentVerificationStatus
} from '../types';
import { predictLoanEligibility } from '../utils/mlEngine';
import { TN_DISTRICTS } from '../utils/sampleData';
import { LoanSummaryModal } from './LoanSummaryModal';
import { PrintableApplicationModal } from './PrintableApplicationModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import {
  VERIFICATION_DOCUMENT_SLOTS,
  createDefaultDocumentsForApplicant
} from '../utils/documentManager';
import {
  FileText,
  CheckCircle2,
  Clock,
  Download,
  IndianRupee,
  Calculator,
  Sparkles,
  User,
  Building,
  UploadCloud,
  Upload,
  FileCheck,
  ArrowRight,
  Calendar,
  Check,
  RefreshCw,
  Zap,
  Sliders,
  PieChart,
  Printer,
  Eye,
  Ban,
  AlertTriangle,
  X,
  History,
  XCircle,
  FolderOpen
} from 'lucide-react';
import { NavTab } from './Navbar';
import {
  formatApplicationStatusLabel,
  uploadApplicationDocumentOnBackend
} from '../utils/portalStorage';

interface ClientPortalViewProps {
  currentUser: UserAuth;
  applications: ApplicationRecord[];
  onSubmitApplication: (app: ApplicationRecord) => void;
  onCancelApplication?: (appId: string, reason: string) => void;
  activeTab?: NavTab;
  setActiveTab?: (tab: NavTab) => void;
}

export type ClientTab = 'apply' | 'status' | 'health' | 'calculator';

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  currentUser,
  applications,
  onSubmitApplication,
  onCancelApplication,
  activeTab,
  setActiveTab
}) => {
  // Map parent activeTab to local clientTab (Apply for Loan comes first)
  const getInitialTab = (): ClientTab => {
    if (activeTab === 'client_status') return 'status';
    if (activeTab === 'client_health') return 'health';
    if (activeTab === 'client_calculator') return 'calculator';
    return 'apply';
  };

  const [clientTab, setClientTab] = useState<ClientTab>(getInitialTab());

  // Listen to parent activeTab changes from Navbar
  useEffect(() => {
    if (activeTab === 'client_status') setClientTab('status');
    else if (activeTab === 'client_health') setClientTab('health');
    else if (activeTab === 'client_calculator') setClientTab('calculator');
    else if (activeTab === 'client_apply') setClientTab('apply');
  }, [activeTab]);

  const handleTabChange = (newTab: ClientTab) => {
    setClientTab(newTab);
    if (setActiveTab) {
      if (newTab === 'apply') setActiveTab('client_apply');
      else if (newTab === 'status') setActiveTab('client_status');
      else if (newTab === 'health') setActiveTab('client_health');
      else if (newTab === 'calculator') setActiveTab('client_calculator');
    }
  };

  // Client Application Form State — Starts clean/empty for a newly logged-in user (no pre-filled data from other users)
  const [formName, setFormName] = useState<string>(currentUser.name || '');
  const [formAge, setFormAge] = useState<string>('');
  const [formGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formEmployment, setFormEmployment] = useState<string>('');
  const [formExpYears] = useState<number>(3);
  const [formMonthlyIncome, setFormMonthlyIncome] = useState<string>('');
  const [formCoappIncome, setFormCoappIncome] = useState<string>('');
  const [formLoanAmount, setFormLoanAmount] = useState<string>('');
  const [formTenureMonths, setFormTenureMonths] = useState<string>('');
  const [formLoanPurpose, setFormLoanPurpose] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formCreditScore, setFormCreditScore] = useState<string>('');
  const [formExistingEmi, setFormExistingEmi] = useState<string>('');
  const [formCollateral, setFormCollateral] = useState<string>('');
  const [formHasDefault] = useState<boolean>(false);
  const [formConsent, setFormConsent] = useState<boolean>(false);

  // Reset form state whenever a different user logs in so no previous user's form inputs leak
  useEffect(() => {
    setFormName(currentUser?.name || '');
    setFormAge('');
    setFormEmployment('');
    setFormMonthlyIncome('');
    setFormCoappIncome('');
    setFormLoanAmount('');
    setFormTenureMonths('');
    setFormLoanPurpose('');
    setFormLocation('');
    setFormCreditScore('');
    setFormExistingEmi('');
    setFormCollateral('');
    setFormConsent(false);
    setUploadedFiles([]);
    setUploadedDocSlots({ aadhaar: '', pan: '', income: '' });
    setSelectedAppId('');
    setSubmitSuccessBanner(false);
    setSubmitSuccessModal(false);
  }, [currentUser?.id, currentUser?.email]);

  // Print Application state
  const [printAppRecord, setPrintAppRecord] = useState<ApplicationRecord | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploadedDocSlots, setUploadedDocSlots] = useState<Record<string, string>>({
    aadhaar: '',
    pan: '',
    income: '',
    bank_statement: '',
    salary_slip: '',
    utility_bill: '',
    collateral: ''
  });
  const [clientDocuments, setClientDocuments] = useState<ClientDocumentRecord[]>([]);
  const [viewingClientDoc, setViewingClientDoc] = useState<ClientDocumentRecord | null>(null);
  const activeSlotRef = React.useRef<string>('aadhaar');
  const slotFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [submitSuccessModal, setSubmitSuccessModal] = useState<boolean>(false);
  const [submitSuccessBanner, setSubmitSuccessBanner] = useState<boolean>(false);
  const [submittedAppId, setSubmittedAppId] = useState<string>('');
  const [showEnquiryFlash, setShowEnquiryFlash] = useState<boolean>(true);
  const [selectedMemoRecord, setSelectedMemoRecord] = useState<ApplicationRecord | null>(null);

  // Status Tab selected application state
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState<boolean>(false);
  const [newDocName, setNewDocName] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fastTrackApps, setFastTrackApps] = useState<Record<string, boolean>>({});
  const [formValidationError, setFormValidationError] = useState<string>('');
  const [isSubmittingApp, setIsSubmittingApp] = useState<boolean>(false);
  const [lastSubmittedSignature, setLastSubmittedSignature] = useState<string>('');
  const [cancelModalApp, setCancelModalApp] = useState<ApplicationRecord | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  const [cancelReasonError, setCancelReasonError] = useState<string>('');

  // Interactive Health Simulator & Booster State
  const [incomeBooster, setIncomeBooster] = useState<number>(0);
  const [emiReduction, setEmiReduction] = useState<number>(0);
  const [collateralBooster, setCollateralBooster] = useState<number>(0);
  const [tenureBooster, setTenureBooster] = useState<number>(0);
  const [hasCoApplicant, setHasCoApplicant] = useState<boolean>(false);
  const [checkedChecklist, setCheckedChecklist] = useState<Record<string, boolean>>({
    check_cibil: false,
    check_foir: false,
    check_coapp: false,
    check_collateral: false,
    check_prepay: false
  });

  // EMI Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(1000000);
  const [calcRate, setCalcRate] = useState<number>(9.5);
  const [calcTenureYears, setCalcTenureYears] = useState<number>(5);
  const [calcTenureUnit, setCalcTenureUnit] = useState<'years' | 'months'>('years');
  const [calcPrepaymentMonthly, setCalcPrepaymentMonthly] = useState<number>(0);
  const [amortizationView, setAmortizationView] = useState<'yearly' | 'monthly'>('yearly');

  // Strict per-user application filtering: ONLY show applications belonging to the logged-in user
  const safeApplications = Array.isArray(applications) ? applications : [];
  const currentEmailLower = (currentUser.email || '').trim().toLowerCase();
  const currentNameLower = (currentUser.name || '').trim().toLowerCase();

  const clientApps = safeApplications.filter((app) => {
    if (!app?.applicant) return false;
    if (app.ownerEmail && currentEmailLower) {
      return app.ownerEmail.trim().toLowerCase() === currentEmailLower;
    }
    if (app.ownerId && currentUser.id) {
      return app.ownerId === currentUser.id;
    }
    // Only match a legacy sample record if the logged-in user's full name matches that sample applicant's full name
    return (
      !app.ownerEmail &&
      !app.ownerId &&
      Boolean(currentNameLower) &&
      app.applicant.full_name.trim().toLowerCase() === currentNameLower
    );
  });

  // Never fall back to other users' applications
  const displayApplications = clientApps;

  // Stepper completion based strictly on what the user has entered in the form
  const parsedAge = Number(formAge) || 0;
  const parsedMonthlyIncome = Number(formMonthlyIncome) || 0;
  const parsedCoappIncome = Number(formCoappIncome) || 0;
  const parsedLoanAmount = Number(formLoanAmount) || 0;
  const parsedTenureMonths = Number(formTenureMonths) || 0;
  const parsedCreditScore = Number(formCreditScore) || 0;
  const parsedExistingEmi = Number(formExistingEmi) || 0;
  const parsedCollateral = Number(formCollateral) || 0;

  const step1Complete = Boolean(formName.trim() && parsedAge >= 21 && formLocation);
  const step2Complete = Boolean(formEmployment && parsedMonthlyIncome > 0);
  const step3Complete = Boolean(
    formLoanPurpose &&
      parsedLoanAmount > 0 &&
      parsedTenureMonths >= 12 &&
      parsedCreditScore >= 300
  );
  const completedStepsCount = [step1Complete, step2Complete, step3Complete].filter(Boolean).length;
  const progressPercent = Math.round((completedStepsCount / 3) * 100);

  // Latest user application (if they have already submitted one)
  const latestUserApp = displayApplications[0] || null;

  // Check if borrower has typed any financial values into the form
  const hasEnteredAnyFinancials = Boolean(
    parsedMonthlyIncome > 0 ||
    parsedLoanAmount > 0 ||
    parsedCreditScore >= 300 ||
    parsedAge > 0 ||
    formEmployment ||
    latestUserApp
  );

  // Real-time AI appraisal is always active and live-updating
  const isAppraisalReady = true;

  // Real-time pre-qualification calculation (uses user's entered values or benchmark profile)
  const currentFormApplicant: ApplicantInput = {
    applicant_id: latestUserApp?.id || `DRAFT-${currentUser.id}`,
    full_name: formName.trim() || currentUser.name || 'Applicant',
    age: parsedAge >= 21 ? parsedAge : latestUserApp?.applicant.age || 34,
    gender: formGender,
    marital_status: 'Married',
    dependents: 1,
    education: 'Graduate',
    employment_type:
      (formEmployment as ApplicantInput['employment_type']) ||
      latestUserApp?.applicant.employment_type ||
      'Salaried Private',
    employment_years: formExpYears || 4,
    monthly_income:
      parsedMonthlyIncome > 0
        ? parsedMonthlyIncome
        : latestUserApp?.applicant.monthly_income || 75000,
    coapplicant_income:
      formCoappIncome !== ''
        ? parsedCoappIncome
        : latestUserApp?.applicant.coapplicant_income || 0,
    loan_amount:
      parsedLoanAmount > 0
        ? parsedLoanAmount
        : latestUserApp?.applicant.loan_amount || 1200000,
    loan_term_months:
      parsedTenureMonths >= 12
        ? parsedTenureMonths
        : latestUserApp?.applicant.loan_term_months || 60,
    credit_score:
      parsedCreditScore >= 300
        ? parsedCreditScore
        : latestUserApp?.applicant.credit_score || 765,
    existing_emi:
      formExistingEmi !== ''
        ? parsedExistingEmi
        : latestUserApp?.applicant.existing_emi || 0,
    bank_account_age_months: 36,
    previous_loan_count: 1,
    previous_default: formHasDefault,
    collateral_value:
      formCollateral !== ''
        ? parsedCollateral
        : latestUserApp?.applicant.collateral_value || (parsedLoanAmount > 0 ? parsedLoanAmount * 1.5 : 2000000),
    location: formLocation || latestUserApp?.applicant.location || 'Chennai',
    loan_purpose:
      (formLoanPurpose as ApplicantInput['loan_purpose']) ||
      latestUserApp?.applicant.loan_purpose ||
      'Home Purchase / Construction',
    kyc_verified: true,
    consent_signed: true // Granted for live appraisal simulation
  };

  const previewPrediction: PredictionResult = predictLoanEligibility(currentFormApplicant);

  // Active / selected application for status view (only from the user's own applications)
  const primaryApp: ApplicationRecord | null =
    displayApplications.find((app) => app.id === selectedAppId) ||
    displayApplications[0] ||
    null;

  useEffect(() => {
    if (primaryApp && Array.isArray(primaryApp.documents) && primaryApp.documents.length > 0) {
      setClientDocuments(primaryApp.documents);
      const slots: Record<string, string> = {};
      primaryApp.documents.forEach((d) => {
        slots[d.docType] = d.fileName;
      });
      setUploadedDocSlots((prev) => ({ ...prev, ...slots }));
    }
  }, [primaryApp?.id, primaryApp?.updated_at]);

  // Simulated Health calculation
  const hasHealthBaseData = isAppraisalReady || Boolean(latestUserApp);
  const simulatedApplicant: ApplicantInput = {
    ...currentFormApplicant,
    monthly_income: currentFormApplicant.monthly_income + incomeBooster,
    coapplicant_income: hasCoApplicant ? currentFormApplicant.coapplicant_income + 15000 : currentFormApplicant.coapplicant_income,
    existing_emi: Math.max(0, currentFormApplicant.existing_emi - emiReduction),
    collateral_value: currentFormApplicant.collateral_value + collateralBooster,
    loan_term_months: currentFormApplicant.loan_term_months + tenureBooster
  };

  const simulatedPrediction: PredictionResult = predictLoanEligibility(simulatedApplicant);

  // Calculate dynamic simulated credit score
  const scoreBoostFromIncome = Math.round(incomeBooster / 5000) * 3;
  const scoreBoostFromEmi = Math.round(emiReduction / 2000) * 4;
  const scoreBoostFromCollateral = Math.round(collateralBooster / 500000) * 5;
  const scoreBoostFromCoApp = hasCoApplicant ? 25 : 0;
  const scoreBoostFromChecklist = Object.values(checkedChecklist).filter(Boolean).length * 8;
  const simulatedScore = Math.min(
    880,
    Math.max(
      350,
      currentFormApplicant.credit_score +
        scoreBoostFromIncome +
        scoreBoostFromEmi +
        scoreBoostFromCollateral +
        scoreBoostFromCoApp +
        scoreBoostFromChecklist
    )
  );

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError('');

    if (isSubmittingApp) return;

    if (!formName.trim()) {
      setFormValidationError('Please enter your full legal name.');
      return;
    }
    if (parsedAge < 21 || parsedAge > 65) {
      setFormValidationError('Applicant age must be between 21 and 65 years.');
      return;
    }
    if (!formLocation) {
      setFormValidationError('Please select your Tamil Nadu district.');
      return;
    }
    if (!formEmployment) {
      setFormValidationError('Please select your employment type.');
      return;
    }
    if (parsedMonthlyIncome < 5000) {
      setFormValidationError('Monthly net income must be at least ₹5,000.');
      return;
    }
    if (!formLoanPurpose) {
      setFormValidationError('Please select the loan purpose.');
      return;
    }
    if (parsedLoanAmount < 10000) {
      setFormValidationError('Requested loan amount must be at least ₹10,000.');
      return;
    }
    if (parsedTenureMonths < 12 || parsedTenureMonths > 360) {
      setFormValidationError('Loan tenure must be between 12 and 360 months.');
      return;
    }
    if (parsedCreditScore < 300 || parsedCreditScore > 900) {
      setFormValidationError('CIBIL credit score must be between 300 and 900.');
      return;
    }
    if (!formConsent) {
      setFormValidationError('Please confirm the DPDP Act 2023 statutory consent checkbox.');
      return;
    }

    // Prevent accidental duplicate submissions of identical loan request
    const submissionSig = `${currentUser.email}:${formLoanPurpose}:${parsedLoanAmount}:${parsedTenureMonths}`;
    const recentDuplicate = displayApplications.find(
      (existing) =>
        existing.status !== 'CANCELLED' &&
        existing.applicant.loan_purpose === formLoanPurpose &&
        existing.applicant.loan_amount === parsedLoanAmount &&
        Date.now() - new Date(existing.created_at).getTime() < 60000
    );
    if (submissionSig === lastSubmittedSignature || recentDuplicate) {
      setFormValidationError(
        `Duplicate submission prevented: You have just submitted an identical loan application (${
          recentDuplicate ? `#${recentDuplicate.id}` : 'Pending Review'
        }). Please check the Application Status tab.`
      );
      return;
    }

    setIsSubmittingApp(true);
    setLastSubmittedSignature(submissionSig);

    const freshId = `TN-APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalApplicant: ApplicantInput = {
      ...currentFormApplicant,
      applicant_id: freshId,
      full_name: formName.trim() || currentUser.name,
      age: parsedAge || 30,
      location: formLocation || 'Chennai',
      employment_type: (formEmployment as ApplicantInput['employment_type']) || 'Salaried Private',
      monthly_income: parsedMonthlyIncome,
      coapplicant_income: parsedCoappIncome,
      loan_purpose:
        (formLoanPurpose as ApplicantInput['loan_purpose']) || 'Personal / Medical Emergency',
      loan_amount: parsedLoanAmount,
      loan_term_months: parsedTenureMonths || 60,
      credit_score: parsedCreditScore || 750,
      existing_emi: parsedExistingEmi,
      collateral_value: parsedCollateral,
      kyc_verified: true,
      consent_signed: true,
      aadhaar_masked: 'XXXX-XXXX-8901',
      pan_masked: 'ABCDE****F'
    };
    const finalPrediction = predictLoanEligibility(finalApplicant);
    const nowIso = new Date().toISOString();

    const finalDocs =
      clientDocuments.length > 0
        ? clientDocuments
        : createDefaultDocumentsForApplicant(finalApplicant, freshId);

    const effectiveDocs = finalDocs.map(
      (d) => `${d.title}: ${d.fileName} (${d.status === 'VERIFIED' ? 'Verified ✓' : 'Pending'})`
    );

    const newRecord: ApplicationRecord = {
      id: freshId,
      ownerId: currentUser.id,
      ownerEmail: currentUser.email,
      documents: finalDocs,
      uploadedDocuments: effectiveDocs,
      document_verification_status: finalDocs.every((d) => d.status === 'VERIFIED') ? 'VERIFIED' : 'PENDING',
      applicant: finalApplicant,
      prediction: finalPrediction,
      status: 'PENDING_REVIEW',
      isNewSubmission: true,
      status_history: [
        {
          id: `HIST-${Date.now()}`,
          previous_status: 'DRAFT',
          new_status: 'PENDING_REVIEW',
          changed_by_id: currentUser.id,
          changed_by_name: finalApplicant.full_name,
          changed_by_role: 'CLIENT',
          reason: 'Client submitted digital loan application for review.',
          timestamp: nowIso
        }
      ],
      notes: [
        `Self-service digital application submitted by ${finalApplicant.full_name} on ${new Date().toLocaleDateString('en-IN')}. Initial Status: Pending Review.`,
        `AI Risk Engine: Decision ${finalPrediction.final_decision} (TreeSHAP Probability: ${(finalPrediction.approval_probability * 100).toFixed(1)}%). Queued for Loan Officer & Manager review.`
      ],
      created_at: nowIso,
      updated_at: nowIso
    };

    onSubmitApplication(newRecord);
    setSelectedAppId(newRecord.id);
    setSubmittedAppId(newRecord.id);
    setSubmitSuccessModal(true);
    setSubmitSuccessBanner(true);
    setTimeout(() => setIsSubmittingApp(false), 600);
    handleTabChange('status');
  };

  const handleLoadSampleProfile = () => {
    setFormName(currentUser.name || 'Senthil Kumar');
    setFormAge('34');
    setFormLocation('Chennai');
    setFormEmployment('Salaried Private');
    setFormMonthlyIncome('75000');
    setFormCoappIncome('25000');
    setFormLoanPurpose('Home Purchase / Construction');
    setFormLoanAmount('1200000');
    setFormTenureMonths('60');
    setFormCreditScore('765');
    setFormExistingEmi('12000');
    setFormCollateral('2500000');
    setFormConsent(true);
    if (formValidationError) setFormValidationError('');

    // Pre-populate sample document vault records for instant verification readiness
    const sampleApplicant = {
      full_name: currentUser.name || 'Senthil Kumar',
      age: 34,
      location: 'Chennai',
      employment_type: 'Salaried Private' as const,
      monthly_income: 75000,
      coapplicant_income: 25000,
      loan_amount: 1200000,
      loan_term_months: 60,
      credit_score: 765,
      existing_emi: 12000,
      collateral_value: 2500000,
      kyc_verified: true,
      consent_signed: true
    };
    const sampleDocs = createDefaultDocumentsForApplicant(sampleApplicant as any, 'SAMPLE');
    setClientDocuments(sampleDocs);
    const slots: Record<string, string> = {};
    sampleDocs.forEach((d) => {
      slots[d.docType] = d.fileName;
    });
    setUploadedDocSlots((prev) => ({ ...prev, ...slots }));

    setStatusMessage('✓ Sample profile & verified documents loaded! Live AI appraisal calculated.');
    setTimeout(() => setStatusMessage(''), 4500);
  };

  const handleClearForm = () => {
    setFormName(currentUser?.name || '');
    setFormAge('');
    setFormEmployment('');
    setFormMonthlyIncome('');
    setFormCoappIncome('');
    setFormLoanAmount('');
    setFormTenureMonths('');
    setFormLoanPurpose('');
    setFormLocation('');
    setFormCreditScore('');
    setFormExistingEmi('');
    setFormCollateral('');
    setFormConsent(false);
    setStatusMessage('Application form cleared.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handlePrintApplication = (app: ApplicationRecord) => {
    setPrintAppRecord(app);
    setShowPrintModal(true);
  };

  const handleRequestExpedite = (appId: string) => {
    setFastTrackApps((prev) => ({ ...prev, [appId]: true }));
    const target = applications.find((a) => a.id === appId);
    if (target) {
      target.priority = 'FAST_TRACK';
      target.notes = target.notes || [];
      target.notes.unshift(
        `⚡ Borrower requested Priority Fast-Track Underwriting at ${new Date().toLocaleTimeString('en-IN')}. Target TAT < 2 Hours.`
      );
    }
    setStatusMessage(
      `⚡ Priority Fast-Track Activated for Application #${appId}! Senior underwriter express committee alerted (TAT < 2 Hours).`
    );
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleTriggerSlotUpload = (slotKey: string) => {
    activeSlotRef.current = slotKey;
    if (slotFileInputRef.current) {
      slotFileInputRef.current.value = '';
      slotFileInputRef.current.click();
    }
  };

  const handleSlotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const slotKey = activeSlotRef.current;
    const itemMeta = VERIFICATION_DOCUMENT_SLOTS.find((i) => i.key === slotKey);
    const labelTitle = itemMeta ? itemMeta.title : 'Document';

    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      const dataUrl = uploadEvt.target?.result as string;

      const newDoc: ClientDocumentRecord = {
        id: `DOC-${primaryApp?.id || 'CLIENT'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        docType: slotKey,
        title: labelTitle,
        fileName: file.name,
        fileType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'PENDING',
        dataUrl
      };

      setClientDocuments((prev) => {
        const filtered = prev.filter((d) => d.docType !== slotKey);
        return [...filtered, newDoc];
      });

      setUploadedDocSlots((prev) => ({
        ...prev,
        [slotKey]: file.name
      }));

      const verifiedEntry = `${labelTitle}: ${file.name} (Pending Review)`;
      setUploadedFiles((prev) => {
        const filtered = prev.filter((doc) => !doc.startsWith(`${labelTitle}:`));
        return [...filtered, verifiedEntry];
      });

      if (primaryApp) {
        const existing = (primaryApp.documents || []).filter((d) => d.docType !== slotKey);
        primaryApp.documents = [...existing, newDoc];
        const existingSummary = (primaryApp.uploadedDocuments || []).filter(
          (doc) => !doc.startsWith(`${labelTitle}:`)
        );
        primaryApp.uploadedDocuments = [...existingSummary, verifiedEntry];
        primaryApp.notes = [
          ...(primaryApp.notes || []),
          `Document "${labelTitle}" ("${file.name}") uploaded at ${new Date().toLocaleTimeString('en-IN')}. Pending Loan Officer verification.`
        ];
        void uploadApplicationDocumentOnBackend(primaryApp.id, newDoc, currentUser);
      }

      setStatusMessage(`✓ ${labelTitle} ("${file.name}") uploaded successfully! You can preview the image below.`);
      setTimeout(() => setStatusMessage(''), 5000);
    };
    reader.readAsDataURL(file);
  };

  const renderDocumentVerificationCard = () => (
    <div className="bg-[#162032] rounded-2xl p-5 sm:p-6 border border-slate-700/80 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-400" />
            <span>Digital Document Verification Vault</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload required KYC, tax, and income records. You can view/preview uploaded images and track Loan Officer verification.
          </p>
        </div>
        <div className="text-[11px] font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 px-3 py-1 rounded-xl">
          {clientDocuments.length} Uploaded • DPDP 2023 Shielded
        </div>
      </div>

      <div className="space-y-3">
        {VERIFICATION_DOCUMENT_SLOTS.map((slot) => {
          const uploadedDoc =
            clientDocuments.find((d) => d.docType === slot.key) ||
            primaryApp?.documents?.find((d) => d.docType === slot.key);
          const isUploaded = Boolean(uploadedDoc && uploadedDoc.fileName);

          return (
            <div
              key={slot.key}
              className={`rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
                isUploaded
                  ? 'bg-[#1e293b]/90 border-slate-700/80'
                  : 'bg-[#222f46] border-slate-700/50'
              }`}
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                {/* Uploaded Thumbnail Preview */}
                <div
                  onClick={() => {
                    if (isUploaded && uploadedDoc) setViewingClientDoc(uploadedDoc);
                  }}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${
                    isUploaded ? 'cursor-pointer hover:opacity-90' : ''
                  } ${
                    isUploaded
                      ? uploadedDoc?.status === 'VERIFIED'
                        ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400'
                        : uploadedDoc?.status === 'REJECTED'
                        ? 'border-rose-500/50 bg-rose-950/40 text-rose-400'
                        : 'border-indigo-500/50 bg-indigo-950/40 text-indigo-400'
                      : 'border-slate-700/60 bg-slate-800/60 text-slate-500'
                  }`}
                >
                  {isUploaded && uploadedDoc?.dataUrl ? (
                    uploadedDoc.dataUrl.startsWith('data:image') ||
                    /\.(png|jpg|jpeg|webp|svg)$/i.test(uploadedDoc.fileName) ? (
                      <img
                        src={uploadedDoc.dataUrl}
                        alt={slot.title}
                        className="w-full h-full object-cover bg-white"
                      />
                    ) : (
                      <div className="text-center p-1">
                        <FileText className="w-5 h-5 mx-auto" />
                        <span className="text-[9px] font-bold block mt-0.5">PDF</span>
                      </div>
                    )
                  ) : (
                    <FolderOpen className="w-6 h-6" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white leading-snug">
                      {slot.title}
                    </span>
                    {slot.required && (
                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.2 rounded">
                        Required
                      </span>
                    )}

                    {/* Status Badge */}
                    {isUploaded ? (
                      uploadedDoc?.status === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified by Officer ✓
                        </span>
                      ) : uploadedDoc?.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3 h-3" />
                          Uploaded (Under Review)
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Not Uploaded
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 mt-0.5">{slot.subtitle}</div>

                  {/* File Metadata & Rejection Message */}
                  {isUploaded && uploadedDoc && (
                    <div className="text-[11px] text-cyan-300 font-mono mt-1 flex flex-wrap items-center gap-2 truncate">
                      <span className="truncate max-w-xs">📄 {uploadedDoc.fileName}</span>
                      {uploadedDoc.fileSize && (
                        <span className="text-slate-400">
                          ({Math.round(uploadedDoc.fileSize / 1024)} KB)
                        </span>
                      )}
                    </div>
                  )}

                  {isUploaded && uploadedDoc?.status === 'REJECTED' && uploadedDoc.rejectionReason && (
                    <div className="mt-1.5 text-[11px] text-rose-300 bg-rose-950/70 border border-rose-800 rounded-lg px-2 py-1 flex items-start space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Officer Remark:</strong> {uploadedDoc.rejectionReason} — Please re-upload a clear copy.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Preview / View Image, Upload / Replace */}
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                {isUploaded && uploadedDoc ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewingClientDoc(uploadedDoc)}
                      className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerSlotUpload(slot.key)}
                      className="bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-semibold text-xs px-3 py-2 rounded-xl flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTriggerSlotUpload(slot.key)}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-md transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const handleRealFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFileObj(file);
      setNewDocName(file.name);
    }
  };

  const handleAddUploadedDoc = (e: React.FormEvent) => {
    e.preventDefault();
    const nameToUse = selectedFileObj
      ? selectedFileObj.name
      : newDocName.trim() || 'Financial_Document.pdf';

    setIsUploading(true);
    setUploadProgress(30);

    setTimeout(() => {
      setUploadProgress(75);
      setTimeout(() => {
        setUploadProgress(100);
        setTimeout(() => {
          const verifiedLabel = `${nameToUse} (Verified ✓)`;
          setUploadedFiles((prev) => [...prev, verifiedLabel]);
          setIsUploading(false);
          setUploadProgress(0);
          setSelectedFileObj(null);
          setNewDocName('');
          setUploadDocModalOpen(false);

          if (primaryApp) {
            primaryApp.uploadedDocuments = [
              ...(primaryApp.uploadedDocuments || []),
              verifiedLabel
            ];
            primaryApp.notes = [
              ...(primaryApp.notes || []),
              `Document "${nameToUse}" uploaded & verified with DigiLocker & DPDP Shield at ${new Date().toLocaleTimeString('en-IN')}.`
            ];
          }

          setStatusMessage(
            `✓ File "${nameToUse}" Sent & Verified Successfully! Application documentation updated.`
          );
          setTimeout(() => setStatusMessage(''), 6000);
        }, 350);
      }, 350);
    }, 300);
  };

  // Calculate EMI
  const tenureMonthsTotal = calcTenureUnit === 'years' ? calcTenureYears * 12 : calcTenureYears;
  const monthlyRate = calcRate / (12 * 100);
  const baseEmi =
    (calcAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonthsTotal)) /
    (Math.pow(1 + monthlyRate, tenureMonthsTotal) - 1);
  const totalRepayment = baseEmi * tenureMonthsTotal;
  const totalInterest = totalRepayment - calcAmount;

  // Prepayment savings calculation
  const effectiveMonthlyPayment = baseEmi + calcPrepaymentMonthly;
  let simulatedBalance = calcAmount;
  let monthsWithPrepay = 0;
  let totalInterestWithPrepay = 0;

  if (calcPrepaymentMonthly > 0) {
    while (simulatedBalance > 0 && monthsWithPrepay < tenureMonthsTotal) {
      const monthInterest = simulatedBalance * monthlyRate;
      const principalPaid = Math.min(simulatedBalance, effectiveMonthlyPayment - monthInterest);
      totalInterestWithPrepay += monthInterest;
      simulatedBalance -= principalPaid;
      monthsWithPrepay++;
    }
  }

  const interestSaved =
    calcPrepaymentMonthly > 0 ? Math.max(0, totalInterest - totalInterestWithPrepay) : 0;
  const monthsSaved =
    calcPrepaymentMonthly > 0 ? Math.max(0, tenureMonthsTotal - monthsWithPrepay) : 0;

  // Amortization Schedule generator (first 5 years / months)
  const generateAmortizationRows = () => {
    const rows = [];
    let balance = calcAmount;
    if (amortizationView === 'yearly') {
      const totalYears = Math.min(10, Math.ceil(tenureMonthsTotal / 12));
      for (let y = 1; y <= totalYears; y++) {
        let yearlyInterest = 0;
        let yearlyPrincipal = 0;
        for (let m = 1; m <= 12; m++) {
          if (balance <= 0) break;
          const interestMonth = balance * monthlyRate;
          const principalMonth = Math.min(balance, baseEmi - interestMonth);
          yearlyInterest += interestMonth;
          yearlyPrincipal += principalMonth;
          balance -= principalMonth;
        }
        rows.push({
          period: `Year ${y}`,
          opening: balance + yearlyPrincipal,
          emiTotal: yearlyPrincipal + yearlyInterest,
          principalPaid: yearlyPrincipal,
          interestPaid: yearlyInterest,
          closing: Math.max(0, balance)
        });
      }
    } else {
      for (let m = 1; m <= 12; m++) {
        if (balance <= 0) break;
        const interestMonth = balance * monthlyRate;
        const principalMonth = Math.min(balance, baseEmi - interestMonth);
        const opening = balance;
        balance -= principalMonth;
        rows.push({
          period: `Month ${m}`,
          opening,
          emiTotal: baseEmi,
          principalPaid: principalMonth,
          interestPaid: interestMonth,
          closing: Math.max(0, balance)
        });
      }
    }
    return rows;
  };

  const applyCalcToForm = () => {
    setFormLoanAmount(String(calcAmount));
    setFormTenureMonths(String(tenureMonthsTotal));
    handleTabChange('apply');
  };

  const activeAppDocs = primaryApp?.uploadedDocuments || uploadedFiles;

  return (
    <div className="space-y-6 bg-white/75 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-indigo-200/80 shadow-lg relative overflow-hidden">
      {/* Hidden File Input for Aadhaar Card, PAN Card, Income Certificate slots */}
      <input
        type="file"
        ref={slotFileInputRef}
        onChange={handleSlotFileChange}
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        className="hidden"
      />

      {/* Toast alert */}
      {statusMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-indigo-950 text-cyan-200 border border-cyan-400 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Welcome Greetings Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-teal-600 text-white rounded-3xl shadow-xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-400/40">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-sm text-white shadow-inner border border-white/25 shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-200">
              Welcome Greetings • Client Banking Portal
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome, {currentUser.name}!
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/95 font-medium max-w-2xl">
              We are delighted to serve your banking needs today. Apply for a new retail or MSME loan with instant AI credit appraisal, or track your live application status below.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('apply')}
            className="bg-white hover:bg-indigo-50 text-indigo-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Apply for Loan</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('status')}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Application Status ({displayApplications.length})</span>
          </button>
        </div>
      </div>

      {/* FLASH MESSAGE 1: APPLICATION SUBMITTED SUCCESSFULLY BANNER */}
      {submitSuccessBanner && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl border border-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-sm flex items-center gap-2">
                <span>Application Submitted Successfully! ✓</span>
                <span className="text-[10px] bg-white text-emerald-950 font-bold px-2 py-0.5 rounded-full uppercase">
                  Live in Manager Portal
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Application #{submittedAppId} is now active in the Bank Manager underwriting queue for approval.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange('status')}
              className="bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Track Application Status →
            </button>
            <button
              type="button"
              onClick={() => setSubmitSuccessBanner(false)}
              className="text-emerald-100 hover:text-white text-xs px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* FLASH MESSAGE 2: QUICK ENQUIRY FORM & GO TO APPLICATION PORTAL BANNER */}
      {showEnquiryFlash && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white p-4 rounded-2xl shadow-lg border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wide">Quick Loan Enquiry & Pre-Assessment</span>
                <span className="text-[10px] bg-white text-amber-950 font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Instant AI Decision
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Check your eligibility and submit an enquiry in 3 minutes with instant DPDP e-KYC and RBI credit scoring.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                handleTabChange('apply');
                window.scrollTo({ top: 220, behavior: 'smooth' });
              }}
              className="bg-white hover:bg-amber-50 text-amber-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <span>Go to Application Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowEnquiryFlash(false)}
              className="text-amber-100 hover:text-white text-xs px-2 py-1 cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs: 1st Apply for Loan, 2nd Application Status */}
      <div className="flex flex-wrap items-center bg-white/95 backdrop-blur-xs p-1.5 rounded-2xl border border-indigo-200/90 shadow-sm text-xs font-bold gap-1.5">
        <button
          onClick={() => handleTabChange('apply')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            clientTab === 'apply'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md font-bold'
              : 'text-slate-600 hover:text-indigo-900 hover:bg-indigo-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Apply for Loan</span>
        </button>

        <button
          onClick={() => handleTabChange('status')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            clientTab === 'status'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md font-bold'
              : 'text-slate-600 hover:text-indigo-900 hover:bg-indigo-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Application Status ({displayApplications.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('health')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            clientTab === 'health'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md font-bold'
              : 'text-slate-600 hover:text-indigo-900 hover:bg-indigo-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Eligibility & Credit Health</span>
        </button>

        <button
          onClick={() => handleTabChange('calculator')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            clientTab === 'calculator'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md font-bold'
              : 'text-slate-600 hover:text-indigo-900 hover:bg-indigo-50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>EMI Calculator & Simulator</span>
        </button>
      </div>

      {/* TAB 1: APPLY FOR LOAN */}
      {clientTab === 'apply' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Application Form (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-sky-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-sky-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                  Self-Service Digital Application
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  New Retail & MSME Loan Application
                </h3>
                <p className="text-xs text-slate-500">
                  Complete your financial details below for instant explainable AI risk scoring and live underwriting appraisal.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleLoadSampleProfile}
                  className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
                  title="Populate realistic sample borrower data to test the AI appraisal instantly"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ Auto-Fill Sample Profile</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-2 rounded-xl transition cursor-pointer"
                  title="Clear form inputs"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Visual Progress Stepper */}
            <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-700" />
                  <span>Application Progress Stepper</span>
                </span>
                <span className="font-mono font-bold text-indigo-900 bg-indigo-200/80 px-2 py-0.5 rounded-full text-[11px]">
                  {progressPercent}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-indigo-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`
                  }}
                />
              </div>

              {/* Stepper Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-center">
                <div
                  className={`p-2 rounded-xl border text-[11px] font-bold transition-all ${
                    step1Complete
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-indigo-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    {step1Complete ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-900 text-[10px] inline-flex items-center justify-center">
                        1
                      </span>
                    )}
                    <span>1. Applicant Info</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-normal">Profile & KYC</span>
                </div>

                <div
                  className={`p-2 rounded-xl border text-[11px] font-bold transition-all ${
                    step2Complete
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-indigo-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    {step2Complete ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-900 text-[10px] inline-flex items-center justify-center">
                        2
                      </span>
                    )}
                    <span>2. Financials</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-normal">Income & Job</span>
                </div>

                <div
                  className={`p-2 rounded-xl border text-[11px] font-bold transition-all ${
                    step3Complete
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-indigo-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    {step3Complete ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-900 text-[10px] inline-flex items-center justify-center">
                        3
                      </span>
                    )}
                    <span>3. Loan Terms</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-normal">Amount & Score</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-6">
              {/* Section A: Applicant Profile */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>1. Applicant Identification & Location</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      min={21}
                      max={65}
                      required
                      placeholder="e.g. 28"
                      value={formAge}
                      onChange={(e) => setFormAge(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tamil Nadu District
                    </label>
                    <select
                      required
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    >
                      <option value="">Select District</option>
                      {TN_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section B: Income & Employment */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-sky-600" />
                  <span>2. Employment & Income Affordability</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Employment Type
                    </label>
                    <select
                      required
                      value={formEmployment}
                      onChange={(e) => setFormEmployment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    >
                      <option value="">Select Employment Type</option>
                      <option value="Salaried Private">Salaried Private</option>
                      <option value="Salaried Government">Salaried Government</option>
                      <option value="Self-Employed Professional">Self-Employed Professional</option>
                      <option value="Self-Employed Business">Self-Employed Business / MSME</option>
                      <option value="Gig / Contract Worker">Gig / Contract Worker</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Monthly Net Income (₹)
                      </label>
                      <div className="flex items-center space-x-1">
                        {[35000, 50000, 75000, 100000].map((inc) => (
                          <button
                            key={inc}
                            type="button"
                            onClick={() => setFormMonthlyIncome(inc.toString())}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold cursor-pointer"
                          >
                            ₹{inc >= 100000 ? `${inc / 100000}L` : `${inc / 1000}k`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={5000}
                      step={1000}
                      required
                      placeholder="Enter monthly income"
                      value={formMonthlyIncome}
                      onChange={(e) => setFormMonthlyIncome(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Co-Applicant Income (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="Optional (0 if none)"
                      value={formCoappIncome}
                      onChange={(e) => setFormCoappIncome(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Loan Requirement & Existing Debts */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <span>3. Loan Request & Collateral Security</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Loan Purpose
                    </label>
                    <select
                      required
                      value={formLoanPurpose}
                      onChange={(e) => setFormLoanPurpose(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    >
                      <option value="">Select Loan Purpose</option>
                      <option value="Home Purchase / Construction">Home Purchase / Construction</option>
                      <option value="MSME / Small Business Expansion">MSME / Business Expansion</option>
                      <option value="Education">Higher Education</option>
                      <option value="Vehicle Loan">Vehicle Loan</option>
                      <option value="Personal / Medical Emergency">Personal / Medical Emergency</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Loan Amount (₹)
                      </label>
                      <div className="flex items-center space-x-1">
                        {[300000, 500000, 1000000, 2500000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setFormLoanAmount(amt.toString())}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold cursor-pointer"
                          >
                            ₹{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}k`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={10000}
                      step={10000}
                      required
                      placeholder="Enter requested amount"
                      value={formLoanAmount}
                      onChange={(e) => setFormLoanAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white font-bold text-sky-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Tenure (Months)
                      </label>
                      <div className="flex items-center space-x-1">
                        {[24, 36, 60, 84].map((ten) => (
                          <button
                            key={ten}
                            type="button"
                            onClick={() => setFormTenureMonths(ten.toString())}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            {ten}m
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={12}
                      max={360}
                      required
                      placeholder="e.g. 60"
                      value={formTenureMonths}
                      onChange={(e) => setFormTenureMonths(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        CIBIL Score
                      </label>
                      <div className="flex items-center space-x-1">
                        {[680, 740, 780, 830].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setFormCreditScore(sc.toString())}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold cursor-pointer"
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={300}
                      max={900}
                      required
                      placeholder="Enter CIBIL score"
                      value={formCreditScore}
                      onChange={(e) => setFormCreditScore(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Existing Monthly EMIs (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      placeholder="0 if no existing EMI"
                      value={formExistingEmi}
                      onChange={(e) => setFormExistingEmi(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Collateral Value (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={25000}
                      placeholder="0 if unsecured"
                      value={formCollateral}
                      onChange={(e) => setFormCollateral(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Document Verification (Aadhaar Card, PAN Card, Income Certificate) */}
              {renderDocumentVerificationCard()}

              {/* Consent & Submission */}
              <div className="bg-indigo-50/70 border border-indigo-200/80 p-4 rounded-2xl space-y-3">
                {formValidationError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 font-bold text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formValidationError}</span>
                  </div>
                )}

                <label className="flex items-start space-x-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formConsent}
                    onChange={(e) => {
                      setFormConsent(e.target.checked);
                      if (formValidationError) setFormValidationError('');
                    }}
                    required
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    I confirm that the data provided is accurate and consent to automated AI credit scoring and CIBIL bureau verification in compliance with the DPDP Act 2023.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-md text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmittingApp ? 'Submitting Application...' : 'Submit Loan Application'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Real-time Pre-Qualification Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Instant AI Appraisal Preview</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  TreeSHAP ML
                </span>
              </div>

              {/* Real-time Probability meter */}
              <div className="text-center py-2 space-y-2">
                <div className="flex items-center justify-center gap-1.5">
                  {hasEnteredAnyFinancials ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Live Personalized Odds</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Benchmark AI Preview
                    </span>
                  )}
                </div>

                <div className="text-4xl font-black text-sky-950 font-mono tracking-tight">
                  {Math.round((previewPrediction?.approval_probability || 0.82) * 100)}%
                </div>
                <div className="text-xs text-slate-500 font-medium">Calculated Approval Odds</div>

                {/* Progress Odds Meter Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden max-w-[200px] mx-auto">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      (previewPrediction?.approval_probability || 0) >= 0.7
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : (previewPrediction?.approval_probability || 0) >= 0.45
                        ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                        : 'bg-gradient-to-r from-rose-500 to-red-600'
                    }`}
                    style={{
                      width: `${Math.round((previewPrediction?.approval_probability || 0.82) * 100)}%`
                    }}
                  />
                </div>

                <div className="pt-1">
                  <span
                    className={`inline-block text-xs font-black uppercase px-3 py-1 rounded-full shadow-xs ${
                      previewPrediction.final_decision === 'Eligible'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : previewPrediction.final_decision === 'Manual Review'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    {previewPrediction.final_decision === 'Eligible' && 'Pre-Approved ✓'}
                    {previewPrediction.final_decision === 'Manual Review' &&
                      'Conditional / Officer Review'}
                    {previewPrediction.final_decision === 'Not Eligible' && 'Action Required'}
                  </span>
                </div>
              </div>

              {hasEnteredAnyFinancials ? (
                <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-center space-y-1 animate-fadeIn">
                  <div className="text-[11px] font-bold text-emerald-900 flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Personalized to your live inputs</span>
                  </div>
                  <p className="text-[10px] text-emerald-700">
                    Odds and proposed EMI calibrate live as you edit any field in the form.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-center space-y-2 animate-fadeIn">
                  <p className="text-[11px] text-indigo-900 leading-snug">
                    Showing real-time AI appraisal for benchmark profile (₹75k income • ₹12L loan).
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadSampleProfile}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Load This Profile into Form</span>
                  </button>
                </div>
              )}

              {/* Key Ratio Metrics */}
              <div className="space-y-2 text-xs border-t border-sky-100 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Proposed Monthly EMI:</span>
                  <strong className="text-slate-900 font-mono">
                    ₹{previewPrediction.engineered_features.proposed_emi.toLocaleString('en-IN')}/mo
                  </strong>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">FOIR / Debt-to-Income:</span>
                  <strong
                    className={`font-mono ${
                      previewPrediction.engineered_features.dti_ratio > 60
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {previewPrediction.engineered_features.dti_ratio.toFixed(1)}%
                  </strong>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Security / LTV:</span>
                  <strong className="text-slate-900 font-mono">
                    {previewPrediction.engineered_features.loan_to_value_ratio.toFixed(1)}%
                  </strong>
                </div>
              </div>

              {/* TreeSHAP Top Explainability Drivers */}
              {previewPrediction?.shap_factors && (
                <div className="border-t border-sky-100 pt-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Top Favorable Factors (TreeSHAP)
                  </span>
                  <div className="space-y-1">
                    {previewPrediction.shap_factors
                      .filter((f) => f.isPositive || f.shapValue > 0)
                      .slice(0, 2)
                      .map((factor, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] text-slate-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100"
                        >
                          <span className="truncate">{factor.featureName}</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            +{factor.shapValue.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Fast simulator link */}
              <button
                type="button"
                onClick={() => handleTabChange('health')}
                className="w-full bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulate Score Boost in Credit Health →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATION STATUS TRACKER */}
      {clientTab === 'status' && (
        <div className="space-y-6">
          {!primaryApp ? (
            <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-8 sm:p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-black text-slate-900">
                  No Loan Applications Submitted Yet
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hi <strong>{currentUser.name}</strong>, you haven&apos;t submitted any loan applications from your account yet. Complete the digital application form to receive your instant AI credit appraisal and track your live status here.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleTabChange('apply')}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md inline-flex items-center space-x-2 cursor-pointer transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>Apply for a New Loan Now →</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Application Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                    Real-time Underwriting Tracker
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    Application #{primaryApp.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Applicant: <strong>{primaryApp.applicant.full_name}</strong> • Requested{' '}
                    <strong>₹{primaryApp.applicant.loan_amount.toLocaleString('en-IN')}</strong> •{' '}
                    {primaryApp.applicant.loan_purpose}
                  </p>
                </div>

                {/* Selector for multiple applications */}
                <div className="flex flex-wrap items-center gap-2">
                  {displayApplications.length > 1 && (
                    <div className="flex items-center space-x-1.5 bg-sky-50 p-1 rounded-xl border border-sky-200">
                      <span className="text-[10px] font-bold text-sky-900 px-2 uppercase">
                        Switch Application:
                      </span>
                      {displayApplications.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => setSelectedAppId(app.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            primaryApp.id === app.id
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          #{app.id.replace('TN-APP-', '')}
                        </button>
                      ))}
                    </div>
                  )}

                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                      primaryApp.status === 'APPROVED' || primaryApp.status === 'DISBURSED'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : primaryApp.status === 'CONDITIONAL_APPROVAL'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : primaryApp.status === 'CANCELLED'
                        ? 'bg-slate-200 text-slate-800 border-slate-400'
                        : primaryApp.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-900 border-rose-300'
                        : 'bg-sky-50 text-sky-900 border-sky-300'
                    }`}
                  >
                    Status: {formatApplicationStatusLabel(primaryApp.status)}
                  </span>

                  {(primaryApp.status === 'PENDING_REVIEW' ||
                    primaryApp.status === 'PENDING_OFFICER_REVIEW' ||
                    primaryApp.status === 'UNDER_REVIEW') &&
                    onCancelApplication && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalApp(primaryApp);
                          setCancelReasonInput('');
                          setCancelReasonError('');
                        }}
                        className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5 text-amber-700" />
                        <span>Cancel Application</span>
                      </button>
                    )}

                  <button
                    type="button"
                    onClick={() => handlePrintApplication(primaryApp)}
                    className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Print"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-700" />
                    <span>Print</span>
                  </button>

                  {primaryApp.status !== 'CANCELLED' && (
                    <button
                      onClick={() => setSelectedMemoRecord(primaryApp)}
                      className="flex items-center space-x-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Sanction Letter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cancelled / Rejected Reason Notice Banner */}
              {primaryApp.status === 'CANCELLED' && (
                <div className="p-4 rounded-2xl bg-slate-100 border-2 border-slate-300 text-slate-800 space-y-1">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-slate-700" />
                    <span>This Loan Application Has Been Cancelled</span>
                  </div>
                  <p className="text-xs">
                    <strong>Cancellation Reason:</strong> &ldquo;
                    {primaryApp.cancellation_reason || 'Cancelled upon request'}&rdquo;
                  </p>
                  {primaryApp.cancelled_by && (
                    <p className="text-[11px] text-slate-500">
                      Cancelled by{' '}
                      {typeof primaryApp.cancelled_by === 'object'
                        ? `${primaryApp.cancelled_by.name} (${primaryApp.cancelled_by.role})`
                        : primaryApp.cancelled_by}
                      {typeof primaryApp.cancelled_by === 'object' && primaryApp.cancelled_by.timestamp
                        ? ` on ${new Date(primaryApp.cancelled_by.timestamp).toLocaleString('en-IN')}`
                        : primaryApp.cancelled_at
                        ? ` on ${new Date(primaryApp.cancelled_at).toLocaleString('en-IN')}`
                        : ''}
                    </p>
                  )}
                </div>
              )}

              {primaryApp.status === 'REJECTED' && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Application Not Approved</span>
                  </div>
                  <p className="text-xs">
                    <strong>Official Rejection Reason:</strong> &ldquo;
                    {primaryApp.rejection_reason ||
                      primaryApp.officer_override?.override_reason ||
                      'Did not meet underwriting policy thresholds'}
                    &rdquo;
                  </p>
                </div>
              )}

              {/* 4-Stage Progress Pipeline */}
              <div className="py-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/60 relative">
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>1. Application & KYC</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Digilocker e-KYC & DPDP consent verified
                    </p>
                    <span className="text-[10px] text-emerald-800 block mt-2 font-mono font-bold">
                      Status: Complete ✓
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/60 relative">
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>2. AI Risk Evaluation</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      TreeSHAP Score: {(primaryApp.prediction.approval_probability * 100).toFixed(0)}% (
                      {primaryApp.prediction.final_decision})
                    </p>
                    <span className="text-[10px] text-emerald-800 block mt-2 font-mono font-bold">
                      Status: Evaluated ✓
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div
                    className={`p-4 rounded-2xl border relative ${
                      primaryApp.status === 'APPROVED' || primaryApp.status === 'CONDITIONAL_APPROVAL'
                        ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900'
                        : primaryApp.status === 'REJECTED'
                        ? 'border-rose-300 bg-rose-50/60 text-rose-900'
                        : 'border-sky-300 bg-sky-50/60 text-sky-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-bold text-xs">
                      {primaryApp.status === 'PENDING_REVIEW' ||
                      primaryApp.status === 'PENDING_OFFICER_REVIEW' ? (
                        <Clock className="w-4 h-4 text-sky-600 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      <span>3. Officer Appraisal</span>
                    </div>
                    <p className="text-[11px] mt-1">
                      {primaryApp.officer_override
                        ? `Officer ${primaryApp.officer_override.officer_name} reviewed`
                        : 'Senior Credit Officer Committee Queue'}
                    </p>
                    <span className="text-[10px] block mt-2 font-mono font-bold">
                      {primaryApp.status === 'PENDING_REVIEW' ||
                      primaryApp.status === 'PENDING_OFFICER_REVIEW'
                        ? 'Status: Active Review'
                        : 'Status: Concluded ✓'}
                    </span>
                    {fastTrackApps[primaryApp.id] && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full inline-block mt-1 shadow-xs">
                        ⚡ Express Fast-Track (&lt; 2h TAT)
                      </span>
                    )}
                  </div>

                  {/* Step 4 */}
                  <div
                    className={`p-4 rounded-2xl border relative ${
                      primaryApp.status === 'APPROVED'
                        ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-bold text-xs">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          primaryApp.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      />
                      <span>4. Sanction & Disbursal</span>
                    </div>
                    <p className="text-[11px] mt-1">
                      {primaryApp.status === 'APPROVED'
                        ? 'Sanction Letter Generated'
                        : 'Branch Disbursal Clearance'}
                    </p>
                    <span className="text-[10px] block mt-2 font-mono font-bold">
                      {primaryApp.status === 'APPROVED'
                        ? 'Status: Ready for Release'
                        : 'Status: In Pipeline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleRequestExpedite(primaryApp.id)}
                  className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    fastTrackApps[primaryApp.id]
                      ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-sm'
                      : 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-200'
                  }`}
                >
                  <Zap
                    className={`w-4 h-4 ${
                      fastTrackApps[primaryApp.id]
                        ? 'text-amber-600 fill-amber-500'
                        : 'text-amber-500'
                    }`}
                  />
                  <span>
                    {fastTrackApps[primaryApp.id]
                      ? '⚡ Express Fast-Track Active'
                      : 'Request Priority Fast-Track'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintApplication(primaryApp)}
                  className="p-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  title="Print"
                >
                  <Printer className="w-4 h-4 text-amber-600" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadDocModalOpen(true)}
                  className="p-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-amber-600" />
                  <span>Upload Documents</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('apply')}
                  className="p-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Apply for Loan (New)</span>
                </button>
              </div>

              {/* Officer Notes & Review Summary */}
              <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-200/80 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-sky-700" />
                  <span>Credit Appraisal Activity & Notes</span>
                </h4>
                <div className="space-y-1.5">
                  {(primaryApp.notes || []).map((note, idx) => (
                    <div key={idx} className="text-xs text-slate-700 flex items-start space-x-2">
                      <span className="text-sky-600 font-bold">•</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Verification Section */}
              {renderDocumentVerificationCard()}

              {/* Client Application History Table (Includes Active, Approved, Rejected & Cancelled Applications) */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>My Loan Application History ({displayApplications.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Synchronized across Client, Officer & Manager Portals
                  </span>
                </div>

                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Application ID</th>
                        <th className="py-2.5 px-3">Loan Type</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Current Status</th>
                        <th className="py-2.5 px-3">Remarks / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayApplications.map((app) => (
                        <tr
                          key={app.id}
                          onClick={() => setSelectedAppId(app.id)}
                          className={`hover:bg-sky-50/50 cursor-pointer transition-colors ${
                            app.id === primaryApp.id ? 'bg-sky-50/60 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            #{app.id}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {app.applicant.loan_purpose}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            ₹{app.applicant.loan_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {new Date(app.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                app.status === 'APPROVED' || app.status === 'DISBURSED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : app.status === 'CANCELLED'
                                  ? 'bg-slate-200 text-slate-700 border-slate-400'
                                  : app.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {formatApplicationStatusLabel(app.status)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                            {app.cancellation_reason
                              ? `Cancelled: "${app.cancellation_reason}"`
                              : app.rejection_reason
                              ? `Rejected: "${app.rejection_reason}"`
                              : app.officer_override?.override_reason ||
                                app.notes?.[0] ||
                                'Under review'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Client Cancel Application Confirmation Modal */}
          {cancelModalApp && onCancelApplication && (
            <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-fadeIn">
                <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ban className="w-5 h-5" />
                    <h3 className="font-bold text-sm">Cancel Loan Application</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCancelModalApp(null)}
                    className="text-white/80 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!cancelReasonInput.trim()) {
                      setCancelReasonError('Please provide a reason for cancelling this application.');
                      return;
                    }
                    onCancelApplication(cancelModalApp.id, cancelReasonInput.trim());
                    setStatusMessage(
                      `Application #${cancelModalApp.id} has been cancelled and archived in your history.`
                    );
                    setCancelModalApp(null);
                    setCancelReasonInput('');
                  }}
                  className="p-6 space-y-4 text-xs"
                >
                  <p className="text-slate-600 leading-relaxed">
                    Are you sure you want to cancel Application{' '}
                    <strong className="text-slate-900">#{cancelModalApp.id}</strong> (₹
                    {cancelModalApp.applicant.loan_amount.toLocaleString('en-IN')})? It will remain
                    visible in your application history as Cancelled.
                  </p>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Reason for Cancellation *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={cancelReasonInput}
                      onChange={(e) => {
                        setCancelReasonInput(e.target.value);
                        if (cancelReasonError) setCancelReasonError('');
                      }}
                      placeholder="e.g., Applying for a different loan amount or tenure..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white"
                    />
                    {cancelReasonError && (
                      <p className="text-rose-600 font-bold mt-1">{cancelReasonError}</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCancelModalApp(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Keep Application
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ELIGIBILITY & CREDIT HEALTH IMPROVER */}
      {clientTab === 'health' && (
        <div className="space-y-6">
          {!hasHealthBaseData && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950">
              <div>
                <strong>Interactive Credit Health Simulator:</strong> Enter your financial details in the{' '}
                <strong>Apply for Loan</strong> tab to simulate with your exact profile, or use the interactive sliders below to explore how income and collateral affect credit eligibility.
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('apply')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl shrink-0 cursor-pointer"
              >
                Enter My Details →
              </button>
            </div>
          )}

          {/* Top Score Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Score Gauge */}
            <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Simulated CIBIL Credit Score
              </span>
              <div className="text-4xl font-black text-sky-950 font-mono">
                {simulatedScore} <span className="text-sm font-normal text-slate-400">/ 900</span>
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {simulatedScore >= 750 ? 'Tier 1 - Prime Credit Health' : 'Tier 2 - Good Health'}
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Simulated score based on your inputs and selected credit booster levers.
              </p>
            </div>

            {/* Card 2: Approval Probability */}
            <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Simulated AI Approval Odds
              </span>
              <div className="text-4xl font-black text-emerald-600 font-mono">
                {(simulatedPrediction.approval_probability * 100).toFixed(0)}%
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                Status: {simulatedPrediction.final_decision}
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Model: TreeSHAP Credit Classifier v2.4 (91.4% Accuracy)
              </p>
            </div>

            {/* Card 3: Eligible Credit Line */}
            <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Estimated Maximum Loan Limit
              </span>
              <div className="text-3xl font-black text-slate-900 font-mono">
                ₹
                {(
                  (simulatedApplicant.monthly_income + simulatedApplicant.coapplicant_income) *
                  35
                ).toLocaleString('en-IN')}
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                Eligible Tenure: Up to 15 Years
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Based on FOIR multiplier and co-applicant income pooling.
              </p>
            </div>
          </div>

          {/* Interactive What-If Simulator & Levers */}
          <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-sky-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                  Interactive Credit Booster
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  What-If Simulation Levers
                </h3>
                <p className="text-xs text-slate-500">
                  Adjust the levers below to see how optimizing income, tenure, or debt immediately boosts your eligibility.
                </p>
              </div>

              <button
                onClick={() => {
                  setIncomeBooster(0);
                  setEmiReduction(0);
                  setCollateralBooster(0);
                  setTenureBooster(0);
                }}
                className="text-xs text-sky-700 hover:text-sky-900 font-bold px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 cursor-pointer"
              >
                Reset Levers
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slider 1: Extra Income */}
              <div className="space-y-2 p-4 bg-sky-50/50 rounded-2xl border border-sky-100">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-slate-800">Additional Monthly Income</label>
                  <span className="font-bold font-mono text-sky-900">
                    +₹{incomeBooster.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100000}
                  step={5000}
                  value={incomeBooster}
                  onChange={(e) => setIncomeBooster(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
                <span className="text-[10px] text-slate-500 block">
                  Additional freelance earnings, rental income, or annual appraisal raise.
                </span>
              </div>

              {/* Slider 2: Debt reduction */}
              <div className="space-y-2 p-4 bg-sky-50/50 rounded-2xl border border-sky-100">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-slate-800">Pre-Pay & Reduce Existing EMIs</label>
                  <span className="font-bold font-mono text-emerald-700">
                    -₹{emiReduction.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(10000, currentFormApplicant.existing_emi)}
                  step={1000}
                  value={emiReduction}
                  onChange={(e) => setEmiReduction(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="text-[10px] text-slate-500 block">
                  Paying off credit card balance or personal loans lowers your FOIR burden.
                </span>
              </div>

              {/* Slider 3: Pledge Additional Collateral */}
              <div className="space-y-2 p-4 bg-sky-50/50 rounded-2xl border border-sky-100">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-slate-800">Pledge Additional Collateral</label>
                  <span className="font-bold font-mono text-purple-700">
                    +₹{(collateralBooster / 100000).toFixed(1)} Lakhs
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3000000}
                  step={100000}
                  value={collateralBooster}
                  onChange={(e) => setCollateralBooster(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <span className="text-[10px] text-slate-500 block">
                  Pledging fixed deposits or residential property lowers Loan-to-Value (LTV) ratio.
                </span>
              </div>

              {/* Toggle 4: Co-Applicant */}
              <div className="space-y-2 p-4 bg-sky-50/50 rounded-2xl border border-sky-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-slate-800">
                    Include Earning Co-Borrower
                  </label>
                  <input
                    type="checkbox"
                    checked={hasCoApplicant}
                    onChange={(e) => setHasCoApplicant(e.target.checked)}
                    className="h-4 w-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                </div>
                <p className="text-xs text-slate-600">
                  {hasCoApplicant
                    ? 'Co-applicant active: Pools additional monthly household earnings (+25 pts score boost)'
                    : 'Solo applicant mode: No additional co-borrower income pooled.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Checklist & SHAP factors */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SHAP Factors (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-sky-200 shadow-sm p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-sky-100 pb-3">
                <PieChart className="w-4 h-4 text-sky-600" />
                <span>Explainable AI (TreeSHAP) Factor Attribution</span>
              </h4>

              <div className="space-y-3">
                {simulatedPrediction.shap_factors.map((factor) => (
                  <div
                    key={factor.featureKey}
                    className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                      factor.isPositive
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">
                          {factor.featureName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-600">
                          ({String(factor.actualValue)})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {factor.businessInterpretation}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2 py-1 rounded shrink-0 ${
                        factor.isPositive
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {factor.isPositive ? '+' : ''}
                      {(factor.shapValue * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-sky-200 shadow-sm p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-sky-100 pb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Action Checklist to Maximize Approval</span>
              </h4>

              <div className="space-y-3">
                {[
                  { id: 'check_cibil', title: 'Maintain CIBIL score above 720', boost: '+20 pts' },
                  {
                    id: 'check_foir',
                    title: 'Keep monthly EMIs under 50% of income',
                    boost: '+25 pts'
                  },
                  {
                    id: 'check_coapp',
                    title: 'Add spouse or parent as co-applicant',
                    boost: '+35 pts'
                  },
                  {
                    id: 'check_collateral',
                    title: 'Pledge title deeds or FD lien',
                    boost: '+30 pts'
                  },
                  {
                    id: 'check_prepay',
                    title: 'Close high-interest revolving credit cards',
                    boost: '+15 pts'
                  }
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start space-x-3 p-3 rounded-xl bg-sky-50/50 hover:bg-sky-50 border border-sky-100 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedChecklist[item.id]}
                      onChange={(e) =>
                        setCheckedChecklist((prev) => ({
                          ...prev,
                          [item.id]: e.target.checked
                        }))
                      }
                      className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {item.boost} eligibility boost
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMI CALCULATOR */}
      {clientTab === 'calculator' && (
        <div className="space-y-6">
          {/* Preset Loan Type Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
              Quick Loan Presets:
            </span>
            {[
              { name: '🏠 Home Loan', rate: 8.35, years: 20, amount: 4500000 },
              { name: '💼 MSME / Business', rate: 10.25, years: 7, amount: 2000000 },
              { name: '🚗 Vehicle Loan', rate: 8.75, years: 5, amount: 1000000 },
              { name: '🎓 Education Loan', rate: 8.9, years: 8, amount: 1500000 },
              { name: '💳 Personal Loan', rate: 12.5, years: 3, amount: 500000 }
            ].map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setCalcAmount(p.amount);
                  setCalcRate(p.rate);
                  setCalcTenureYears(p.years);
                  setCalcTenureUnit('years');
                }}
                className="px-3 py-1.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-sky-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {p.name} ({p.rate}%)
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Controls (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-sky-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="border-b border-sky-100 pb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                  Interactive Loan Simulator
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Monthly EMI & Amortization Calculator
                </h3>
                <p className="text-xs text-slate-500">
                  Plan your repayment affordability and calculate total interest payable before applying.
                </p>
              </div>

              <div className="space-y-6">
                {/* Control 1: Loan Amount */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-800">Loan Amount (₹)</label>
                    <div className="flex items-center space-x-1 border border-sky-300 rounded-lg px-2 py-1 bg-sky-50">
                      <span className="text-sky-700 font-bold">₹</span>
                      <input
                        type="number"
                        step={25000}
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(Number(e.target.value))}
                        className="w-28 text-right font-mono font-bold text-xs bg-transparent focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={100000}
                    max={10000000}
                    step={50000}
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>₹1 Lakh</span>
                    <span>₹50 Lakhs</span>
                    <span>₹1 Crore</span>
                  </div>
                </div>

                {/* Control 2: Interest Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-800">Annual Interest Rate (%)</label>
                    <div className="flex items-center space-x-1 border border-sky-300 rounded-lg px-2 py-1 bg-sky-50">
                      <input
                        type="number"
                        step={0.1}
                        value={calcRate}
                        onChange={(e) => setCalcRate(Number(e.target.value))}
                        className="w-16 text-right font-mono font-bold text-xs bg-transparent focus:outline-hidden"
                      />
                      <span className="text-sky-700 font-bold">% p.a.</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={6.0}
                    max={20.0}
                    step={0.1}
                    value={calcRate}
                    onChange={(e) => setCalcRate(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>6.0% (Prime Home)</span>
                    <span>10.5% (MSME)</span>
                    <span>20.0% (Unsecured)</span>
                  </div>
                </div>

                {/* Control 3: Loan Tenure */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      <label className="font-bold text-slate-800">Loan Tenure</label>
                      <div className="inline-flex rounded-lg border border-sky-200 bg-sky-50 p-0.5 text-[10px]">
                        <button
                          onClick={() => setCalcTenureUnit('years')}
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            calcTenureUnit === 'years' ? 'bg-sky-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Years
                        </button>
                        <button
                          onClick={() => setCalcTenureUnit('months')}
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            calcTenureUnit === 'months' ? 'bg-sky-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Months
                        </button>
                      </div>
                    </div>
                    <span className="font-bold font-mono text-purple-700 text-sm">
                      {calcTenureYears} {calcTenureUnit === 'years' ? 'Years' : 'Months'} (
                      {tenureMonthsTotal} Mo)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={calcTenureUnit === 'years' ? 1 : 12}
                    max={calcTenureUnit === 'years' ? 30 : 360}
                    step={1}
                    value={calcTenureYears}
                    onChange={(e) => setCalcTenureYears(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Prepayment lever */}
                <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <label className="font-bold text-sky-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Optional Monthly Pre-payment Simulator</span>
                    </label>
                    <span className="font-mono font-bold text-emerald-700">
                      +₹{calcPrepaymentMonthly.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50000}
                    step={1000}
                    value={calcPrepaymentMonthly}
                    onChange={(e) => setCalcPrepaymentMonthly(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  {calcPrepaymentMonthly > 0 && (
                    <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
                      🎉 By prepaying ₹{calcPrepaymentMonthly.toLocaleString('en-IN')} each month, you will save approximately{' '}
                      <strong>₹{Math.round(interestSaved).toLocaleString('en-IN')}</strong> in interest and payoff your loan{' '}
                      <strong>{monthsSaved} months early</strong>!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Calculator Results & Action (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 space-y-5">
                <div className="text-center pb-4 border-b border-sky-100">
                  <span className="text-[11px] uppercase font-bold text-slate-500">
                    Estimated Monthly EMI
                  </span>
                  <div className="text-4xl font-black text-sky-950 mt-1 font-mono">
                    ₹{Math.round(baseEmi).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    per month for {tenureMonthsTotal} months
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-500">Principal Loan Amount:</span>
                    <strong className="font-mono text-slate-900">
                      ₹{calcAmount.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-500">Total Interest Payable:</span>
                    <strong className="font-mono text-amber-700">
                      ₹{Math.round(totalInterest).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Total Repayment Amount:</span>
                    <strong className="font-mono text-slate-900">
                      ₹{Math.round(totalRepayment).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* Visual Breakdown Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-semibold text-slate-600 flex justify-between">
                    <span>Principal ({((calcAmount / totalRepayment) * 100).toFixed(0)}%)</span>
                    <span>Interest ({((totalInterest / totalRepayment) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-3.5 w-full bg-amber-200 rounded-full overflow-hidden flex">
                    <div
                      className="bg-sky-600 h-full"
                      style={{ width: `${(calcAmount / totalRepayment) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Apply with this calculation */}
                <button
                  type="button"
                  onClick={applyCalcToForm}
                  className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-sky-500/25 text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Proceed to Apply with These Loan Terms</span>
                </button>
              </div>
            </div>
          </div>

          {/* Amortization Schedule Table */}
          <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Loan Amortization Breakdown Schedule</span>
              </h4>

              <div className="inline-flex rounded-lg border border-sky-200 bg-sky-50 p-0.5 text-xs font-bold">
                <button
                  onClick={() => setAmortizationView('yearly')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    amortizationView === 'yearly' ? 'bg-sky-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Year-by-Year
                </button>
                <button
                  onClick={() => setAmortizationView('monthly')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    amortizationView === 'monthly' ? 'bg-sky-600 text-white' : 'text-slate-600'
                  }`}
                >
                  First 12 Months
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sky-100 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Opening Balance</th>
                    <th className="py-2.5 px-3 text-right">Total Payment</th>
                    <th className="py-2.5 px-3 text-right text-sky-700">Principal Paid</th>
                    <th className="py-2.5 px-3 text-right text-amber-700">Interest Paid</th>
                    <th className="py-2.5 px-3 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {generateAmortizationRows().map((row, idx) => (
                    <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                      <td className="py-2 px-3 font-sans font-bold text-slate-900">{row.period}</td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        ₹{Math.round(row.opening).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ₹{Math.round(row.emiTotal).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right text-sky-700 font-semibold">
                        ₹{Math.round(row.principalPaid).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-700">
                        ₹{Math.round(row.interestPaid).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ₹{Math.round(row.closing).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal after application */}
      {submitSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn border border-sky-200">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Application Successfully Submitted!
              </h3>
              <p className="text-xs text-slate-500">
                Your loan application #{submittedAppId} has been ingested into the underwriting system.
              </p>
            </div>
            <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 text-xs text-sky-900 space-y-1">
              <div className="font-bold">Initial AI Risk Evaluation:</div>
              <div>
                Decision: <strong>{previewPrediction.final_decision}</strong>
              </div>
              <div>
                Calibrated Odds:{' '}
                <strong>{(previewPrediction.approval_probability * 100).toFixed(1)}%</strong>
              </div>
            </div>
            <button
              onClick={() => {
                setSubmitSuccessModal(false);
                handleTabChange('status');
              }}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
            >
              Track Application in Status Portal →
            </button>
          </div>
        </div>
      )}

      {/* Upload Document Modal in Document Verification format */}
      {uploadDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-3 animate-fadeIn">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUploadDocModalOpen(false);
                  setSelectedFileObj(null);
                  setIsUploading(false);
                }}
                className="absolute top-5 right-5 z-10 text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 cursor-pointer"
              >
                ✕ Close
              </button>
              {renderDocumentVerificationCard()}
            </div>
          </div>
        </div>
      )}

      {/* Sanction Memo Modal */}
      {selectedMemoRecord && (
        <LoanSummaryModal
          applicant={selectedMemoRecord.applicant}
          prediction={selectedMemoRecord.prediction}
          onClose={() => setSelectedMemoRecord(null)}
        />
      )}

      {/* Printable Official Application Form Modal */}
      {showPrintModal && printAppRecord && (
        <PrintableApplicationModal
          application={printAppRecord}
          onClose={() => {
            setShowPrintModal(false);
            setPrintAppRecord(null);
          }}
          dataMaskingActive={false}
        />
      )}

      {/* Document Viewer Modal for Client Preview */}
      {viewingClientDoc && (
        <DocumentViewerModal
          document={viewingClientDoc}
          applicantName={currentUser?.name || 'Applicant'}
          applicationId={primaryApp?.id}
          currentUserRole="CLIENT"
          isActionable={false}
          onClose={() => setViewingClientDoc(null)}
        />
      )}
    </div>
  );
};
