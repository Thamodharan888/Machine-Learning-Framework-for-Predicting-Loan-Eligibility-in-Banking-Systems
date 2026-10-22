import {
  ApplicantInput,
  ApplicationRecord,
  AuditLogEntry,
  ModelMetricData,
  FairnessMetricGroup
} from '../types';
import { predictLoanEligibility } from './mlEngine';
import { createDefaultDocumentsForApplicant } from './documentManager';

export const TN_DISTRICTS = [
  'Ariyalur',
  'Chengalpattu',
  'Chennai',
  'Coimbatore',
  'Cuddalore',
  'Dharmapuri',
  'Dindigul',
  'Erode',
  'Kallakurichi',
  'Kanchipuram',
  'Kanyakumari',
  'Karur',
  'Krishnagiri',
  'Madurai',
  'Mayiladuthurai',
  'Nagapattinam',
  'Namakkal',
  'Nilgiris',
  'Perambalur',
  'Pudukkottai',
  'Ramanathapuram',
  'Ranipet',
  'Salem',
  'Sivaganga',
  'Tenkasi',
  'Thanjavur',
  'Theni',
  'Thoothukudi',
  'Tiruchirappalli',
  'Tirunelveli',
  'Tirupathur',
  'Tiruppur',
  'Tiruvallur',
  'Tiruvannamalai',
  'Tiruvarur',
  'Vellore',
  'Viluppuram',
  'Virudhunagar'
];

