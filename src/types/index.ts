export type EmploymentType =
  | 'Salaried Private'
  | 'Salaried Government'
  | 'Self-Employed Professional'
  | 'Self-Employed Business'
  | 'Gig / Contract Worker';

export type EducationLevel =
  | 'High School'
  | 'Graduate'
  | 'Post Graduate'
  | 'Professional / Doctorate';

export type MaritalStatus = 'Single' | 'Married' | 'Divorced / Widowed';

export type LoanPurpose =
  | 'Home Purchase / Construction'
  | 'Personal / Medical Emergency'
  | 'Education'
  | 'MSME / Small Business Expansion'
  | 'Vehicle Loan';

export type DecisionStatus = 'Eligible' | 'Manual Review' | 'Not Eligible';

export type RiskTier = 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Credit Risk';

export type ApplicationStatus =
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'PENDING_OFFICER_REVIEW'
  | 'FORWARDED_TO_MANAGER'
  | 'APPROVED'
  | 'CONDITIONAL_APPROVAL'
  | 'REJECTED'
  | 'CANCELLED'
  | 'DISBURSED';

export interface StatusHistoryEntry {
  id: string;
  previous_status: ApplicationStatus | string;
  new_status: ApplicationStatus;
  changed_by_id?: string;
  changed_by_name?: string;
  changed_by_role?: UserRole | string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: UserRole | string;
  reason?: string;
  timestamp: string;
}

export interface ApplicantInput {
  applicant_id: string;
  full_name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  marital_status: MaritalStatus;
  dependents: number;
  education: EducationLevel;
  employment_type: EmploymentType;
  employment_years: number;
  monthly_income: number; // in INR
  coapplicant_income: number; // in INR
  loan_amount: number; // in INR
  loan_term_months: number;
  credit_score: number; // CIBIL: 300 - 900
  existing_emi: number; // in INR
  bank_account_age_months: number;
  previous_loan_count: number;
  previous_default: boolean;
  collateral_value: number; // in INR
  location: string; // District in Tamil Nadu
  loan_purpose: LoanPurpose;
  kyc_verified: boolean;
  consent_signed: boolean;
  aadhaar_masked?: string;
  pan_masked?: string;
  aadhaar_raw?: string;
  pan_raw?: string;
}

export interface EngineeredFeatures {
  total_income: number;
  annual_income: number;
  proposed_emi: number;
  total_emi: number;
  dti_ratio: number; // FOIR (Fixed Obligation to Income Ratio) %
  loan_to_income_ratio: number;
  existing_emi_ratio: number;
  loan_to_value_ratio: number; // LTV %
  income_per_dependent: number;
  employment_stability_score: number; // 0-100
  previous_repayment_score: number; // 0-100
}

export interface ShapFactor {
  featureKey: string;
  featureName: string;
  actualValue: string | number;
  shapValue: number; // positive increases approval, negative decreases
  impactPercent: number;
  isPositive: boolean;
  businessInterpretation: string;
  recommendation?: string;
}

export interface BusinessRuleResult {
  ruleId: string;
  ruleName: string;
  ruleCategory:
    | 'CREDIT_SCORE'
    | 'DTI_BURDEN'
    | 'DEFAULT_HISTORY'
    | 'KYC_CONSENT'
    | 'LTV_COLLATERAL'
    | 'AFFORDABILITY';
  severity: 'HARD_REJECT' | 'TRIGGER_MANUAL' | 'WARNING' | 'PASS';
  passed: boolean;
  reason: string;
  recommendedAction: string;
}

export interface PredictionResult {
  prediction_id: string;
  applicant_id: string;
  model_version: string;
  timestamp: string;
  approval_probability: number; // 0.0 - 1.0
  ml_raw_decision: DecisionStatus;
  final_decision: DecisionStatus;
  risk_tier: RiskTier;
  engineered_features: EngineeredFeatures;
  shap_factors: ShapFactor[];
  base_value: number; // e.g. 0.52 (dataset baseline)
  business_rules: BusinessRuleResult[];
  hard_rule_triggered: boolean;
  hard_rule_message?: string;
  counterfactual_remedies: string[];
  adverse_action_notice?: string;
}

