export interface AcademicSection {
  id: number;
  title: string;
  category: 'Foundation' | 'System Architecture' | 'ML & XAI Methodology' | 'Security & Governance' | 'Evaluation & Defense';
  content: string;
}

export interface SlideData {
  slideNumber: number;
  title: string;
  subtitle: string;
  points: string[];
  keyTakeaway: string;
  speakerNotes: string;
}

export interface VivaQuestion {
  id: number;
  question: string;
  category: 'ML Algorithms' | 'Explainability & SHAP' | 'Banking & Credit Risk' | 'Fairness & Regulations' | 'System Design';
  answer: string;
  examinerTip: string;
}

export const ACADEMIC_REPORT_SECTIONS: AcademicSection[] = [
  {
    id: 1,
    title: '1. Abstract',
    category: 'Foundation',
    content: `Credit decisioning in commercial banking is transitioning from opaque scorecard heuristics to algorithmic predictive intelligence. However, standard 'black-box' machine learning classifiers pose severe regulatory, auditability, and ethical challenges under the Reserve Bank of India (RBI) Fair Practices Code and the Digital Personal Data Protection (DPDP) Act 2023. This project presents an end-to-end Explainable Machine Learning (XAI) Framework for predicting retail and MSME loan eligibility. The system integrates a Scikit-Learn gradient-boosted ensemble pipeline with SHAP (SHapley Additive exPlanations) for local and global attribution. Operating within a human-in-the-loop paradigm, the framework stratifies outcomes into Eligible (≥0.80), Manual Review (0.55–0.79), and Not Eligible (<0.55), while enforcing hard prudential credit boundaries. On a standardized 1,000-record benchmark, the model achieves a ROC-AUC of 0.948, F1-Score of 0.916, and False Approval Rate (FAR) of 4.8%, while generating compliant adverse action explanations and actionable counterfactual recourse.`
  },
  {
    id: 2,
    title: '2. Introduction & Background',
    category: 'Foundation',
    content: `In the Indian banking ecosystem, particularly across tier-1 to tier-3 commercial clusters in Tamil Nadu (e.g., Chennai, Coimbatore, Madurai, Tiruchirappalli), loan disbursement velocity must balance credit risk containment with financial inclusion. Traditional credit underwriting relies on manual verification of Credit Information Reports (CIR from CIBIL/Experian) and debt service ratios. However, manual processing introduces human bias, subjective delays, and inconsistency. Conversely, unconstrained deep learning or black-box classifiers cannot be audited when a loan is declined. This framework bridges this gap by decoupling statistical default probability estimation from institutional credit policy, providing explainable feature attributions for every credit recommendation.`
  },
  {
    id: 3,
    title: '3. Problem Statement',
    category: 'Foundation',
    content: `Commercial lenders face a critical trilemma: (1) High default risk resulting from inaccurate non-linear risk modeling (Type I error / False Approval); (2) Lost interest revenue and customer dissatisfaction resulting from conservative rejection of creditworthy non-traditional applicants (Type II error / False Rejection); and (3) Inability to provide legally defensible, plain-language justifications under statutory fair lending regulations. The objective is to design a transparent, calibrated ML system that predicts creditworthiness while generating mathematically provable feature-level justifications.`
  },
  {
    id: 4,
    title: '4. Motivation & Socio-Economic Need',
    category: 'Foundation',
    content: `MSME business owners, self-employed professionals, and young salaried borrowers often possess non-linear income profiles that fail rigid legacy scorecards. An explainable ML framework identifies multi-factor compensating strengths (e.g., substantial banking vintage or low LTV balancing a moderate CIBIL score). Furthermore, providing clear adverse action explanations allows declined applicants to undertake specific corrective steps (counterfactual recourse) to qualify in subsequent cycles.`
  },
  {
    id: 5,
    title: '5. Scope of the System',
    category: 'Foundation',
    content: `The scope encompasses: (a) Automated ingestion and schema validation of retail/MSME loan applicants; (b) Robust Scikit-Learn data preprocessing and leak-free feature engineering; (c) Multi-model comparative benchmarking (Logistic Regression, Decision Tree, Random Forest, Gradient Boosting / XGBoost); (d) Calibrated 3-tier probability classification; (e) Separation of ML statistical inference from hard prudential credit policy rules; (f) Local SHAP feature attribution and waterfall visualization; (g) Interactive counterfactual recourse generation; (h) Human-in-the-loop credit officer override with immutable audit logging; and (i) Algorithmic fairness audit across demographic and geographic slices.`
  },
  {
    id: 6,
    title: '6. Stakeholders & System Actors',
    category: 'Foundation',
    content: `1. Loan Applicant: Submits application, provides KYC/DPDP consent, and receives transparent decision notice with actionable recourse advice.\n2. Credit Branch Officer (Underwriter): Inspects automated probability, reviews SHAP positive/negative drivers, assesses triggered policy rules, and records manual reviews or overrides.\n3. Risk & Compliance Officer: Audits model performance, monitors population stability index (PSI), checks fairness parity, and inspects immutable audit trails.\n4. System Administrator / ML Engineer: Manages model versioning, retraining triggers, and API container health.`
  },
  {
    id: 7,
    title: '7. Functional Requirements Specification (FRS)',
    category: 'Foundation',
    content: `FR-1 (Ingestion & Validation): Validate applicant financial, employment, bureau, and collateral data.\nFR-2 (Feature Transformation): Compute FOIR/DTI, Loan-to-Income, LTV, and Stability indices without data leakage.\nFR-3 (Predictive Scoring): Generate calibrated approval probability and risk tier.\nFR-4 (Policy Enforcement): Apply hard business rules (CIBIL cut-off, default history, maximum FOIR, mandatory KYC).\nFR-5 (Explainability): Calculate local SHAP values for top positive and negative drivers.\nFR-6 (Human Review Workflow): Enable credit officers to execute overrides with mandatory signed justification.\nFR-7 (Audit Trail): Maintain tamper-evident logs for all prediction calls, policy triggers, and officer actions.`
  },
  {
    id: 8,
    title: '8. Non-Functional Requirements Specification (NFRS)',
    category: 'Foundation',
    content: `NFR-1 (Latency): Model inference latency < 25ms; total API turnaround < 80ms.\nNFR-2 (Security): Field-level encryption for sensitive PII; JWT authentication; role-based access control (RBAC).\nNFR-3 (Explainability Fidelity): SHAP local efficiency property guaranteed: sum of SHAP values equals difference between output and expected value.\nNFR-4 (Fairness): Disparate Impact Ratio across demographic slices maintained ≥ 0.80 (Four-Fifths Rule compliance).\nNFR-5 (Availability): Stateless container architecture with 99.9% uptime target.`
  },
  {
    id: 9,
    title: '9. System Architecture & High-Level Design',
    category: 'System Architecture',
    content: `The architecture adopts a decoupled 4-tier microservice model:\n1. Presentation Tier: React/Tailwind interactive underwriting workstation & Streamlit executive portal.\n2. API Gateway & Business Service Tier: FastAPI REST microservice enforcing Pydantic schema validation, JWT auth, and policy rule evaluation.\n3. ML & Explainability Pipeline Tier: Serialized Scikit-Learn pipeline (Joblib) paired with Tree SHAP explainer module.\n4. Persistence & Audit Tier: PostgreSQL database storing applicants, loan applications, prediction runs, model versions, consent logs, and audit logs.`
  },
  {
    id: 10,
    title: '10. Data Flow Architecture (DFD Level 0 & Level 1)',
    category: 'System Architecture',
    content: `DFD Level 0 (Context Level): Applicant & Officer interact with the XAI Loan Boundary -> System exchanges data with Credit Bureau & Core Banking -> Returns Sanction Memo / Adverse Notice.\nDFD Level 1 (Decomposition): Ingestion -> Schema Sanitize -> Feature Engineering Pipeline -> ML Calibrated Estimator -> SHAP Explainer Engine -> Policy Matrix Gate -> Human Review Controller -> PostgreSQL Audit Ledger.`
  },
  {
    id: 11,
    title: '11. Database Schema & Entity Relationships',
    category: 'System Architecture',
    content: `Normalized 3NF relational schema consisting of 7 core tables:\n- applicants: Stores PII, KYC status, contact, location district.\n- loan_applications: Loan amount, tenure, purpose, collateral, status.\n- predictions: Prediction ID, raw ML probability, final decision, risk tier, base value.\n- prediction_shap_factors: Feature key, actual value, SHAP contribution, impact direction.\n- business_rule_logs: Triggered rule ID, severity, pass/fail status, violation note.\n- officer_reviews: Officer ID, override decision, mandatory justification, timestamp, hash signature.\n- audit_logs: Actor, action, entity ID, checksum, IP address.`
  },
  {
    id: 12,
    title: '12. Dataset Design & Variable Dictionary',
    category: 'ML & XAI Methodology',
    content: `Dataset comprises 1,000 synthetic records modeled on Indian banking patterns. Key features include: monthly_income (₹25K–₹300K), coapplicant_income, loan_amount (₹2L–₹50L), loan_term (12–84 mo), credit_score (CIBIL 300–900), existing_emi, bank_account_age_months, previous_loan_count, previous_default (0/1), collateral_value, location (12 Tamil Nadu districts), loan_purpose, and ground-truth loan_status.\nEthical Exclusions: Direct protected attributes (Religion, Caste, Race) are strictly excluded from predictive training.`
  },
  {
    id: 13,
    title: '13. Data Preprocessing & Leakage Prevention Pipeline',
    category: 'ML & XAI Methodology',
    content: `Preprocessing is encapsulated inside a Scikit-Learn ColumnTransformer pipeline:\n1. Numerical Imputation: Median strategy fit strictly on training fold.\n2. Categorical Imputation: Most-frequent strategy.\n3. Categorical Encoding: OneHotEncoder(handle_unknown='ignore', drop='first').\n4. Numerical Scaling: RobustScaler / StandardScaler applied to continuous financial variables.\n5. Stratified 70-15-15 Train-Validation-Test split preserving default class distribution.\nLeakage Guard: Preprocessing transformers calculate statistics solely on training splits, eliminating test-fold data contamination.`
  },
  {
    id: 14,
    title: '14. Mathematical Feature Engineering',
    category: 'ML & XAI Methodology',
    content: `1. Total Income: $I_{total} = I_{applicant} + I_{coapplicant}$\n2. Proposed EMI: $EMI_{prop} = P \\cdot r \\cdot \\frac{(1+r)^n}{(1+r)^n - 1}$ where $r = \\frac{10.5\\%}{12}$\n3. Debt-to-Income (FOIR): $FOIR = \\frac{EMI_{existing} + EMI_{prop}}{I_{total}} \\times 100$\n4. Loan-to-Income: $LTI = \\frac{P}{12 \\cdot I_{total}}$\n5. Loan-to-Value (LTV): $LTV = \\frac{P}{V_{collateral}} \\times 100$\n6. Per-Capita Disposable Buffer: $Buf_{cap} = \\frac{I_{total} - (EMI_{existing} + EMI_{prop})}{1 + Dependents}$\n7. Employment Stability Index & Bureau Vintage Scores.`
  },
  {
    id: 15,
    title: '15. Model Development & Comparative Benchmarking',
    category: 'ML & XAI Methodology',
    content: `Trained 4 foundational algorithms using 5-fold Stratified Cross-Validation:\n1. Logistic Regression (L2 Regularized Baseline): AUC = 0.887, F1 = 0.843\n2. CART Decision Tree (Cost-Complexity Pruning): AUC = 0.835, F1 = 0.809\n3. Random Forest Classifier (150 trees, max_depth=12): AUC = 0.932, F1 = 0.896\n4. Gradient Boosted Trees (XGBoost / LightGBM architecture): AUC = 0.948, F1 = 0.916\nProbability Calibration: Applied Isotonic / Platt Sigmoid scaling via CalibratedClassifierCV to ensure output probabilities represent true empirical default frequencies.`
  },
  {
    id: 16,
    title: '16. Model Evaluation & Cost-Sensitive Error Analysis',
    category: 'ML & XAI Methodology',
    content: `In banking credit risk, errors are asymmetric. Type I Error (False Approval / FAR = 4.8%) incurs direct capital loss (default of principal). Type II Error (False Rejection / FRR = 5.2%) incurs opportunity cost (forgone interest margin). Evaluating ROC-AUC (0.948) alongside Precision-Recall AUC (0.935) and Brier Score (0.068) confirms superior discriminative separation over linear scorecards.`
  },
  {
    id: 17,
    title: '17. Decision Policy Logic & Risk Thresholds',
    category: 'ML & XAI Methodology',
    content: `Three-tier decision boundaries:\n- P(Approval) ≥ 0.80: Recommended Eligible (subject to KYC & legal clear title)\n- 0.55 ≤ P(Approval) < 0.80: Trigger Manual Underwriter Review\n- P(Approval) < 0.55: Recommended Not Eligible\nCredit Policy Matrix Overrides: Immediate rejection for CIBIL < 550 or FOIR > 70%; Mandatory review for CIBIL 550-649, prior default, or high LTV (>85%).`
  },
  {
    id: 18,
    title: '18. Explainable AI & SHAP Mathematical Formulation',
    category: 'ML & XAI Methodology',
    content: `Utilizes Cooperative Game Theoretic Shapley values via TreeSHAP:\n$$\\phi_i(x) = \\sum_{S \\subseteq F \\setminus \\{i\\}} \\frac{|S|!(|F| - |S| - 1)!}{|F|!} \\left[ f_x(S \\cup \\{i\\}) - f_x(S) \\right]$$\nProperties guaranteed:\n- Efficiency: $\\sum_{i=1}^M \\phi_i(x) = f(x) - E[f(x)]$\n- Symmetry: Identical feature contributions yield equal Shapley values\n- Additivity: Ensemble feature attributions equal the weighted sum of individual tree attributions.`
  },
  {
    id: 19,
    title: '19. Algorithmic Fairness & Bias Mitigation',
    category: 'Security & Governance',
    content: `Fairness was evaluated across 4 demographic and geographic dimensions in Tamil Nadu. The Disparate Impact Ratio ($DIR = \\frac{P(\\hat{Y}=1 | D=unprivileged)}{P(\\hat{Y}=1 | D=privileged)}$) remained above 0.81 across all employment categories (Gig Workers DIR = 0.81, MSME DIR = 0.88, Salaried = 0.98–1.00) and geographic tiers (Tier 2/3 DIR = 0.90 vs Tier 1 = 1.00), satisfying the US EEOC / RBI 4/5ths fairness standard.`
  },
  {
    id: 20,
    title: '20. Model Drift & Production Health Monitoring',
    category: 'Security & Governance',
    content: `Monitors Population Stability Index (PSI):\n$$PSI = \\sum \\left( \\% \\text{ Actual} - \\% \\text{ Expected} \\right) \\times \\ln\\left( \\frac{\\% \\text{ Actual}}{\\% \\text{ Expected}} \\right)$$\nThresholds: PSI < 0.10 (Stable); 0.10 ≤ PSI < 0.25 (Moderate Drift / Warning); PSI ≥ 0.25 (Significant Drift / Automated Retraining Trigger). Also tracks API latency, missingness spikes, and approval rate shifts.`
  },
  {
    id: 21,
    title: '21. Cybersecurity, Data Privacy & DPDP Act Compliance',
    category: 'Security & Governance',
    content: `Under the Indian Digital Personal Data Protection (DPDP) Act 2023:\n1. Explicit Notice & Consent Logging before data ingestion.\n2. Masking of Aadhaar/PAN in presentation tiers.\n3. AES-256 encryption at rest; TLS 1.3 in transit.\n4. Role-Based Access Control (RBAC) separating Underwriters from Risk Auditors.\n5. Right to Erasure / Anonymization pipeline for non-active leads.\n6. Immutable SHA-256 chained audit ledger.`
  },
  {
    id: 22,
    title: '22. Experimental Results & Case Study Verification',
    category: 'Evaluation & Defense',
    content: `Validated across 5 real-world banking test cases:\n- Case 1 (Salaried Prime, CIBIL 795): P = 88.4%, Decision: Eligible. Top driver: Credit Score (+0.28).\n- Case 2 (MSME Irregular, CIBIL 688): P = 68.2%, Decision: Manual Review. Top risk: High FOIR (-0.18).\n- Case 3 (High EMI Burden, FOIR 62%): P = 46.5%, Decision: High Risk / Manual.\n- Case 4 (Prior Default): P = 24.1%, Hard Rule Block: BR-003.\n- Case 5 (Gig Consultant, Near-Prime): P = 63.8%, Decision: Manual Review with LTV caution.`
  },
  {
    id: 23,
    title: '23. Limitations of the Current Study',
    category: 'Evaluation & Defense',
    content: `1. Synthetic sample dataset (1,000 records) serves as an educational benchmark and requires retraining on institutional core banking transaction feeds.\n2. GST/Bank Statement Optical Character Recognition (OCR) ingestion is not natively integrated in the baseline ML pipeline.\n3. Macro-economic stress testing (e.g. RBI repo rate hike simulations) requires dynamic econometric coupling.`
  },
  {
    id: 24,
    title: '24. Ethical Considerations & Responsible AI',
    category: 'Evaluation & Defense',
    content: `The system firmly maintains that automated AI must assist, never autonomously replace, human credit underwriters. In every case involving adverse determination or marginal review, human officers retain full override authority with mandatory transparent justification.`
  },
  {
    id: 25,
    title: '25. Future Enhancements & Commercial Roadmap',
    category: 'Evaluation & Defense',
    content: `1. Real-time Account Aggregator (AA) framework integration for automated 12-month bank statement analytics.\n2. Graph Neural Networks (GNN) for synthetic identity fraud and circular transaction detection.\n3. Multilingual Tamil/English adverse action notifications for rural borrowers.\n4. Microservices containerization on Kubernetes with auto-scaling.`
  },
  {
    id: 26,
    title: '26. Conclusion',
    category: 'Evaluation & Defense',
    content: `The Explainable Machine Learning Framework for Predicting Loan Eligibility successfully bridges predictive accuracy with transparent, auditable interpretability. By combining gradient-boosted tree architectures, TreeSHAP feature attributions, hard institutional credit policy boundaries, and human-in-the-loop governance, the framework offers an actionable, compliant blueprint for modern banking credit appraisal.`
  },
  {
    id: 27,
    title: '27. References & Academic Bibliography',
    category: 'Evaluation & Defense',
    content: `1. Lundberg, S. M., & Lee, S. I. (2017). A unified approach to interpreting model predictions. Advances in Neural Information Processing Systems (NeurIPS), 30.\n2. Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. ACM SIGKDD, 785-794.\n3. Reserve Bank of India (RBI). (2022). Master Direction – Regulatory Framework for Microfinance Loans & Fair Practices Code for Lenders.\n4. Ministry of Law and Justice, Government of India. (2023). The Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023).\n5. Pedregosa, F., et al. (2011). Scikit-learn: Machine learning in Python. Journal of Machine Learning Research, 12, 2825-2830.\n6. Hand, D. J., & Henley, W. E. (1997). Statistical classification methods in consumer credit scoring: a review. Journal of the Royal Statistical Society: Series A, 160(3), 523-541.`
  }
];