export const PRESET_CASE_STUDIES: { id: string; title: string; subtitle: string; tag: string; data: ApplicantInput }[] = [
  {
    id: 'case-1-salaried-prime',
    title: '1. Salaried Executive with High CIBIL (Prime)',
    subtitle: 'Senior Software Engineer in OMR, Chennai • CIBIL 795 • Clean Bureau',
    tag: 'Eligible',
    data: {
      applicant_id: 'APP-TN-2026-00101',
      full_name: 'Ananya Ramachandran',
      age: 32,
      gender: 'Female',
      marital_status: 'Married',
      dependents: 1,
      education: 'Post Graduate',
      employment_type: 'Salaried Private',
      employment_years: 7,
      monthly_income: 145000,
      coapplicant_income: 60000,
      loan_amount: 3500000,
      loan_term_months: 60,
      credit_score: 795,
      existing_emi: 18000,
      bank_account_age_months: 72,
      previous_loan_count: 3,
      previous_default: false,
      collateral_value: 4800000,
      location: 'Chennai',
      loan_purpose: 'Home Purchase / Construction',
      kyc_verified: true,
      consent_signed: true
    }
  },
  {
    id: 'case-2-self-employed-msme',
    title: '2. Self-Employed MSME with Irregular Income',
    subtitle: 'Textile Unit Owner in Tiruppur / Coimbatore • Moderate Bureau • High Turnover',
    tag: 'Manual Review',
    data: {
      applicant_id: 'APP-TN-2026-00102',
      full_name: 'K. Saravanan',
      age: 44,
      gender: 'Male',
      marital_status: 'Married',
      dependents: 3,
      education: 'Graduate',
      employment_type: 'Self-Employed Business',
      employment_years: 9,
      monthly_income: 85000,
      coapplicant_income: 0,
      loan_amount: 1800000,
      loan_term_months: 48,
      credit_score: 688,
      existing_emi: 22000,
      bank_account_age_months: 60,
      previous_loan_count: 2,
      previous_default: false,
      collateral_value: 2600000,
      location: 'Coimbatore',
      loan_purpose: 'MSME / Small Business Expansion',
      kyc_verified: true,
      consent_signed: true
    }
  },
  {
    id: 'case-3-high-existing-emi',
    title: '3. Applicant with High Existing EMI Burden (FOIR 62%)',
    subtitle: 'Logistics Supervisor in Madurai • Heavy Active Debt • Stretched Cashflow',
    tag: 'High Risk / Manual',
    data: {
      applicant_id: 'APP-TN-2026-00103',
      full_name: 'M. Senthil Kumar',
      age: 38,
      gender: 'Male',
      marital_status: 'Married',
      dependents: 2,
      education: 'Graduate',
      employment_type: 'Salaried Private',
      employment_years: 4,
      monthly_income: 48000,
      coapplicant_income: 0,
      loan_amount: 750000,
      loan_term_months: 36,
      credit_score: 672,
      existing_emi: 21500,
      bank_account_age_months: 36,
      previous_loan_count: 4,
      previous_default: false,
      collateral_value: 0,
      location: 'Madurai',
      loan_purpose: 'Personal / Medical Emergency',
      kyc_verified: true,
      consent_signed: true
    }
  },
  {
    id: 'case-4-previous-default',
    title: '4. Applicant with Prior Loan Default Record',
    subtitle: 'Trading Contractor in Salem • Settled Credit Card Default • Subprime Score',
    tag: 'Not Eligible',
    data: {
      applicant_id: 'APP-TN-2026-00104',
      full_name: 'R. Vigneshwar',
      age: 41,
      gender: 'Male',
      marital_status: 'Single',
      dependents: 0,
      education: 'High School',
      employment_type: 'Self-Employed Business',
      employment_years: 3,
      monthly_income: 52000,
      coapplicant_income: 0,
      loan_amount: 600000,
      loan_term_months: 36,
      credit_score: 540,
      existing_emi: 12000,
      bank_account_age_months: 24,
      previous_loan_count: 2,
      previous_default: true,
      collateral_value: 0,
      location: 'Salem',
      loan_purpose: 'Vehicle Loan',
      kyc_verified: true,
      consent_signed: true
    }
  },
  {
    id: 'case-5-borderline-review',
    title: '5. Borderline Tech Freelancer with Near-Prime Score',
    subtitle: 'Digital Consultant in Tiruchirappalli • Short Track • Moderate Surplus',
    tag: 'Manual Review',
    data: {
      applicant_id: 'APP-TN-2026-00105',
      full_name: 'Priyanka Balasubramanian',
      age: 27,
      gender: 'Female',
      marital_status: 'Single',
      dependents: 1,
      education: 'Professional / Doctorate',
      employment_type: 'Gig / Contract Worker',
      employment_years: 2,
      monthly_income: 70000,
      coapplicant_income: 15000,
      loan_amount: 1200000,
      loan_term_months: 48,
      credit_score: 660,
      existing_emi: 8000,
      bank_account_age_months: 20,
      previous_loan_count: 1,
      previous_default: false,
      collateral_value: 1100000,
      location: 'Tiruchirappalli',
      loan_purpose: 'Education',
      kyc_verified: true,
      consent_signed: true
    }
  }
];

/**
 * Returns initial application records for Client, Loan Officer, and Bank Manager portals.
 */