export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface ClientDocumentRecord {
  id: string;
  docType: 'aadhaar' | 'pan' | 'income' | 'bank_statement' | 'collateral' | 'utility_bill' | string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadedAt: string;
  status: DocumentVerificationStatus;
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  dataUrl?: string;
}

export interface ApplicationRecord {
  id: string;
  ownerId?: string;
  ownerEmail?: string;
  uploadedDocuments?: string[];
  documents?: ClientDocumentRecord[];
  document_verification_status?: 'VERIFIED' | 'PENDING' | 'INCOMPLETE';
  applicant: ApplicantInput;
  prediction: PredictionResult;
  status: ApplicationStatus;
  priority?: 'NORMAL' | 'FAST_TRACK';
  isNewSubmission?: boolean;
  rejection_reason?: string;
  rejected_by?:
    | string
    | {
        id: string;
        name: string;
        role: string;
        timestamp: string;
      };
  rejected_at?: string;
  cancellation_reason?: string;
  cancelled_by?:
    | string
    | {
        id: string;
        name: string;
        role: string;
        timestamp: string;
      };
  cancelled_at?: string;
  approved_by?:
    | string
    | {
        id: string;
        name: string;
        role: string;
        timestamp: string;
        remarks?: string;
      };
  approved_at?: string;
  disbursed_by?:
    | string
    | {
        id: string;
        name: string;
        role: string;
        timestamp: string;
        reference?: string;
      };
  disbursed_at?: string;
  status_history?: StatusHistoryEntry[];
  officer_review?: {
    verified_applicant_details: boolean;
    verified_documents: boolean;
    reviewed_financials: boolean;
    reviewed_ml_prediction: boolean;
    remarks: string;
    officer_id: string;
    officer_name: string;
    forwarded_at: string;
    signature_hash: string;
  };
  officer_override?: {
    original_decision: DecisionStatus;
    new_decision:
      | 'APPROVED'
      | 'REJECTED'
      | 'CONDITIONAL_APPROVAL'
      | 'CANCELLED'
      | 'DISBURSED'
      | 'UNDER_REVIEW';
    officer_id: string;
    officer_name: string;
    override_reason: string;
    timestamp: string;
    signature_hash: string;
  };
  notes: string[];
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target_id: string;
  details: string;
  ip_address: string;
  checksum: string;
}

export interface ModelMetricData {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  brier_score: number;
  false_approval_rate: number;
  false_rejection_rate: number;
  train_time_sec: number;
  inference_latency_ms: number;
}

export interface FairnessMetricGroup {
  group_name: string;
  category: 'Employment' | 'Income Band' | 'Age Group' | 'Geography';
  total_applicants: number;
  approved_count: number;
  approval_rate: number;
  precision: number;
  recall: number;
  false_positive_rate: number;
  false_negative_rate: number;
  disparate_impact_ratio: number;
  status: 'Compliant (>= 0.80)' | 'Caution (< 0.80)' | 'Disparity Detected';
}

export type UserRole = 'MANAGER' | 'OFFICER' | 'CLIENT';

export interface UserAuth {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  googleLinked?: boolean;
  securityScore?: number;
  role: UserRole;
  avatar?: string;
  authProvider: 'google' | 'phone' | 'email';
  designation?: string;
  branch?: string;
  branchCode?: string;
  twoFactorEnabled: boolean;
  lastLogin: string;
  sessionToken: string;
  clientApplicantId?: string;
}

export interface SecuritySettings {
  twoFactorRequired: boolean;
  dataMaskingActive: boolean; // Masks PAN, Aadhaar, Phone in UI
  autoLockMinutes: number; // 5, 15, 30
  encryptionStatus: 'AES-256-GCM Active' | 'AES-256 Disabled' | 'AES-256 KMS Key Rotating';
  tlsVersion: 'TLS 1.3 Strict';
  tamperAuditChecksums: boolean;
  ipRestrictionEnabled: boolean;
}