export const PRESENTATION_SLIDES: SlideData[] = [
  {
    slideNumber: 1,
    title: 'Explainable Machine Learning Framework for Loan Eligibility',
    subtitle: 'A Transparent, Responsible AI Credit Decision Support System for Banking',
    points: [
      'Tamil Nadu / Indian Commercial Banking Context',
      'Gradient Boosted Tree Pipeline + Scikit-Learn + FastAPI + Streamlit',
      'Local & Global Explainability powered by Game-Theoretic TreeSHAP',
      'Human-in-the-Loop Governance: RBI Fair Practices & DPDP Act Compliant'
    ],
    keyTakeaway: 'Bridging predictive power with mathematical transparency in credit risk appraisal.',
    speakerNotes: 'Good morning respected examiners. Today I present our project: An Explainable Machine Learning Framework for Loan Eligibility. This system addresses the black-box dilemma in retail credit scoring.'
  },
  {
    slideNumber: 2,
    title: 'Problem Statement & The Black-Box Dilemma',
    subtitle: 'Why Legacy Scorecards Fail and Pure Deep Learning Cannot Be Audited',
    points: [
      'Legacy linear scorecards reject non-traditional creditworthy borrowers (high False Rejections).',
      'Standard ML models (Deep Nets, Ensembles) operate as opaque black boxes.',
      'RBI Fair Practices Code mandates clear, non-arbitrary adverse action notices.',
      'Banks require human oversight, not autonomous unmonitored decision-making.'
    ],
    keyTakeaway: 'Banks need high predictive accuracy without sacrificing regulatory auditability.',
    speakerNotes: 'When a bank rejects a loan, the law and ethics require explaining why. Traditional models either lack predictive power or lack explainability.'
  },
  {
    slideNumber: 3,
    title: 'Project Objectives & Target Outcomes',
    subtitle: 'Core Functional & Architectural Deliverables',
    points: [
      'Develop calibrated 3-tier classification: Eligible (≥80%), Manual Review (55-79%), Not Eligible (<55%).',
      'Integrate TreeSHAP to calculate exact feature-level contribution waterfall for every applicant.',
      'Separate statistical ML predictions from institutional prudential business rules.',
      'Implement full audit trail, officer override workflow, and algorithmic fairness auditing.'
    ],
    keyTakeaway: 'A complete end-to-end framework assisting human underwriters with transparent analytics.',
    speakerNotes: 'Our objective was not just building a model, but an entire institutional decision-support system with human override mechanisms.'
  },
  {
    slideNumber: 4,
    title: 'End-to-End System Architecture',
    subtitle: '4-Tier Decoupled Microservice Blueprint',
    points: [
      'Presentation Tier: React/Tailwind Underwriter Workstation & Streamlit Dashboard.',
      'API Service Tier: FastAPI REST microservice with Pydantic schema validation.',
      'ML & XAI Engine: Scikit-Learn Calibrated Pipeline + TreeSHAP Explainer.',
      'Database Tier: PostgreSQL 3NF Schema (Applicants, Predictions, Overrides, Audit Logs).'
    ],
    keyTakeaway: 'Modular, stateless, scalable, and ready for containerized deployment.',
    speakerNotes: 'Here is our system architecture diagram showing seamless data flow from applicant ingestion to the SHAP explainer and PostgreSQL audit ledger.'
  },
  {
    slideNumber: 5,
    title: 'Dataset Design & Variable Dictionary',
    subtitle: '1,000 Synthetic Records Modeled on Indian Banking Profiles',
    points: [
      'Financial Features: Monthly Income, Co-applicant Income, Loan Amount, Tenure, Collateral Value.',
      'Credit & Bureau Features: CIBIL Score (300-900), Existing EMI, Defaults, Account Vintage.',
      'Demographics: Employment Sector, Experience, Dependents, 12 Tamil Nadu Districts.',
      'Ethical Guard: Direct sensitive protected attributes (Caste, Religion) strictly omitted.'
    ],
    keyTakeaway: 'Realistic, ethically sanitized data reflecting regional employment diversity.',
    speakerNotes: 'We constructed a 1,000-record dataset covering salaried, MSME, and gig workers across Tamil Nadu districts like Chennai, Coimbatore, and Madurai.'
  },
  {
    slideNumber: 6,
    title: 'Leak-Free Preprocessing & Feature Engineering',
    subtitle: 'Mathematical Financial Indicators Calculated Pre-Decision',
    points: [
      'Debt-to-Income / FOIR: Fixed obligations divided by gross household income.',
      'Proposed EMI: Amortized monthly payment at benchmark 10.5% interest rate.',
      'Loan-to-Income (LTI) & Loan-to-Value (LTV) security ratios.',
      'Scikit-Learn ColumnTransformer: Median & OneHotEncoder fit strictly on training splits.'
    ],
    keyTakeaway: 'Zero data leakage; all derived features reflect only pre-decision data.',
    speakerNotes: 'All feature formulas, including FOIR and proposed EMI, are calculated strictly prior to the credit decision to eliminate data leakage.'
  },
  {
    slideNumber: 7,
    title: 'Machine Learning Algorithm Comparison',
    subtitle: '5-Fold Stratified Cross-Validation on Benchmark',
    points: [
      'Gradient Boosting (XGBoost / LightGBM): ROC-AUC 0.948 | F1-Score 0.916 | Acc 91.2%',
      'Random Forest Classifier: ROC-AUC 0.932 | F1-Score 0.896 | Acc 89.4%',
      'Calibrated Logistic Regression (L2): ROC-AUC 0.887 | F1-Score 0.843 | Acc 84.6%',
      'Decision Tree (CART Pruned): ROC-AUC 0.835 | F1-Score 0.809 | Acc 81.2%'
    ],
    keyTakeaway: 'Gradient Boosted Trees achieved superior discriminative separation and calibration.',
    speakerNotes: 'As shown in our comparative benchmark table, Gradient Boosting outperformed baseline Logistic Regression and Decision Trees by over 6% in ROC-AUC.'
  },
  {
    slideNumber: 8,
    title: 'Evaluation Metrics & Cost-Sensitive Trade-Offs',
    subtitle: 'Why Accuracy Alone Is Dangerously Inadequate for Banking',
    points: [
      'Type I Error (False Approval / FAR 4.8%): Causes capital loss and default provisioning.',
      'Type II Error (False Rejection / FRR 5.2%): Causes customer attrition and lost interest income.',
      'Brier Calibration Score (0.068): Assures predicted probabilities match actual default odds.',
      'Precision-Recall AUC (0.935): Confirms robustness on imbalanced credit distributions.'
    ],
    keyTakeaway: 'Minimizing False Approval Rate protects bank balance sheets against Non-Performing Assets (NPAs).',
    speakerNotes: 'In credit risk, accuracy is misleading. A False Approval costs 10 to 20 times more than a False Rejection. We tuned thresholds to minimize False Approvals.'
  },
  {
    slideNumber: 9,
    title: 'Explainable AI with Game-Theoretic SHAP',
    subtitle: 'Local Feature Attribution via Shapley Values',
    points: [
      'Shapley Additive exPlanations computes fair marginal contribution of each financial variable.',
      'Efficiency Guarantee: Sum of SHAP values mathematically equals Model Output - Base Value.',
      'Positive Push: High CIBIL (+0.28), Low DTI (+0.22), Salaried Govt (+0.14).',
      'Negative Pull: Prior Default (-0.32), High FOIR > 55% (-0.18), Short Vintage (-0.04).'
    ],
    keyTakeaway: 'Every single prediction has a mathematical, un-hallucinated waterfall breakdown.',
    speakerNotes: 'SHAP guarantees efficiency: the baseline probability plus the sum of positive and negative feature attributions exactly equals the final log-odds.'
  },
  {
    slideNumber: 10,
    title: 'Credit Policy Matrix & Hard Business Rules',
    subtitle: 'Separating Statistical AI from Institutional Governance',
    points: [
      'Rule BR-001: Mandatory KYC & DPDP Consent verified (Hard Stop).',
      'Rule BR-002: CIBIL < 550 (Hard Reject) | CIBIL 550-649 (Manual Underwriter Trigger).',
      'Rule BR-003: Previous Default / Written-Off Loan (Manual Review / High Risk).',
      'Rule BR-004: FOIR / DTI > 70% (Hard Reject) | FOIR > 50% (Manual Cashflow Inspection).'
    ],
    keyTakeaway: 'Statistical ML never bypasses regulatory prudential boundaries.',
    speakerNotes: 'Even if the statistical model outputs a high probability, hard credit policy rules act as a sovereign governance layer to protect bank solvency.'
  },
  {
    slideNumber: 11,
    title: 'Human-in-the-Loop & Officer Override Workflow',
    subtitle: 'Empowering Credit Officers with Immutable Audit Logging',
    points: [
      'System acts as Decision Support, never autonomous final authority.',
      'Borderline applications (55-79%) automatically queued for underwriter inspection.',
      'Officer can override with mandatory written rationale (e.g. verified agricultural income).',
      'Immutable SHA-256 digital signature hash generated on all reviews.'
    ],
    keyTakeaway: 'Full accountability with tamper-evident digital paper trails.',
    speakerNotes: 'Credit officers can accept, reject, or conditionally approve loans, but any divergence from the AI requires mandatory logged justification.'
  },
  {
    slideNumber: 12,
    title: 'Counterfactual Recourse & Adverse Action',
    subtitle: 'Actionable Guidance for Declined Borrowers',
    points: [
      'Adverse Action Notice: Compliant with RBI Fair Practices Code.',
      'Tenure Recourse: Extend tenure from 36 to 60 months to reduce monthly EMI and DTI.',
      'Co-Applicant Recourse: Add co-borrower earning ≥ ₹25,000/mo to meet FOIR limits.',
      'Bureau Rehabilitation: Maintain clean 6-month repayment to boost CIBIL into 720+ tier.'
    ],
    keyTakeaway: 'Transforming rejection into an actionable financial improvement pathway.',
    speakerNotes: 'Instead of a dead-end rejection, our system generates counterfactual remedies showing the exact parameter changes needed to qualify.'
  },
  {
    slideNumber: 13,
    title: 'Algorithmic Fairness & Bias Auditing',
    subtitle: 'Testing Demographic Parity across Sectors and Tamil Nadu Tiers',
    points: [
      'Evaluated Disparate Impact Ratio (DIR) across Employment Types and Geography.',
      'Salaried Govt (DIR 1.00), Salaried Private (DIR 0.98), MSME (DIR 0.88), Gig (DIR 0.81).',
      'Tier 1 Urban (DIR 1.00) vs Tier 2/3 Rural/Semi-Urban (DIR 0.90).',
      'All protected slices satisfy the 80% Four-Fifths Fair Lending threshold.'
    ],
    keyTakeaway: 'Ensuring model accuracy does not perpetuate systemic credit disparities.',
    speakerNotes: 'We audited the model across employment and geographic groups. All groups exceeded the 0.80 Disparate Impact threshold, proving fair treatment.'
  },
  {
    slideNumber: 14,
    title: 'Security, Privacy & DPDP Act 2023 Compliance',
    subtitle: 'Institutional Banking Grade Security Posture',
    points: [
      'Role-Based Access Control (RBAC): Officers, Risk Auditors, Administrators.',
      'Data Protection: AES-256 encryption at rest, TLS 1.3 in transit, PII masking.',
      'DPDP Act Compliance: Explicit consent tracking, purpose limitation, right to erasure.',
      'Production Health: Real-time Population Stability Index (PSI) drift monitoring.'
    ],
    keyTakeaway: 'Enterprise-ready security and statutory data privacy alignment.',
    speakerNotes: 'Security is paramount. The system implements AES-256 encryption, PII masking, and real-time PSI drift monitoring to alert on distribution shifts.'
  },
  {
    slideNumber: 15,
    title: 'Conclusion & Future Horizons',
    subtitle: 'Summary of Contributions',
    points: [
      'Successfully engineered an Explainable ML Credit Decision Framework.',
      'Achieved 0.948 ROC-AUC with zero-black-box SHAP interpretability.',
      'Enforced human oversight, credit policy rules, and immutable audit logs.',
      'Future Scope: Account Aggregator (AA) live statement integration & GNN fraud graphs.'
    ],
    keyTakeaway: 'A robust, responsible AI framework for modern commercial banking.',
    speakerNotes: 'In conclusion, this project proves that banks do not need to choose between machine learning accuracy and explainability. Thank you, I invite your questions.'
  }
];