export function getInitialApplications(): ApplicationRecord[] {
  const now = Date.now();
  const initialApplicants: {
    id: string;
    status: ApplicationRecord['status'];
    priority?: ApplicationRecord['priority'];
    createdOffsetHours: number;
    notes: string[];
    data: ApplicantInput;
  }[] = [
    {
      id: 'TN-APP-2026-8901',
      status: 'PENDING_OFFICER_REVIEW',
      priority: 'NORMAL',
      createdOffsetHours: 2,
      notes: [
        'Self-service digital application submitted via Client Portal. DigiLocker e-KYC & DPDP consent verified ✓.',
        'Queued for Stage 2 Loan Officer verification and Bank Manager sanction.'
      ],
      data: {
        applicant_id: 'TN-APP-2026-8901',
        full_name: 'Thamodharan K',
        age: 34,
        gender: 'Male',
        marital_status: 'Married',
        dependents: 2,
        education: 'Graduate',
        employment_type: 'Self-Employed Business',
        employment_years: 6,
        monthly_income: 85000,
        coapplicant_income: 30000,
        loan_amount: 1800000,
        loan_term_months: 84,
        credit_score: 742,
        existing_emi: 12000,
        bank_account_age_months: 48,
        previous_loan_count: 2,
        previous_default: false,
        collateral_value: 2500000,
        location: 'Madurai',
        loan_purpose: 'MSME / Small Business Expansion',
        kyc_verified: true,
        consent_signed: true,
        aadhaar_masked: 'XXXX-XXXX-8901',
        pan_masked: 'ABCDE****F',
        aadhaar_raw: '6421 8812 8901',
        pan_raw: 'ABCDE8901F'
      }
    },
    {
      id: 'APP-TN-2026-00101',
      status: 'APPROVED',
      priority: 'FAST_TRACK',
      createdOffsetHours: 18,
      notes: [
        'Prime salaried profile verified with CIBIL 795 and strong collateral coverage.',
        'Sanctioned under automated green-channel underwriting guidelines.'
      ],
      data: {
        ...PRESET_CASE_STUDIES[0].data,
        aadhaar_masked: 'XXXX-XXXX-4412',
        pan_masked: 'AAACR****K',
        aadhaar_raw: '7812 3390 4412',
        pan_raw: 'AAACR4412K'
      }
    },
    {
      id: 'APP-TN-2026-00102',
      status: 'FORWARDED_TO_MANAGER',
      priority: 'NORMAL',
      createdOffsetHours: 10,
      notes: [
        'Loan Officer field verification completed for Tiruppur/Coimbatore MSME unit.',
        'Forwarded to Senior Branch Credit Manager for manual review sanction.'
      ],
      data: {
        ...PRESET_CASE_STUDIES[1].data,
        aadhaar_masked: 'XXXX-XXXX-5529',
        pan_masked: 'BBNPS****M',
        aadhaar_raw: '5190 4482 5529',
        pan_raw: 'BBNPS5529M'
      }
    },
    {
      id: 'APP-TN-2026-00103',
      status: 'PENDING_REVIEW',
      priority: 'NORMAL',
      createdOffsetHours: 6,
      notes: [
        'Elevated FOIR ratio detected. Referred for secondary cash-flow verification.'
      ],
      data: {
        ...PRESET_CASE_STUDIES[2].data,
        aadhaar_masked: 'XXXX-XXXX-3109',
        pan_masked: 'CCMPT****R',
        aadhaar_raw: '8831 2019 3109',
        pan_raw: 'CCMPT3109R'
      }
    }
  ];

  return initialApplicants.map((item) => {
    const prediction = predictLoanEligibility(item.data);
    const createdAt = new Date(now - item.createdOffsetHours * 3600000).toISOString();
    const docs = createDefaultDocumentsForApplicant(item.data, item.id);
    return {
      id: item.id,
      applicant: item.data,
      prediction,
      status: item.status,
      priority: item.priority,
      notes: item.notes,
      documents: docs,
      uploadedDocuments: docs.map(
        (d) => `${d.title}: ${d.fileName} (${d.status === 'VERIFIED' ? 'Verified ✓' : 'Pending'})`
      ),
      document_verification_status: docs.every((d) => d.status === 'VERIFIED')
        ? 'VERIFIED'
        : 'PENDING',
      created_at: createdAt,
      updated_at: createdAt
    };
  });
}

/**
 * Exports current live portal applications history to CSV.
 */
