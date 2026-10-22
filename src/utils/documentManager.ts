import { ClientDocumentRecord, DocumentVerificationStatus, ApplicantInput } from '../types';

export interface DocumentSlotDefinition {
  key: string;
  title: string;
  subtitle: string;
  category: 'IDENTITY' | 'FINANCIAL' | 'RESIDENCE' | 'COLLATERAL';
  required: boolean;
  acceptedTypes: string;
  description: string;
}

export const VERIFICATION_DOCUMENT_SLOTS: DocumentSlotDefinition[] = [
  {
    key: 'aadhaar',
    title: 'Aadhaar Card',
    subtitle: 'Govt UIDAI Identity & Address Proof',
    category: 'IDENTITY',
    required: true,
    acceptedTypes: 'image/png,image/jpeg,image/webp,application/pdf',
    description: 'Front & Back copy showing 12-digit UID and QR code.'
  },
  {
    key: 'pan',
    title: 'PAN Card',
    subtitle: 'Income Tax Department Permanent Account Card',
    category: 'IDENTITY',
    required: true,
    acceptedTypes: 'image/png,image/jpeg,image/webp,application/pdf',
    description: 'Clear photograph, 10-character alphanumeric PAN and signature.'
  },
  {
    key: 'income',
    title: 'Income Certificate / ITR',
    subtitle: 'Revenue Department Certificate or Form 16 / ITR-V',
    category: 'FINANCIAL',
    required: true,
    acceptedTypes: 'image/png,image/jpeg,image/webp,application/pdf',
    description: 'Government certified annual household income proof or latest ITR.'
  },
  {
    key: 'bank_statement',
    title: 'Bank Statement (6 Months)',
    subtitle: 'Primary Operating Bank Account Statement',
    category: 'FINANCIAL',
    required: false,
    acceptedTypes: 'image/png,image/jpeg,image/webp,application/pdf',
    description: 'Comprehensive cash-flow ledger with bank stamp & IFSC.'
  },
  {
    key: 'salary_slip',
    title: 'Salary Slips (3 Months)',
    subtitle: 'Employer Monthly Pay Stubs & Net Earnings',
    category: 'FINANCIAL',
    required: false,
    acceptedTypes: 'image/png,image/jpeg,image/webp,application/pdf',
    description: 'Breakdown of Basic Pay, HRA, DA, and Provident Fund deductions.'
  },
  {
    key: 'utility_bill',
    title: 'Address Proof / Electricity Bill',
    subtitle: 'TANGEDCO / Municipal Utility Service Receipt',
    category: 'RESIDENCE',
    required: false,
    acceptedTypes: 'image/png,image/jpeg,image/webp,application/pdf',
    description: 'Recent residential electricity or municipal property tax receipt.'
  },
  {
    key: 'collateral',
    title: 'Collateral / Asset Title Deed',
    subtitle: 'Registered Property Deed & Valuation Report',
    category: 'COLLATERAL',
    required: false,
    acceptedTypes: 'image/png,image/jpeg,image/webp,application/pdf',
    description: 'Sub-registrar encumbrance certificate or chartered valuation report.'
  }
];

/**
 * Generates an SVG data URL representing a realistic digital document
 * with applicant details, authentic seals, stamps, and layout.
 */