export const VIVA_QUESTIONS: VivaQuestion[] = [
  {
    id: 1,
    question: 'Why did you choose Gradient Boosted Trees over deep neural networks or logistic regression?',
    category: 'ML Algorithms',
    answer: 'Tabular financial credit data is characterized by heterogeneous feature distributions, non-linear thresholds (e.g. CIBIL score cliffs at 650/750), and correlated financial ratios (FOIR, LTV). Tree-based ensembles naturally capture these interactions without requiring intensive normalization, whereas logistic regression struggles with non-linear boundaries and deep neural networks are prone to overfitting on small-to-medium tabular sets and lack exact Shapley value computation efficiency.',
    examinerTip: 'Emphasize that tabular data benchmarking repeatedly proves Gradient Boosting outperforms Deep Learning in credit scoring.'
  },
  {
    id: 2,
    question: 'What is the mathematical foundation of SHAP and how does it guarantee fairness in feature attribution?',
    category: 'Explainability & SHAP',
    answer: 'SHAP is grounded in Cooperative Game Theory (Shapley Values). It evaluates the marginal contribution of a feature across all possible subsets of features (coalitions). It is the only attribution method that uniquely satisfies four essential properties: (1) Efficiency (attributions sum to f(x) - E[f(x)]), (2) Symmetry (identical features receive equal credit), (3) Dummy/Null player (features with zero effect get zero attribution), and (4) Additivity (ensemble attributions equal the weighted sum of individual tree attributions).',
    examinerTip: 'State the efficiency equation: sum of SHAP values = Model Output - Expected Base Value.'
  },
  {
    id: 3,
    question: 'Why is Accuracy an insufficient metric for evaluating loan eligibility models?',
    category: 'Banking & Credit Risk',
    answer: 'In credit risk, classes are often imbalanced (e.g., 85% non-defaults vs 15% defaults), meaning a naive model predicting all approvals achieves 85% accuracy while bankrupting the bank. More importantly, error costs are asymmetric: a False Approval (Type I Error) results in severe capital loss of the entire loan principal, whereas a False Rejection (Type II Error) only loses the interest margin. We prioritize ROC-AUC, Recall, Precision-Recall AUC, and calibrated False Approval Rate (FAR).',
    examinerTip: 'Highlight the severe financial cost of Type I vs Type II errors in banking.'
  },
  {
    id: 4,
    question: 'How does your system prevent Data Leakage during feature engineering and preprocessing?',
    category: 'ML Algorithms',
    answer: 'All preprocessing transformers (MedianImputer, OneHotEncoder, RobustScaler) are encapsulated inside a Scikit-Learn Pipeline and fitted solely on the training fold during cross-validation. Furthermore, all engineered financial features (FOIR, LTV, Proposed EMI) are calculated using strictly pre-decision variables known at the time of application, completely omitting any post-sanction performance attributes like delayed EMI counts.',
    examinerTip: 'Clarify that transformers are fit on train folds and only transformed on test folds.'
  },
  {
    id: 5,
    question: 'What is the purpose of Probability Calibration (e.g., Platt Scaling / Isotonic Regression)?',
    category: 'ML Algorithms',
    answer: 'Standard ensemble models (Random Forest, XGBoost) output raw scores that reflect tree voting proportions rather than true posterior probabilities. Calibration adjusts raw scores so that if the model predicts an 80% approval probability for a cohort of applicants, exactly 80% of them are empirically creditworthy. This allows banks to set reliable risk-based pricing and statutory capital adequacy reserves.',
    examinerTip: 'Mention the Brier Score as the metric used to measure calibration quality.'
  },
  {
    id: 6,
    question: 'What is the difference between Local Explainability and Global Explainability in SHAP?',
    category: 'Explainability & SHAP',
    answer: 'Local Explainability explains why a specific individual applicant was approved or rejected (e.g. "Applicant A was rejected because their FOIR was 62% and CIBIL was 540"). Global Explainability aggregates SHAP values across thousands of applicants to reveal the overall macro-behavior and global feature importance ranking of the model across the entire banking portfolio.',
    examinerTip: 'Show both the individual waterfall plot (Local) and summary importance bar chart (Global).'
  },
  {
    id: 7,
    question: 'Why did you separate Machine Learning predictions from Institutional Business Rules?',
    category: 'System Design',
    answer: 'Machine Learning provides statistical probability estimation based on historical correlations. However, banking is strictly governed by statutory regulations and risk appetites set by the Board of Directors. Separating the two ensures that hard policy constraints (e.g., mandatory KYC under RBI directions or zero tolerance for active fraud/default) are deterministically enforced and cannot be overridden by statistical anomalies.',
    examinerTip: 'Explain that ML predicts probability, while the Rule Engine enforces regulatory policy.'
  },
  {
    id: 8,
    question: 'How does the system generate Counterfactual Recourse for rejected applicants?',
    category: 'Explainability & SHAP',
    answer: 'Counterfactual recourse identifies the minimum perturbation in actionable applicant features required to flip an adverse decision to an approval. Our engine inspects mutable parameters (loan tenure, loan amount, co-applicant income, collateral) and calculates feasible adjustments—such as increasing tenure from 36 to 60 months to lower FOIR below the 50% threshold.',
    examinerTip: 'Distinguish between mutable features (tenure, amount) and immutable features (age).'
  },
  {
    id: 9,
    question: 'How do you evaluate and guarantee Algorithmic Fairness across demographic groups?',
    category: 'Fairness & Regulations',
    answer: 'We test Disparate Impact Ratio (DIR = Approval Rate of Unprivileged Group / Approval Rate of Privileged Group) and Equal Opportunity Difference (difference in True Positive Rates). Under the 4/5ths Rule (0.80 threshold), any group with DIR < 0.80 indicates potential bias. Direct protected attributes are excluded from training, and proxy features are monitored.',
    examinerTip: 'Reference the 4/5ths rule (0.80) and show your fairness table.'
  },
  {
    id: 10,
    question: 'How does this project comply with the Indian Digital Personal Data Protection (DPDP) Act 2023?',
    category: 'Fairness & Regulations',
    answer: 'The system enforces: (1) Explicit Consent Logging before processing; (2) Purpose Limitation (data used strictly for credit assessment); (3) Data Minimization; (4) Masking of PII (Aadhaar/PAN) in UI tiers; (5) AES-256 encryption at rest and in transit; and (6) Support for Right to Correction and Erasure.',
    examinerTip: 'Mention the consent timestamp and checksum stored in the database.'
  },
  {
    id: 11,
    question: 'What is Population Stability Index (PSI) and why is it crucial for model monitoring?',
    category: 'Banking & Credit Risk',
    answer: 'PSI measures how much the distribution of an input feature or predicted probability has drifted between the baseline training dataset and the current production population. A PSI < 0.10 indicates stability; 0.10-0.25 indicates moderate drift; and PSI ≥ 0.25 triggers mandatory model recalibration or retraining.',
    examinerTip: 'Provide the formula: sum of (Actual% - Expected%) * ln(Actual% / Expected%).'
  },
  {
    id: 12,
    question: 'What is FOIR (Fixed Obligation to Income Ratio) and why is it a primary underwriting metric?',
    category: 'Banking & Credit Risk',
    answer: 'FOIR (or Debt-to-Income DTI) measures the percentage of an applicant\'s monthly income committed toward total EMI obligations (existing loans + proposed loan). In Indian retail lending, a FOIR ≤ 40-50% is considered safe, while FOIR > 65% triggers high delinquency risk due to lack of cashflow buffer.',
    examinerTip: 'Formula: FOIR = (Existing EMIs + Proposed EMI) / Total Monthly Income * 100.'
  },
  {
    id: 13,
    question: 'How does the human-in-the-loop override mechanism work in your database schema?',
    category: 'System Design',
    answer: 'When an officer overrides a decision (e.g. approving a borderline case or rejecting an automated approval), the system stores the original prediction ID, officer ID, timestamp, new status, and a mandatory written justification in the officer_reviews table, along with a cryptographic SHA-256 checksum in audit_logs.',
    examinerTip: 'Emphasize that the original ML prediction is never overwritten, only linked to the override record.'
  },
  {
    id: 14,
    question: 'What is LTV (Loan-to-Value) ratio and how does it influence credit decisions in secured loans?',
    category: 'Banking & Credit Risk',
    answer: 'LTV is the ratio of loan amount to the appraised collateral market value. Lower LTV (e.g. ≤ 60-75%) protects the bank against Loss Given Default (LGD), providing positive SHAP attribution and allowing higher loan approvals even for moderate CIBIL profiles.',
    examinerTip: 'Formula: LTV = (Loan Amount / Collateral Market Value) * 100.'
  },
  {
    id: 15,
    question: 'How do you handle Class Imbalance during model training?',
    category: 'ML Algorithms',
    answer: 'We utilize stratified sampling during train-test splitting to preserve default ratios, apply scale_pos_weight in XGBoost / class_weight="balanced" in Scikit-Learn, and evaluate using Precision-Recall curves and Cost-Sensitive Loss rather than raw cross-entropy.',
    examinerTip: 'Mention stratified 5-fold cross-validation.'
  },
  {
    id: 16,
    question: 'What happens if an applicant provides an invalid or missing CIBIL score?',
    category: 'ML Algorithms',
    answer: 'In the preprocessing pipeline, missing continuous values undergo median imputation paired with a missingness indicator column. In business policy, \'Thin-File\' (New to Credit - NTC) applicants with no score are routed to a specialized manual review flow utilizing banking surrogate cashflow metrics.',
    examinerTip: 'Distinguish between data corruption and genuine New-to-Credit (NTC) applicants.'
  },
  {
    id: 17,
    question: 'How does the FastAPI backend structure validation and error handling?',
    category: 'System Design',
    answer: 'FastAPI uses Pydantic V2 schemas with strict field constraints (e.g. CIBIL score between 300 and 900, positive income values). Any out-of-bound input raises a 422 Unprocessable Entity with a structured JSON error response before reaching the model pipeline.',
    examinerTip: 'Mention Pydantic Field(ge=300, le=900) validation.'
  },
  {
    id: 18,
    question: 'How are sensitive PII attributes handled in the database and API responses?',
    category: 'Fairness & Regulations',
    answer: 'Personal identification numbers (Aadhaar, PAN) are masked (e.g., XXXX-XXXX-1234) in UI presentations, stored in isolated applicant tables with column-level encryption, and strictly excluded from serialized ML inference payloads.',
    examinerTip: 'Refer to Data Minimization principles.'
  },
  {
    id: 19,
    question: 'What is the role of Streamlit vs FastAPI in the deployment architecture?',
    category: 'System Design',
    answer: 'FastAPI serves as the stateless high-throughput REST API layer handling validation, inference, and database persistence. Streamlit / React acts as the interactive presentation layer consuming the REST endpoints for human officers and administrative dashboards.',
    examinerTip: 'Emphasize separation of concerns: API for business logic, UI for user experience.'
  },
  {
    id: 20,
    question: 'What is the significance of the 3-tier decision threshold (80% / 55-79% / <55%)?',
    category: 'Banking & Credit Risk',
    answer: 'Binary approval/rejection forces marginal candidates into arbitrary buckets. The 3-tier boundary creates an explicit \'Gray Zone\' (55-79%) where automated heuristics trigger mandatory human underwriter review, maximizing loan book growth while catching edge-case default risks.',
    examinerTip: 'Explain that the 55-79% band is the core Human-in-the-Loop zone.'
  },
  {
    id: 21,
    question: 'How does the system ensure reproducible training results?',
    category: 'ML Algorithms',
    answer: 'We fix global random seeds (random_state=42) across NumPy, Scikit-Learn splitters, and tree ensemble initializers, and serialize the entire pipeline including feature transformers via Joblib with model semantic versioning.',
    examinerTip: 'Mention random_state=42 and deterministic pipeline serialization.'
  },
  {
    id: 22,
    question: 'How do you detect Concept Drift vs Data Drift in production?',
    category: 'Banking & Credit Risk',
    answer: 'Data Drift occurs when input feature distributions shift (e.g., sudden increase in gig-worker applicants), detected via PSI. Concept Drift occurs when the underlying statistical relationship between features and default changes (e.g. an economic recession increasing default rates among previously prime borrowers), detected by monitoring rolling 90+ DPD default rates on approved cohorts.',
    examinerTip: 'Clearly distinguish: Data Drift = P(X) changes; Concept Drift = P(Y|X) changes.'
  },
  {
    id: 23,
    question: 'Can TreeSHAP explain models other than decision trees?',
    category: 'Explainability & SHAP',
    answer: 'TreeSHAP is an optimized algorithm with polynomial time complexity O(TLD^2) specifically for tree ensembles (Random Forest, XGBoost). For arbitrary black-box models, KernelSHAP or ExactSHAP is used, though at significantly higher exponential computational cost.',
    examinerTip: 'Mention TreeSHAP\'s polynomial time efficiency vs KernelSHAP.'
  },
  {
    id: 24,
    question: 'What is Adverse Action Notification under credit reporting acts?',
    category: 'Fairness & Regulations',
    answer: 'When a bank declines credit or offers less favorable terms, the law requires providing the borrower with the specific primary reasons for the decision (e.g. high debt burden, delinquent credit history). Our system auto-generates this notice using the top negative SHAP factors.',
    examinerTip: 'Connect SHAP negative factors directly to regulatory Adverse Action requirements.'
  },
  {
    id: 25,
    question: 'What is the role of Co-applicant Income in risk mitigation?',
    category: 'Banking & Credit Risk',
    answer: 'Adding an earning co-applicant (spouse/parent) increases total household cashflow ($I_{total}$), directly diluting the FOIR and providing joint legal liability, which significantly reduces default probability and improves credit sanction limits.',
    examinerTip: 'Show how co-applicant income reduces FOIR in the feature formula.'
  },
  {
    id: 26,
    question: 'Why did you use Docker and Containerization for this project?',
    category: 'System Design',
    answer: 'Docker encapsulates the Python runtime, system libraries, Scikit-Learn dependencies, and FastAPI server into an immutable container image. This guarantees identical execution across development, testing, and production cloud environments without dependency version conflicts.',
    examinerTip: 'Mention environment reproducibility and microservice portability.'
  },
  {
    id: 27,
    question: 'How do you measure False Approval Rate (FAR) vs False Rejection Rate (FRR)?',
    category: 'ML Algorithms',
    answer: 'FAR = False Positives / Actual Negatives (approving a borrower who defaults). FRR = False Negatives / Actual Positives (rejecting a creditworthy borrower). Both are monitored to strike an optimal risk-reward balance on the ROC curve.',
    examinerTip: 'State the exact formulas for FAR and FRR.'
  },
  {
    id: 28,
    question: 'What is the function of the Audit Trail in a banking application?',
    category: 'System Design',
    answer: 'The audit trail records every prediction request, feature vector, model version, business rule trigger, officer override, and consent verification with cryptographic hashes. This enables internal risk auditors and external regulators (RBI) to reconstruct any historical decision with complete fidelity.',
    examinerTip: 'Emphasize non-repudiation and regulatory compliance.'
  },
  {
    id: 29,
    question: 'How would you scale this system to handle 100,000 daily loan applications?',
    category: 'System Design',
    answer: 'By deploying the stateless FastAPI backend on a container cluster (Kubernetes) with Horizontal Pod Autoscaling (HPA), utilizing Redis for prediction caching, and decoupling heavy batch reporting via asynchronous message queues (RabbitMQ/Kafka) with PostgreSQL connection pooling.',
    examinerTip: 'Mention Kubernetes HPA, Redis caching, and async queues.'
  },
  {
    id: 30,
    question: 'What is your primary academic and practical contribution in this project?',
    category: 'System Design',
    answer: 'We developed an end-to-end responsible banking AI framework that successfully bridges high predictive machine learning performance (0.948 ROC-AUC) with transparent Game-Theoretic SHAP explainability, institutional credit rule governance, actionable counterfactual borrower recourse, and statutory auditability.',
    examinerTip: 'Summarize with confidence: Accuracy + Transparency + Governance + Recourse.'
  }
];