export function exportApplicationsToCsv(apps: ApplicationRecord[]): string {
  const headers = [
    'Application ID',
    'Applicant Name',
    'Age',
    'Gender',
    'District / Location',
    'Employment Type',
    'Monthly Income (INR)',
    'Co-Applicant Income (INR)',
    'Loan Amount (INR)',
    'Tenure (Months)',
    'CIBIL Credit Score',
    'Existing EMI (INR)',
    'Collateral Value (INR)',
    'Loan Purpose',
    'Proposed EMI (INR)',
    'DTI / FOIR (%)',
    'LTV (%)',
    'AI Probability (%)',
    'AI Decision',
    'Final Status',
    'Underwriter Override',
    'Reviewing Officer',
    'Override Reason',
    'Override Timestamp',
    'Submission Date & Time'
  ];

  const rows = apps.map((app) => [
    app.id,
    `"${app.applicant.full_name}"`,
    app.applicant.age,
    app.applicant.gender,
    `"${app.applicant.location}"`,
    `"${app.applicant.employment_type}"`,
    app.applicant.monthly_income,
    app.applicant.coapplicant_income,
    app.applicant.loan_amount,
    app.applicant.loan_term_months,
    app.applicant.credit_score,
    app.applicant.existing_emi,
    app.applicant.collateral_value,
    `"${app.applicant.loan_purpose}"`,
    Math.round(app.prediction.engineered_features.proposed_emi),
    app.prediction.engineered_features.dti_ratio.toFixed(1),
    app.prediction.engineered_features.loan_to_value_ratio.toFixed(1),
    (app.prediction.approval_probability * 100).toFixed(1),
    app.prediction.final_decision,
    app.status,
    app.officer_override ? app.officer_override.new_decision : 'None',
    app.officer_override ? `"${app.officer_override.officer_name}"` : 'Pending Committee',
    app.officer_override ? `"${app.officer_override.override_reason}"` : 'N/A',
    app.officer_override ? `"${app.officer_override.timestamp}"` : 'N/A',
    `"${new Date(app.created_at).toLocaleString('en-IN')}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Initial immutable audit logs.
 */
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-89101',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    actor: 'SYS_PIPELINE',
    role: 'Automated ML Engine',
    action: 'MODEL_PREDICTION_EXECUTED',
    target_id: 'APP-TN-2026-00101',
    details: 'Calculated approval probability 0.884. Decision: Eligible. SHAP top factor: CIBIL Score (+0.28).',
    ip_address: '10.14.0.22',
    checksum: 'a9f8e71b2c3d4e5f'
  },
  {
    id: 'AUD-89102',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    actor: 'K. Sundaram (Senior Credit Officer)',
    role: 'Credit Risk Manager',
    action: 'OFFICER_REVIEW_OPENED',
    target_id: 'APP-TN-2026-00102',
    details: 'Initiated manual inspection for Tiruppur MSME facility. Reviewing 2-year audited GST returns.',
    ip_address: '192.168.1.104',
    checksum: 'b3c4d5e6f7a8b9c0'
  },
  {
    id: 'AUD-89103',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    actor: 'SYS_POLICY_ENGINE',
    role: 'Rule Engine',
    action: 'HARD_POLICY_TRIGGERED',
    target_id: 'APP-TN-2026-00104',
    details: 'Triggered Rule BR-003: Historical loan default detected on bureau database. Automatic block applied.',
    ip_address: '10.14.0.22',
    checksum: 'c4d5e6f7a8b9c0d1'
  }
];

/**
 * Model Evaluation Benchmark Data across ML Algorithms.
 */
export const MODEL_BENCHMARK_DATA: ModelMetricData[] = [
  {
    model_name: 'Gradient Boosting (XGBoost / LightGBM)',
    accuracy: 0.912,
    precision: 0.898,
    recall: 0.934,
    f1_score: 0.916,
    roc_auc: 0.948,
    brier_score: 0.068,
    false_approval_rate: 0.048,
    false_rejection_rate: 0.052,
    train_time_sec: 2.14,
    inference_latency_ms: 12.4
  },
  {
    model_name: 'Random Forest Classifier',
    accuracy: 0.894,
    precision: 0.876,
    recall: 0.918,
    f1_score: 0.896,
    roc_auc: 0.932,
    brier_score: 0.079,
    false_approval_rate: 0.058,
    false_rejection_rate: 0.064,
    train_time_sec: 1.85,
    inference_latency_ms: 18.2
  },
  {
    model_name: 'Calibrated Logistic Regression (L2 Regularized)',
    accuracy: 0.846,
    precision: 0.824,
    recall: 0.862,
    f1_score: 0.843,
    roc_auc: 0.887,
    brier_score: 0.104,
    false_approval_rate: 0.088,
    false_rejection_rate: 0.092,
    train_time_sec: 0.32,
    inference_latency_ms: 2.1
  },
  {
    model_name: 'Decision Tree (CART with Cost-Complexity Pruning)',
    accuracy: 0.812,
    precision: 0.785,
    recall: 0.834,
    f1_score: 0.809,
    roc_auc: 0.835,
    brier_score: 0.142,
    false_approval_rate: 0.114,
    false_rejection_rate: 0.126,
    train_time_sec: 0.18,
    inference_latency_ms: 1.4
  }
];

/**
 * Algorithmic Fairness & Demographic Parity Evaluation across groups.
 */
export const FAIRNESS_AUDIT_GROUPS: FairnessMetricGroup[] = [
  {
    group_name: 'Salaried Private',
    category: 'Employment',
    total_applicants: 420,
    approved_count: 278,
    approval_rate: 0.662,
    precision: 0.892,
    recall: 0.925,
    false_positive_rate: 0.054,
    false_negative_rate: 0.075,
    disparate_impact_ratio: 0.98,
    status: 'Compliant (>= 0.80)'
  },
  {
    group_name: 'Salaried Government',
    category: 'Employment',
    total_applicants: 190,
    approved_count: 146,
    approval_rate: 0.768,
    precision: 0.941,
    recall: 0.958,
    false_positive_rate: 0.038,
    false_negative_rate: 0.042,
    disparate_impact_ratio: 1.00,
    status: 'Compliant (>= 0.80)'
  },
  {
    group_name: 'Self-Employed Professional / MSME',
    category: 'Employment',
    total_applicants: 260,
    approved_count: 154,
    approval_rate: 0.592,
    precision: 0.865,
    recall: 0.894,
    false_positive_rate: 0.068,
    false_negative_rate: 0.106,
    disparate_impact_ratio: 0.88,
    status: 'Compliant (>= 0.80)'
  },
  {
    group_name: 'Gig / Contract Worker',
    category: 'Employment',
    total_applicants: 130,
    approved_count: 62,
    approval_rate: 0.477,
    precision: 0.821,
    recall: 0.848,
    false_positive_rate: 0.089,
    false_negative_rate: 0.152,
    disparate_impact_ratio: 0.81,
    status: 'Compliant (>= 0.80)'
  },
  {
    group_name: 'Tier 1 Urban (Chennai, Coimbatore)',
    category: 'Geography',
    total_applicants: 540,
    approved_count: 362,
    approval_rate: 0.670,
    precision: 0.898,
    recall: 0.932,
    false_positive_rate: 0.051,
    false_negative_rate: 0.068,
    disparate_impact_ratio: 1.00,
    status: 'Compliant (>= 0.80)'
  },
  {
    group_name: 'Tier 2/3 Districts (Salem, Dindigul, Cuddalore)',
    category: 'Geography',
    total_applicants: 460,
    approved_count: 278,
    approval_rate: 0.604,
    precision: 0.882,
    recall: 0.908,
    false_positive_rate: 0.059,
    false_negative_rate: 0.092,
    disparate_impact_ratio: 0.90,
    status: 'Compliant (>= 0.80)'
  },
  {
    group_name: 'Age 21-30 (Early Career)',
    category: 'Age Group',
    total_applicants: 310,
    approved_count: 182,
    approval_rate: 0.587,
    precision: 0.874,
    recall: 0.891,
    false_positive_rate: 0.062,
    false_negative_rate: 0.109,
    disparate_impact_ratio: 0.89,
    status: 'Compliant (>= 0.80)'
  },
  {
    group_name: 'Age 31-50 (Prime Earning)',
    category: 'Age Group',
    total_applicants: 520,
    approved_count: 364,
    approval_rate: 0.700,
    precision: 0.912,
    recall: 0.942,
    false_positive_rate: 0.045,
    false_negative_rate: 0.058,
    disparate_impact_ratio: 1.00,
    status: 'Compliant (>= 0.80)'
  }
];

/**
 * Generates synthetic 1,000 banking loan dataset in CSV format.
 */
export function generateSyntheticCsv(recordCount: number = 1000): string {
  const headers = [
    'applicant_id',
    'full_name',
    'age',
    'gender',
    'marital_status',
    'dependents',
    'education',
    'employment_type',
    'employment_years',
    'monthly_income',
    'coapplicant_income',
    'loan_amount',
    'loan_term_months',
    'credit_score',
    'existing_emi',
    'bank_account_age_months',
    'previous_loan_count',
    'previous_default',
    'collateral_value',
    'location',
    'loan_purpose',
    'dti_ratio',
    'loan_status'
  ];

  const firstNames = ['Karthik', 'Priya', 'Sundaram', 'Deepa', 'Vignesh', 'Meenakshi', 'Arun', 'Kavitha', 'Senthil', 'Divya', 'Rajesh', 'Anitha', 'Murugan', 'Lakshmi', 'Vijay', 'Saranya'];
  const lastNames = ['Narayanan', 'Balaji', 'Subramanian', 'Krishnan', 'Ramaswamy', 'Gopal', 'Natarajan', 'Jayaraman', 'Venkatesh', 'Chettiar', 'Srinivasan', 'Sundar'];
  const educations = ['Graduate', 'Post Graduate', 'High School', 'Professional / Doctorate'];
  const employments = ['Salaried Private', 'Salaried Government', 'Self-Employed Professional', 'Self-Employed Business', 'Gig / Contract Worker'];
  const purposes = ['Home Purchase / Construction', 'Personal / Medical Emergency', 'Education', 'MSME / Small Business Expansion', 'Vehicle Loan'];
  const genders = ['Male', 'Female'];
  const maritals = ['Married', 'Single'];

  const rows: string[] = [headers.join(',')];

  for (let i = 1; i <= recordCount; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const age = 22 + ((i * 7) % 38);
    const gender = genders[i % 2];
    const marital = maritals[i % 2];
    const dependents = (i % 5);
    const edu = educations[i % educations.length];
    const emp = employments[i % employments.length];
    const empYears = 1 + (i % 18);
    const monthlyIncome = 25000 + ((i * 3731) % 150000);
    const coappIncome = (i % 3 === 0) ? 20000 + ((i * 1237) % 60000) : 0;
    const loanAmount = 200000 + ((i * 9871) % 4000000);
    const term = [24, 36, 48, 60, 84][i % 5];
    const cibil = Math.min(880, Math.max(480, 520 + ((i * 41) % 360)));
    const existingEmi = (i % 4 !== 0) ? Math.round(monthlyIncome * (0.05 + (i % 4) * 0.1)) : 0;
    const bankAge = 12 + (i % 84);
    const prevLoans = (i % 6);
    const prevDefault = (cibil < 580 && i % 3 === 0) ? 1 : 0;
    const collateral = (i % 2 === 0) ? Math.round(loanAmount * (0.8 + (i % 5) * 0.15)) : 0;
    const loc = TN_DISTRICTS[i % TN_DISTRICTS.length];
    const purpose = purposes[i % purposes.length];

    const totalIncome = monthlyIncome + coappIncome;
    const proposedEmi = Math.round((loanAmount * 0.00875 * Math.pow(1.00875, term)) / (Math.pow(1.00875, term) - 1));
    const dti = parseFloat((((existingEmi + proposedEmi) / totalIncome) * 100).toFixed(1));

    // Loan status (Ground Truth Target)
    let status = 'Approved';
    if (prevDefault === 1 || cibil < 560 || dti > 65) {
      status = 'Rejected';
    } else if (cibil < 650 || dti > 50) {
      status = (i % 3 === 0) ? 'Approved' : 'Rejected';
    } else {
      status = 'Approved';
    }

    rows.push([
      `APP-TN-DATA-${String(i).padStart(5, '0')}`,
      `"${fn} ${ln}"`,
      age,
      gender,
      marital,
      dependents,
      `"${edu}"`,
      `"${emp}"`,
      empYears,
      monthlyIncome,
      coappIncome,
      loanAmount,
      term,
      cibil,
      existingEmi,
      bankAge,
      prevLoans,
      prevDefault,
      collateral,
      `"${loc}"`,
      `"${purpose}"`,
      dti,
      status
    ].join(','));
  }

  return rows.join('\n');
}