export function generateSampleDocumentDataUrl(
  docType: string,
  applicant: Partial<ApplicantInput>
): string {
  const name = (applicant.full_name || 'Applicant').toUpperCase();
  const dob = applicant.age ? `${applicant.age} Yrs` : '32 Yrs';
  const gender = applicant.gender || 'Male';
  const location = applicant.location || 'Chennai, Tamil Nadu';
  const incomeStr = applicant.monthly_income
    ? `₹${applicant.monthly_income.toLocaleString('en-IN')}/month (Annual: ₹${(
        applicant.monthly_income * 12
      ).toLocaleString('en-IN')})`
    : '₹85,000/month';
  const rawAadhaar = applicant.aadhaar_raw || '6421 8812 8901';
  const rawPan = applicant.pan_raw || 'ABCDE8901F';

  let svgContent = '';

  if (docType === 'aadhaar') {
    svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="flag" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FF9933" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#138808" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Card Body with rounded border -->
  <rect x="15" y="15" width="670" height="410" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" filter="url(#shadow)"/>
  
  <!-- Header Stripes -->
  <rect x="15" y="15" width="670" height="10" rx="10" fill="#FF9933"/>
  <rect x="15" y="65" width="670" height="4" fill="#0284c7"/>

  <!-- Top Emblem / Government Header -->
  <text x="350" y="42" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b" letter-spacing="1">भारत सरकार • GOVERNMENT OF INDIA</text>
  <text x="350" y="58" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b">UNIQUE IDENTIFICATION AUTHORITY OF INDIA</text>

  <!-- Applicant Photo Box -->
  <rect x="45" y="90" width="140" height="170" rx="12" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
  <circle cx="115" cy="150" r="38" fill="#cbd5e1"/>
  <path d="M 80 230 Q 115 190 150 230 Z" fill="#94a3b8"/>
  <rect x="45" y="240" width="140" height="20" rx="4" fill="#0284c7" opacity="0.9"/>
  <text x="115" y="254" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">PHOTO VERIFIED</text>

  <!-- Applicant Details Block -->
  <text x="210" y="112" font-size="12" font-weight="500" fill="#64748b">Name / பெயர்:</text>
  <text x="210" y="134" font-size="18" font-weight="bold" fill="#0f172a">${name}</text>

  <text x="210" y="162" font-size="12" font-weight="500" fill="#64748b">DOB / Age / Gender:</text>
  <text x="210" y="180" font-size="14" font-weight="600" fill="#1e293b">${dob} • ${gender}</text>

  <text x="210" y="206" font-size="12" font-weight="500" fill="#64748b">Address / முகவரி:</text>
  <text x="210" y="224" font-size="13" font-weight="500" fill="#334155">${location}</text>
  <text x="210" y="242" font-size="11" fill="#64748b">Tamil Nadu, India</text>

  <!-- QR Code Mock Graphic -->
  <g transform="translate(530, 95)">
    <rect x="0" y="0" width="120" height="120" fill="#ffffff" stroke="#0f172a" stroke-width="2" rx="8"/>
    <rect x="10" y="10" width="30" height="30" fill="#0f172a"/>
    <rect x="80" y="10" width="30" height="30" fill="#0f172a"/>
    <rect x="10" y="80" width="30" height="30" fill="#0f172a"/>
    <rect x="18" y="18" width="14" height="14" fill="#ffffff"/>
    <rect x="88" y="18" width="14" height="14" fill="#ffffff"/>
    <rect x="18" y="88" width="14" height="14" fill="#ffffff"/>
    <rect x="50" y="50" width="20" height="20" fill="#0284c7"/>
    <circle cx="60" cy="60" r="4" fill="#ffffff"/>
    <text x="60" y="135" text-anchor="middle" font-size="9" font-weight="bold" fill="#64748b">UIDAI SECURE QR</text>
  </g>

  <!-- Aadhaar Number Bar -->
  <rect x="45" y="285" width="610" height="60" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
  <text x="350" y="325" text-anchor="middle" font-size="26" font-weight="900" fill="#0f172a" letter-spacing="4">${rawAadhaar}</text>
  <text x="350" y="340" text-anchor="middle" font-size="10" font-weight="bold" fill="#16a34a">✓ VERIFIED WITH UIDAI e-KYC VAULT</text>

  <!-- Bottom Strip -->
  <rect x="15" y="365" width="670" height="60" rx="0" fill="#dc2626"/>
  <path d="M 15 405 Q 15 425 35 425 L 665 425 Q 685 425 685 405 Z" fill="#dc2626"/>
  <text x="350" y="395" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff" letter-spacing="1">मेरा आधार, मेरी पहचान (Mera Aadhaar, Meri Pehchan)</text>
  <text x="350" y="412" text-anchor="middle" font-size="11" fill="#fef2f2">DPDP Act 2023 Compliant • Official Document of Record</text>
</svg>`;
  } else if (docType === 'pan') {
    svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="shadow2" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Card Body -->
  <rect x="15" y="15" width="670" height="410" rx="20" fill="#eff6ff" stroke="#3b82f6" stroke-width="2" filter="url(#shadow2)"/>
  
  <!-- Header Bar -->
  <rect x="15" y="15" width="670" height="70" rx="18" fill="#1e3a8a"/>
  <rect x="15" y="65" width="670" height="20" fill="#1e3a8a"/>
  
  <text x="50" y="45" font-size="15" font-weight="bold" fill="#ffffff" letter-spacing="1">आयकर विभाग / INCOME TAX DEPARTMENT</text>
  <text x="50" y="65" font-size="12" font-weight="600" fill="#93c5fd">GOVT. OF INDIA • PERMANENT ACCOUNT NUMBER CARD</text>

  <!-- Emblem graphic placeholder -->
  <circle cx="620" cy="50" r="22" fill="#3b82f6" opacity="0.5"/>
  <text x="620" y="55" text-anchor="middle" font-size="16" fill="#ffffff">🏛️</text>

  <!-- Photo Box -->
  <rect x="45" y="110" width="130" height="160" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <circle cx="110" cy="165" r="35" fill="#cbd5e1"/>
  <path d="M 80 240 Q 110 200 140 240 Z" fill="#64748b"/>
  <rect x="45" y="245" width="130" height="25" rx="4" fill="#0f172a"/>
  <text x="110" y="262" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">ITD AUTHENTIC</text>

  <!-- Details -->
  <text x="200" y="130" font-size="11" font-weight="600" fill="#64748b">CARD HOLDER'S NAME / பெயர்:</text>
  <text x="200" y="154" font-size="19" font-weight="900" fill="#0f172a">${name}</text>

  <text x="200" y="185" font-size="11" font-weight="600" fill="#64748b">FATHER'S NAME / தந்தை பெயர்:</text>
  <text x="200" y="205" font-size="14" font-weight="700" fill="#1e293b">K. KRISHNASAMY</text>

  <text x="200" y="235" font-size="11" font-weight="600" fill="#64748b">DATE OF BIRTH / பிறந்த தேதி:</text>
  <text x="200" y="255" font-size="14" font-weight="700" fill="#1e293b">15/06/1990 (${dob})</text>

  <!-- Hologram Stamp Mock -->
  <g transform="translate(540, 120)">
    <circle cx="45" cy="45" r="40" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
    <text x="45" y="42" text-anchor="middle" font-size="10" font-weight="bold" fill="#854d0e">GOVT OF INDIA</text>
    <text x="45" y="56" text-anchor="middle" font-size="9" font-weight="bold" fill="#854d0e">HOLOGRAM</text>
  </g>

  <!-- PAN Number Highlight Box -->
  <rect x="45" y="295" width="610" height="65" rx="12" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
  <text x="65" y="320" font-size="11" font-weight="bold" fill="#64748b">PERMANENT ACCOUNT NUMBER (PAN)</text>
  <text x="65" y="348" font-size="26" font-weight="900" fill="#1e3a8a" letter-spacing="5">${rawPan}</text>
  <text x="590" y="338" text-anchor="end" font-size="12" font-weight="bold" fill="#16a34a">✓ NSDL ACTIVE & VERIFIED</text>

  <!-- Signature Band -->
  <rect x="45" y="375" width="280" height="35" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="55" y="396" font-style="italic" font-size="16" font-family="cursive" fill="#0f172a">${name.split(' ')[0]} Sign</text>
  <text x="270" y="396" font-size="9" fill="#94a3b8">HOLDER SIGNATURE</text>

  <text x="640" y="398" text-anchor="end" font-size="11" font-weight="bold" fill="#475569">Income Tax Department e-Filing Portal Verified</text>
</svg>`;
  } else if (docType === 'income') {
    svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">
  <rect x="15" y="15" width="670" height="410" rx="16" fill="#ffffff" stroke="#059669" stroke-width="3"/>
  <rect x="25" y="25" width="650" height="400" rx="12" fill="#f0fdf4" opacity="0.6"/>

  <text x="350" y="55" text-anchor="middle" font-size="16" font-weight="bold" fill="#065f46">GOVERNMENT OF TAMIL NADU • REVENUE DEPARTMENT</text>
  <text x="350" y="75" text-anchor="middle" font-size="12" font-weight="bold" fill="#047857">வருமானச் சான்றிதழ் / INCOME & ASSET CERTIFICATE</text>
  <line x1="60" y1="88" x2="640" y2="88" stroke="#059669" stroke-width="1.5"/>

  <text x="60" y="115" font-size="12" font-weight="600" fill="#334155">Certificate No: <tspan font-weight="bold" fill="#0f172a">REV/TN/2026/INC-982144</tspan></text>
  <text x="640" y="115" text-anchor="end" font-size="12" font-weight="600" fill="#334155">Date: <tspan font-weight="bold" fill="#0f172a">${new Date().toLocaleDateString('en-IN')}</tspan></text>

  <rect x="60" y="130" width="580" height="180" rx="10" fill="#ffffff" stroke="#a7f3d0" stroke-width="1.5"/>
  
  <text x="80" y="160" font-size="13" fill="#334155">This is to officially certify that <tspan font-weight="bold" fill="#0f172a">${name}</tspan>,</text>
  <text x="80" y="185" font-size="13" fill="#334155">Residing at: <tspan font-weight="bold" fill="#0f172a">${location}, Tamil Nadu</tspan>.</text>
  <text x="80" y="210" font-size="13" fill="#334155">Occupation: <tspan font-weight="bold" fill="#0f172a">${applicant.employment_type || 'Salaried / Professional'}</tspan></text>
  
  <rect x="80" y="230" width="540" height="60" rx="8" fill="#dcfce7" stroke="#16a34a"/>
  <text x="100" y="255" font-size="11" font-weight="bold" fill="#166534">ASSESSED ANNUAL HOUSEHOLD INCOME (VALIDATED):</text>
  <text x="100" y="280" font-size="20" font-weight="900" fill="#14532d">${incomeStr}</text>

  <!-- Digital Stamp and Sign -->
  <circle cx="150" cy="365" r="35" fill="none" stroke="#059669" stroke-width="2" stroke-dasharray="4 2"/>
  <text x="150" y="360" text-anchor="middle" font-size="9" font-weight="bold" fill="#065f46">TAHSILDAR</text>
  <text x="150" y="372" text-anchor="middle" font-size="8" font-weight="bold" fill="#065f46">TALUK OFFICE</text>

  <text x="500" y="355" text-anchor="middle" font-size="12" font-weight="bold" fill="#065f46">Digitally Signed by Competent Authority</text>
  <text x="500" y="372" text-anchor="middle" font-size="10" fill="#64748b">Tamil Nadu e-District Mission Mode Project</text>
  <text x="500" y="388" text-anchor="middle" font-size="10" font-weight="bold" fill="#16a34a">✓ QR Code & Digital Signature Verified</text>
</svg>`;
  } else if (docType === 'bank_statement') {
    svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">
  <rect x="15" y="15" width="670" height="410" rx="16" fill="#ffffff" stroke="#6366f1" stroke-width="2"/>
  <rect x="15" y="15" width="670" height="65" rx="14" fill="#4338ca"/>
  <rect x="15" y="60" width="670" height="20" fill="#4338ca"/>

  <text x="45" y="45" font-size="18" font-weight="bold" fill="#ffffff">STATE BANK / HDFC BANKING CIRCLE</text>
  <text x="45" y="65" font-size="11" fill="#c7d2fe">OFFICIAL ACCOUNT STATEMENT • LAST 6 MONTHS CASH FLOW AUDIT</text>

  <text x="45" y="110" font-size="11" font-weight="bold" fill="#64748b">ACCOUNT HOLDER:</text>
  <text x="45" y="128" font-size="15" font-weight="bold" fill="#0f172a">${name}</text>
  
  <text x="320" y="110" font-size="11" font-weight="bold" fill="#64748b">A/C NO: <tspan fill="#0f172a">XXXX-XXXX-449102</tspan></text>
  <text x="320" y="128" font-size="11" font-weight="bold" fill="#64748b">IFSC: <tspan fill="#0f172a">HDFC0001824 (Branch: ${location.split(',')[0]})</tspan></text>

  <!-- Table Header -->
  <rect x="45" y="150" width="610" height="28" fill="#e0e7ff" rx="6"/>
  <text x="55" y="168" font-size="10" font-weight="bold" fill="#3730a3">DATE</text>
  <text x="140" y="168" font-size="10" font-weight="bold" fill="#3730a3">TRANSACTION / PARTICULARS</text>
  <text x="420" y="168" font-size="10" font-weight="bold" fill="#3730a3">CREDIT (₹)</text>
  <text x="520" y="168" font-size="10" font-weight="bold" fill="#3730a3">BALANCE (₹)</text>

  <!-- Table Rows -->
  <text x="55" y="198" font-size="10" fill="#334155">01/09/2026</text>
  <text x="140" y="198" font-size="10" font-weight="600" fill="#0f172a">SALARY CREDIT / BUSINESS INFLOW</text>
  <text x="420" y="198" font-size="10" font-weight="bold" fill="#16a34a">+ ₹85,000</text>
  <text x="520" y="198" font-size="10" font-weight="bold" fill="#0f172a">₹2,42,100</text>

  <text x="55" y="228" font-size="10" fill="#334155">01/08/2026</text>
  <text x="140" y="228" font-size="10" font-weight="600" fill="#0f172a">SALARY CREDIT / BUSINESS INFLOW</text>
  <text x="420" y="228" font-size="10" font-weight="bold" fill="#16a34a">+ ₹85,000</text>
  <text x="520" y="228" font-size="10" font-weight="bold" fill="#0f172a">₹1,95,300</text>

  <text x="55" y="258" font-size="10" fill="#334155">01/07/2026</text>
  <text x="140" y="258" font-size="10" font-weight="600" fill="#0f172a">SALARY CREDIT / BUSINESS INFLOW</text>
  <text x="420" y="258" font-size="10" font-weight="bold" fill="#16a34a">+ ₹85,000</text>
  <text x="520" y="258" font-size="10" font-weight="bold" fill="#0f172a">₹1,78,000</text>

  <rect x="45" y="285" width="610" height="50" rx="8" fill="#eef2ff" stroke="#c7d2fe"/>
  <text x="65" y="306" font-size="11" font-weight="bold" fill="#4338ca">AVERAGE MONTHLY INFLOW: ₹85,000 • NO BOUNCED CHEQUES OR NACH REJECTIONS</text>
  <text x="65" y="324" font-size="10" fill="#4f46e5">6 Months Peak Balance: ₹3,10,000 • Verified via Account Aggregator Framework</text>

  <!-- Bank Stamp -->
  <circle cx="560" cy="380" r="32" fill="none" stroke="#4f46e5" stroke-width="2"/>
  <text x="560" y="378" text-anchor="middle" font-size="8" font-weight="bold" fill="#4338ca">BRANCH MANAGER</text>
  <text x="560" y="389" text-anchor="middle" font-size="7" font-weight="bold" fill="#4338ca">OFFICIALLY VERIFIED</text>
</svg>`;
  } else if (docType === 'salary_slip') {
    svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">
  <rect x="15" y="15" width="670" height="410" rx="16" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
  <rect x="15" y="15" width="670" height="60" rx="14" fill="#0369a1"/>
  <text x="350" y="45" text-anchor="middle" font-size="18" font-weight="bold" fill="#ffffff">PAYSLIP / SALARY CERTIFICATE</text>
  <text x="350" y="62" text-anchor="middle" font-size="11" fill="#bae6fd">CONFIDENTIAL • EMPLOYER VERIFICATION OF EARNINGS</text>

  <text x="45" y="105" font-size="12" font-weight="bold" fill="#64748b">Employee Name: <tspan fill="#0f172a">${name}</tspan></text>
  <text x="45" y="125" font-size="12" font-weight="bold" fill="#64748b">Designation: <tspan fill="#0f172a">Senior Professional / MSME Proprietor</tspan></text>
  <text x="380" y="105" font-size="12" font-weight="bold" fill="#64748b">Pay Period: <tspan fill="#0f172a">August 2026</tspan></text>
  <text x="380" y="125" font-size="12" font-weight="bold" fill="#64748b">PF No / UAN: <tspan fill="#0f172a">100984729104</tspan></text>

  <rect x="45" y="145" width="290" height="180" rx="8" fill="#f0f9ff" stroke="#bae6fd"/>
  <text x="55" y="170" font-size="12" font-weight="bold" fill="#0369a1">EARNINGS (₹)</text>
  <text x="55" y="200" font-size="11" fill="#334155">Basic Pay: ₹50,000</text>
  <text x="55" y="225" font-size="11" fill="#334155">House Rent Allowance: ₹20,000</text>
  <text x="55" y="250" font-size="11" fill="#334155">Special Allowances: ₹15,000</text>
  <text x="55" y="295" font-size="13" font-weight="bold" fill="#0f172a">Gross Pay: ₹85,000</text>

  <rect x="365" y="145" width="290" height="180" rx="8" fill="#fef2f2" stroke="#fecaca"/>
  <text x="375" y="170" font-size="12" font-weight="bold" fill="#b91c1c">DEDUCTIONS (₹)</text>
  <text x="375" y="200" font-size="11" fill="#334155">Provident Fund (PF): ₹4,800</text>
  <text x="375" y="225" font-size="11" fill="#334155">Professional Tax (PT): ₹200</text>
  <text x="375" y="250" font-size="11" fill="#334155">Income Tax TDS: ₹3,000</text>
  <text x="375" y="295" font-size="13" font-weight="bold" fill="#b91c1c">Total Deductions: ₹8,000</text>

  <rect x="45" y="340" width="610" height="60" rx="10" fill="#f0fdf4" stroke="#86efac"/>
  <text x="65" y="365" font-size="12" font-weight="bold" fill="#15803d">NET SALARY CREDITED TO BANK:</text>
  <text x="65" y="390" font-size="20" font-weight="900" fill="#166534">₹77,000 (Seventy-Seven Thousand Rupees)</text>
  <text x="620" y="380" text-anchor="end" font-size="11" font-weight="bold" fill="#15803d">✓ Verified with EPFO & Form 26AS</text>
</svg>`;
  } else {
    // Default generic verified document
    svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">
  <rect x="15" y="15" width="670" height="410" rx="16" fill="#ffffff" stroke="#475569" stroke-width="2"/>
  <rect x="15" y="15" width="670" height="60" rx="14" fill="#334155"/>
  <text x="350" y="45" text-anchor="middle" font-size="18" font-weight="bold" fill="#ffffff">OFFICIAL LOAN VERIFICATION DOCUMENT</text>
  <text x="350" y="62" text-anchor="middle" font-size="11" fill="#cbd5e1">${docType.toUpperCase().replace(/_/g, ' ')} RECORD</text>

  <text x="60" y="120" font-size="13" font-weight="bold" fill="#64748b">APPLICANT NAME:</text>
  <text x="60" y="145" font-size="20" font-weight="bold" fill="#0f172a">${name}</text>

  <text x="60" y="180" font-size="12" font-weight="bold" fill="#64748b">LOCATION / DISTRICT: <tspan fill="#0f172a">${location}</tspan></text>
  <text x="60" y="205" font-size="12" font-weight="bold" fill="#64748b">DOCUMENT RECORD TYPE: <tspan fill="#0f172a">${docType}</tspan></text>
  <text x="60" y="230" font-size="12" font-weight="bold" fill="#64748b">AUTHENTICITY VERIFICATION: <tspan fill="#16a34a">VERIFIED & ENCRYPTED WITH DPDP VAULT</tspan></text>

  <rect x="60" y="260" width="580" height="120" rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="80" y="295" font-size="12" font-weight="bold" fill="#334155">Official Registry Reference: REG-TN-2026-${Math.floor(100000 + Math.random() * 900000)}</text>
  <text x="80" y="320" font-size="11" fill="#64748b">This digital document has been verified by the Credit Appraisal System.</text>
  <text x="80" y="345" font-size="11" font-weight="bold" fill="#16a34a">✓ Validated against official statutory database records.</text>
</svg>`;
  }

  // Return as clean dataUrl
  const encoded = encodeURIComponent(svgContent.trim());
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/**
 * Creates initial default documents for a seeded application
 */
export function createDefaultDocumentsForApplicant(
  applicant: ApplicantInput,
  appId: string
): ClientDocumentRecord[] {
  const now = new Date();
  const uploadedTime = new Date(now.getTime() - 3600000 * 2).toISOString();

  const aadhaarUrl = generateSampleDocumentDataUrl('aadhaar', applicant);
  const panUrl = generateSampleDocumentDataUrl('pan', applicant);
  const incomeUrl = generateSampleDocumentDataUrl('income', applicant);
  const bankUrl = generateSampleDocumentDataUrl('bank_statement', applicant);

  const cleanName = (applicant.full_name || 'Applicant').replace(/\s+/g, '_');

  return [
    {
      id: `DOC-${appId}-AADHAAR`,
      docType: 'aadhaar',
      title: 'Aadhaar Card',
      fileName: `${cleanName}_Aadhaar_Card.jpg`,
      fileType: 'image/jpeg',
      fileSize: 428000,
      uploadedAt: uploadedTime,
      status: 'VERIFIED',
      verifiedBy: 'UIDAI e-KYC Vault System',
      verifiedAt: uploadedTime,
      dataUrl: aadhaarUrl
    },
    {
      id: `DOC-${appId}-PAN`,
      docType: 'pan',
      title: 'PAN Card',
      fileName: `${cleanName}_PAN_Card.png`,
      fileType: 'image/png',
      fileSize: 312000,
      uploadedAt: uploadedTime,
      status: 'VERIFIED',
      verifiedBy: 'NSDL Tax Verification Gateway',
      verifiedAt: uploadedTime,
      dataUrl: panUrl
    },
    {
      id: `DOC-${appId}-INCOME`,
      docType: 'income',
      title: 'Income Certificate / ITR',
      fileName: `${cleanName}_Income_Certificate_2026.pdf`,
      fileType: 'image/svg+xml',
      fileSize: 620000,
      uploadedAt: uploadedTime,
      status: 'PENDING',
      dataUrl: incomeUrl
    },
    {
      id: `DOC-${appId}-BANK`,
      docType: 'bank_statement',
      title: 'Bank Statement (6 Months)',
      fileName: `${cleanName}_Bank_Statement_HDFC.pdf`,
      fileType: 'image/svg+xml',
      fileSize: 1240000,
      uploadedAt: uploadedTime,
      status: 'PENDING',
      dataUrl: bankUrl
    }
  ];
}