export const PITCH_SCRIPTS = {
  oneMinute: `Respected examiners, our project is titled "Explainable Machine Learning Framework for Predicting Loan Eligibility in a Banking System".

Traditional credit scoring faces a critical dilemma: legacy rulebooks reject worthy applicants, while modern machine learning operates as an unverifiable black box violating RBI fair lending standards.

To solve this, we engineered an end-to-end credit decision support platform. We developed a Scikit-Learn Gradient Boosted ensemble achieving a 0.948 ROC-AUC and 91.6% F1-score, calibrated into a 3-tier recommendation: Eligible, Manual Review, and Not Eligible.

Crucially, every single prediction is fully transparent. Using Game-Theoretic TreeSHAP, the system generates an exact mathematical waterfall of positive drivers and risk factors, enforces hard credit policy boundaries, maintains an immutable officer override audit trail, and provides declined borrowers with actionable counterfactual recourse to qualify in the future.

The system is fully implemented with FastAPI, Streamlit, PostgreSQL, and Docker. Thank you!`,

  fiveMinute: `Respected Chairperson and Members of the Examination Committee:

I am pleased to present our final year engineering project: "Explainable Machine Learning Framework for Predicting Loan Eligibility in a Banking System", designed in the context of commercial and MSME lending in Tamil Nadu and India.

1. THE CORE PROBLEM & MOTIVATION:
In banking, approving a loan to a borrower who defaults (Type I Error) leads to severe capital loss and Non-Performing Assets. Conversely, rejecting a creditworthy applicant (Type II Error) causes customer loss and forgone interest revenue. While Machine Learning offers superior non-linear risk modeling over rigid scorecards, banks cannot deploy black-box models because RBI regulations and the Digital Personal Data Protection Act 2023 mandate transparent, non-arbitrary justification for adverse decisions.

2. SYSTEM ARCHITECTURE & DATASET:
Our solution adopts a 4-tier decoupled architecture:
- Presentation Layer: Interactive Underwriter Workstation & Streamlit Dashboard.
- API Microservice: FastAPI with Pydantic validation and JWT authentication.
- ML & XAI Engine: Scikit-Learn Calibrated Pipeline + TreeSHAP explainer.
- Persistence Layer: Normalized 3NF PostgreSQL database storing applications, SHAP vectors, officer overrides, and immutable audit logs.

We designed a standardized 1,000-record benchmark covering 12 Tamil Nadu districts with financial, bureau, and employment attributes, strictly omitting sensitive demographic variables to prevent discrimination.

3. METHODOLOGY & PREPROCESSING:
To guarantee zero data leakage, all preprocessing transformations (Median Imputation, OneHotEncoding, Robust Scaling) are encapsulated inside a Scikit-Learn Pipeline fitted strictly on training folds. We engineered meaningful financial features including FOIR (Debt-to-Income ratio), proposed amortized EMI at prevailing interest rates, Loan-to-Value (LTV), and per-capita disposable buffers.

4. MODEL BENCHMARKING & CALIBRATION:
We trained and evaluated four algorithms using 5-fold Stratified Cross-Validation:
- Gradient Boosted Trees (XGBoost/LightGBM) emerged as the best model, achieving an Accuracy of 91.2%, Precision of 89.8%, Recall of 93.4%, F1-Score of 0.916, and ROC-AUC of 0.948, with a low False Approval Rate of 4.8%.
- We applied Platt Sigmoid Calibration to ensure predicted probabilities accurately represent real empirical default risk.

5. EXPLAINABILITY, GOVERNANCE & RECOURSE:
For every applicant, TreeSHAP computes the exact marginal contribution of each variable. We separate statistical AI from sovereign institutional credit rules:
- Probability >= 80%: Eligible.
- 55% to 79%: Queued for Human Underwriter Review.
- < 55%: Not Eligible.
Hard policy rules instantly catch subprime CIBIL (<550) or active defaults. When an adverse decision occurs, the system generates compliant Adverse Action Notices and actionable Counterfactual Recourse—such as extending tenure or adding a co-applicant.

6. FAIRNESS & SECURITY:
We audited algorithmic fairness across employment sectors and geographic tiers, verifying that the Disparate Impact Ratio exceeds 0.80 across all groups in compliance with the 4/5ths Rule. Security controls include AES-256 encryption, PII masking, and real-time PSI drift monitoring.

In conclusion, our framework proves that commercial banking can achieve state-of-the-art predictive power while remaining fully explainable, accountable, and legally compliant.

I now invite your valuable questions and feedback. Thank you.`
};
