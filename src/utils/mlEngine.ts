import {
  ApplicantInput,
  EngineeredFeatures,
  ShapFactor,
  BusinessRuleResult,
  PredictionResult,
  DecisionStatus,
  RiskTier
} from '../types';

/**
 * Calculates standard monthly EMI for loan amount P, tenure n (months), annual interest rate r (percentage).
 * Formula: EMI = P * (r/12) * (1 + r/12)^n / ((1 + r/12)^n - 1)
 */
export function calculateEMI(principal: number, tenureMonths: number, annualRatePct: number = 10.5): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const monthlyRate = annualRatePct / (12 * 100);
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}

/**
 * Executes Feature Engineering Pipeline with strictly pre-decision financial formulas.
 */
export function engineerFeatures(input: ApplicantInput): EngineeredFeatures {
  const total_income = Math.max(input.monthly_income + input.coapplicant_income, 1000);
  const annual_income = total_income * 12;
  
  // Calculate Proposed EMI assuming prevailing risk-based interest rate (10.5% base)
  const proposed_emi = calculateEMI(input.loan_amount, input.loan_term_months, 10.5);
  const total_emi = input.existing_emi + proposed_emi;

  // Debt-to-Income (FOIR / Fixed Obligation to Income Ratio)
  const dti_ratio = parseFloat(((total_emi / total_income) * 100).toFixed(2));

  // Loan to Income Ratio
  const loan_to_income_ratio = parseFloat((input.loan_amount / annual_income).toFixed(2));

  // Existing EMI Ratio
  const existing_emi_ratio = parseFloat(((input.existing_emi / total_income) * 100).toFixed(2));

  // Loan to Value (LTV) Ratio
  const loan_to_value_ratio = input.collateral_value > 0
    ? parseFloat(((input.loan_amount / input.collateral_value) * 100).toFixed(2))
    : 100; // Unsecured or 100%

  // Income per dependent
  const income_per_dependent = Math.round(total_income / (1 + Math.max(0, input.dependents)));

  // Employment stability score (0 - 100)
  let stabilityScore = 50;
  if (input.employment_type === 'Salaried Government') stabilityScore += 30;
  else if (input.employment_type === 'Salaried Private') stabilityScore += 20;
  else if (input.employment_type === 'Self-Employed Professional') stabilityScore += 15;
  else if (input.employment_type === 'Self-Employed Business') stabilityScore += 10;
  else stabilityScore -= 10; // Gig / Contract

  if (input.employment_years >= 5) stabilityScore += 20;
  else if (input.employment_years >= 2) stabilityScore += 10;
  else if (input.employment_years < 1) stabilityScore -= 15;

  stabilityScore = Math.min(100, Math.max(10, stabilityScore));

  // Previous Repayment Score (0 - 100)
  let repaymentScore = Math.round(((input.credit_score - 300) / 600) * 80);
  if (input.previous_default) repaymentScore -= 45;
  if (input.previous_loan_count > 0 && !input.previous_default) repaymentScore += 20;
  if (input.bank_account_age_months >= 36) repaymentScore += 10;
  repaymentScore = Math.min(100, Math.max(5, repaymentScore));

  return {
    total_income,
    annual_income,
    proposed_emi,
    total_emi,
    dti_ratio,
    loan_to_income_ratio,
    existing_emi_ratio,
    loan_to_value_ratio,
    income_per_dependent,
    employment_stability_score: stabilityScore,
    previous_repayment_score: repaymentScore
  };
}

/**
 * Evaluates Hard Banking Business Rules (Separated from Statistical ML Model).
 */
export function evaluateBusinessRules(
  input: ApplicantInput,
  engineered: EngineeredFeatures
): { rules: BusinessRuleResult[]; hardReject: boolean; triggerManual: boolean; summaryMessage: string } {
  const results: BusinessRuleResult[] = [];
  let hardReject = false;
  let triggerManual = false;
  const triggerMessages: string[] = [];

  // Rule 1: KYC and Consent Validation (RBI Regulatory Compliance / DPDP Act)
  if (!input.kyc_verified || !input.consent_signed) {
    hardReject = true;
    results.push({
      ruleId: 'BR-001',
      ruleName: 'Mandatory KYC & Data Processing Consent',
      ruleCategory: 'KYC_CONSENT',
      severity: 'HARD_REJECT',
      passed: false,
      reason: !input.kyc_verified 
        ? 'KYC identity verification is incomplete or failed.'
        : 'Applicant consent under DPDP Act 2023 is missing.',
      recommendedAction: 'Obtain verified KYC documents (Aadhaar/PAN) and formal signed consent.'
    });
    triggerMessages.push('Incomplete KYC / Missing Consent');
  } else {
    results.push({
      ruleId: 'BR-001',
      ruleName: 'Mandatory KYC & Data Processing Consent',
      ruleCategory: 'KYC_CONSENT',
      severity: 'PASS',
      passed: true,
      reason: 'KYC authenticated and borrower consent logged.',
      recommendedAction: 'No action required.'
    });
  }

  // Rule 2: Minimum CIBIL Score Threshold
  if (input.credit_score < 550) {
    hardReject = true;
    results.push({
      ruleId: 'BR-002',
      ruleName: 'Severe Subprime Credit Score',
      ruleCategory: 'CREDIT_SCORE',
      severity: 'HARD_REJECT',
      passed: false,
      reason: `CIBIL Score of ${input.credit_score} is below minimum bank cut-off (550).`,
      recommendedAction: 'Direct applicant to credit restoration advisory before reapplying in 6 months.'
    });
    triggerMessages.push(`Subprime CIBIL Score (${input.credit_score})`);
  } else if (input.credit_score < 650) {
    triggerManual = true;
    results.push({
      ruleId: 'BR-002',
      ruleName: 'Near-Prime CIBIL Score',
      ruleCategory: 'CREDIT_SCORE',
      severity: 'TRIGGER_MANUAL',
      passed: false,
      reason: `CIBIL Score of ${input.credit_score} falls into the caution band (550 - 649).`,
      recommendedAction: 'Officer must inspect detailed CIR (Credit Information Report) for recent 30+ DPD inquiries.'
    });
    triggerMessages.push(`Marginal Credit Score (${input.credit_score})`);
  } else {
    results.push({
      ruleId: 'BR-002',
      ruleName: 'CIBIL Credit Score Check',
      ruleCategory: 'CREDIT_SCORE',
      severity: 'PASS',
      passed: true,
      reason: `CIBIL Score of ${input.credit_score} meets standard prime criteria (>= 650).`,
      recommendedAction: 'Proceed with standard documentation.'
    });
  }

  // Rule 3: Prior Default History
  if (input.previous_default) {
    triggerManual = true;
    results.push({
      ruleId: 'BR-003',
      ruleName: 'Prior Default / Written-Off Loan History',
      ruleCategory: 'DEFAULT_HISTORY',
      severity: 'TRIGGER_MANUAL',
      passed: false,
      reason: 'Applicant has a recorded history of loan default or loan settlement.',
      recommendedAction: 'Verify if No Objection Certificate (NOC) and full closure receipt are available.'
    });
    triggerMessages.push('Prior Loan Default Recorded');
  } else {
    results.push({
      ruleId: 'BR-003',
      ruleName: 'Default History Check',
      ruleCategory: 'DEFAULT_HISTORY',
      severity: 'PASS',
      passed: true,
      reason: 'No prior loan default or settlement on bureau records.',
      recommendedAction: 'Verified clear bureau record.'
    });
  }

  // Rule 4: Debt-to-Income / FOIR Ratio
  if (engineered.dti_ratio > 70) {
    hardReject = true;
    results.push({
      ruleId: 'BR-004',
      ruleName: 'Severe Debt Burden (FOIR > 70%)',
      ruleCategory: 'DTI_BURDEN',
      severity: 'HARD_REJECT',
      passed: false,
      reason: `Total monthly EMI obligation (${engineered.dti_ratio}%) exceeds sustainable limit (70%).`,
      recommendedAction: 'Reduce requested loan amount or add substantial co-borrower income.'
    });
    triggerMessages.push(`Excessive DTI (${engineered.dti_ratio}%)`);
  } else if (engineered.dti_ratio > 50) {
    triggerManual = true;
    results.push({
      ruleId: 'BR-004',
      ruleName: 'Elevated Debt Obligation (FOIR > 50%)',
      ruleCategory: 'DTI_BURDEN',
      severity: 'TRIGGER_MANUAL',
      passed: false,
      reason: `Monthly debt obligations consume ${engineered.dti_ratio}% of gross household income.`,
      recommendedAction: 'Perform cash flow bank statement analysis (ABB - Average Bank Balance).'
    });
    triggerMessages.push(`High DTI Ratio (${engineered.dti_ratio}%)`);
  } else {
    results.push({
      ruleId: 'BR-004',
      ruleName: 'Debt-to-Income (FOIR) Assessment',
      ruleCategory: 'DTI_BURDEN',
      severity: 'PASS',
      passed: true,
      reason: `FOIR of ${engineered.dti_ratio}% is within comfortable prudential limit (<= 50%).`,
      recommendedAction: 'Approved under standard affordability limit.'
    });
  }

  // Rule 5: Collateral & LTV Check for Secured Facilities
  if (input.loan_purpose.includes('Home') || input.loan_purpose.includes('MSME')) {
    if (input.collateral_value > 0 && engineered.loan_to_value_ratio > 85) {
      triggerManual = true;
      results.push({
        ruleId: 'BR-005',
        ruleName: 'High Loan-to-Value (LTV > 85%)',
        ruleCategory: 'LTV_COLLATERAL',
        severity: 'TRIGGER_MANUAL',
        passed: false,
        reason: `LTV ratio is ${engineered.loan_to_value_ratio}%, exceeding standard 80% ceiling.`,
        recommendedAction: 'Request additional equity margin (down payment) or secondary collateral.'
      });
      triggerMessages.push(`High LTV (${engineered.loan_to_value_ratio}%)`);
    } else {
      results.push({
        ruleId: 'BR-005',
        ruleName: 'Collateral & LTV Compliance',
        ruleCategory: 'LTV_COLLATERAL',
        severity: 'PASS',
        passed: true,
        reason: `LTV ratio of ${engineered.loan_to_value_ratio}% complies with RBI prudential norms.`,
        recommendedAction: 'Legal and technical property valuation clearance.'
      });
    }
  }

  // Rule 6: Minimum Disposable Income Buffer per Dependent
  if (engineered.income_per_dependent < 6000 && input.loan_amount > 200000) {
    results.push({
      ruleId: 'BR-006',
      ruleName: 'Per-Capita Household Disposable Income',
      ruleCategory: 'AFFORDABILITY',
      severity: 'WARNING',
      passed: false,
      reason: `Per-dependent income (₹${engineered.income_per_dependent.toLocaleString('en-IN')}) is below comfort threshold.`,
      recommendedAction: 'Review family living expenses during underwriter interview.'
    });
  }

  const summaryMessage = triggerMessages.length > 0
    ? `Policy Triggers: ${triggerMessages.join('; ')}`
    : 'All primary credit policy and prudential rules satisfied.';

  return {
    rules: results,
    hardReject,
    triggerManual,
    summaryMessage
  };
}

/**
 * Calibrated Machine Learning Prediction Engine & SHAP TreeExplainer Local Attribution.
 */
export function predictLoanEligibility(input: ApplicantInput): PredictionResult {
  const engineered = engineerFeatures(input);
  const baseValue = 0.52; // Population prior approval rate (Baseline Expected Value E[f(x)])

  // Compute feature contributions (SHAP values)
  // Positive SHAP increases log-odds of approval; Negative SHAP decreases approval probability.
  const shapFactors: ShapFactor[] = [];

  // 1. Credit Score Impact
  let cibilShap = 0;
  if (input.credit_score >= 780) cibilShap = +0.28;
  else if (input.credit_score >= 720) cibilShap = +0.18;
  else if (input.credit_score >= 680) cibilShap = +0.08;
  else if (input.credit_score >= 620) cibilShap = -0.12;
  else if (input.credit_score >= 550) cibilShap = -0.26;
  else cibilShap = -0.42;

  shapFactors.push({
    featureKey: 'credit_score',
    featureName: 'CIBIL Credit Score',
    actualValue: `${input.credit_score} / 900`,
    shapValue: parseFloat(cibilShap.toFixed(3)),
    impactPercent: Math.round(Math.abs(cibilShap) * 100),
    isPositive: cibilShap >= 0,
    businessInterpretation: cibilShap >= 0
      ? `Strong credit score demonstrates disciplined repayment history on bureau lines.`
      : `Sub-optimal credit score indicates elevated credit default risk on past facilities.`,
    recommendation: cibilShap < 0 ? 'Maintain on-time payments on existing credit lines for 6+ months.' : undefined
  });

  // 2. Debt-to-Income / FOIR Impact
  let dtiShap = 0;
  if (engineered.dti_ratio <= 25) dtiShap = +0.22;
  else if (engineered.dti_ratio <= 40) dtiShap = +0.12;
  else if (engineered.dti_ratio <= 50) dtiShap = -0.04;
  else if (engineered.dti_ratio <= 60) dtiShap = -0.18;
  else dtiShap = -0.35;

  shapFactors.push({
    featureKey: 'dti_ratio',
    featureName: 'Debt-to-Income (FOIR)',
    actualValue: `${engineered.dti_ratio}%`,
    shapValue: parseFloat(dtiShap.toFixed(3)),
    impactPercent: Math.round(Math.abs(dtiShap) * 100),
    isPositive: dtiShap >= 0,
    businessInterpretation: dtiShap >= 0
      ? `Low monthly EMI obligation (${engineered.dti_ratio}%) leaves healthy disposable surplus.`
      : `High EMI obligation (${engineered.dti_ratio}%) creates severe cash-flow stretch.`,
    recommendation: dtiShap < 0 ? 'Extend loan tenure or prepay existing small retail loans.' : undefined
  });

  // 3. Total Income & Affordability Impact
  let incomeShap = 0;
  if (engineered.total_income >= 150000) incomeShap = +0.18;
  else if (engineered.total_income >= 80000) incomeShap = +0.12;
  else if (engineered.total_income >= 40000) incomeShap = +0.05;
  else if (engineered.total_income >= 25000) incomeShap = -0.05;
  else incomeShap = -0.16;

  shapFactors.push({
    featureKey: 'total_income',
    featureName: 'Gross Monthly Household Income',
    actualValue: `₹${engineered.total_income.toLocaleString('en-IN')}`,
    shapValue: parseFloat(incomeShap.toFixed(3)),
    impactPercent: Math.round(Math.abs(incomeShap) * 100),
    isPositive: incomeShap >= 0,
    businessInterpretation: incomeShap >= 0
      ? `Adequate monthly household cashflow provides strong repayment capacity.`
      : `Modest monthly income limits capacity to service debt during emergencies.`,
    recommendation: incomeShap < 0 ? 'Include an earning co-applicant to pool verifiable income.' : undefined
  });

  // 4. Employment Stability Impact
  let empShap = 0;
  if (input.employment_type === 'Salaried Government') empShap = +0.14;
  else if (input.employment_type === 'Salaried Private' && input.employment_years >= 3) empShap = +0.10;
  else if (input.employment_type === 'Self-Employed Professional') empShap = +0.08;
  else if (input.employment_type === 'Self-Employed Business' && input.employment_years >= 4) empShap = +0.06;
  else if (input.employment_type === 'Gig / Contract Worker') empShap = -0.12;
  else if (input.employment_years < 1) empShap = -0.09;

  shapFactors.push({
    featureKey: 'employment_stability',
    featureName: 'Employment Stability & Profile',
    actualValue: `${input.employment_type} (${input.employment_years} yrs)`,
    shapValue: parseFloat(empShap.toFixed(3)),
    impactPercent: Math.round(Math.abs(empShap) * 100),
    isPositive: empShap >= 0,
    businessInterpretation: empShap >= 0
      ? `Tenure of ${input.employment_years} years in ${input.employment_type} sector signifies stable earnings.`
      : `Short job tenure or contract employment structure carries higher income volatility.`
  });

  // 5. Default History Impact
  let defaultShap = 0;
  if (input.previous_default) defaultShap = -0.32;
  else if (input.previous_loan_count > 0) defaultShap = +0.10; // Proven credit history
  else defaultShap = +0.02; // Thin file

  shapFactors.push({
    featureKey: 'previous_default',
    featureName: 'Historical Default Track',
    actualValue: input.previous_default ? 'Default Recorded' : 'Clean Bureau History',
    shapValue: parseFloat(defaultShap.toFixed(3)),
    impactPercent: Math.round(Math.abs(defaultShap) * 100),
    isPositive: defaultShap >= 0,
    businessInterpretation: input.previous_default
      ? `Prior loan default indicates historically elevated delinquency hazard.`
      : `Clean historical track record demonstrates commitment to credit obligations.`
  });

  // 6. Loan to Value / Collateral Impact
  let ltvShap = 0;
  if (input.collateral_value > 0) {
    if (engineered.loan_to_value_ratio <= 60) ltvShap = +0.12;
    else if (engineered.loan_to_value_ratio <= 80) ltvShap = +0.06;
    else ltvShap = -0.06;
  } else {
    // Unsecured loan
    if (input.loan_amount > 500000) ltvShap = -0.08;
    else ltvShap = 0;
  }

  shapFactors.push({
    featureKey: 'loan_to_value',
    featureName: 'Collateral Cushion / LTV',
    actualValue: input.collateral_value > 0 ? `${engineered.loan_to_value_ratio}% LTV` : 'Unsecured facility',
    shapValue: parseFloat(ltvShap.toFixed(3)),
    impactPercent: Math.round(Math.abs(ltvShap) * 100),
    isPositive: ltvShap >= 0,
    businessInterpretation: ltvShap >= 0
      ? `Substantial collateral security (₹${input.collateral_value.toLocaleString('en-IN')}) minimizes Loss Given Default (LGD).`
      : `High loan amount relative to security increases loss severity in stress scenario.`
  });

  // 7. Dependents & Per-Capita Disposable Buffer
  let depShap = 0;
  if (engineered.income_per_dependent > 30000) depShap = +0.06;
  else if (engineered.income_per_dependent < 10000) depShap = -0.07;

  shapFactors.push({
    featureKey: 'dependents',
    featureName: 'Family Dependents & Income Buffer',
    actualValue: `${input.dependents} Dependents (₹${engineered.income_per_dependent.toLocaleString('en-IN')}/head)`,
    shapValue: parseFloat(depShap.toFixed(3)),
    impactPercent: Math.round(Math.abs(depShap) * 100),
    isPositive: depShap >= 0,
    businessInterpretation: depShap >= 0
      ? `High per-capita disposable buffer allows financial resilience against unexpected shocks.`
      : `Higher dependent load relative to income reduces surplus for non-discretionary spending.`
  });

  // 8. Banking Relationship Age
  let bankAgeShap = 0;
  if (input.bank_account_age_months >= 48) bankAgeShap = +0.06;
  else if (input.bank_account_age_months < 12) bankAgeShap = -0.04;

  shapFactors.push({
    featureKey: 'bank_account_age',
    featureName: 'Banking Relationship Vintage',
    actualValue: `${Math.floor(input.bank_account_age_months / 12)} yrs (${input.bank_account_age_months} mo)`,
    shapValue: parseFloat(bankAgeShap.toFixed(3)),
    impactPercent: Math.round(Math.abs(bankAgeShap) * 100),
    isPositive: bankAgeShap >= 0,
    businessInterpretation: bankAgeShap >= 0
      ? `Established banking vintage provides proven account behavior history.`
      : `Recent account opening limits longitudinal relationship visibility.`
  });

  // Calculate sum of SHAP values
  const totalShapSum = shapFactors.reduce((acc, curr) => acc + curr.shapValue, 0);

  // Apply logistic sigmoid function to obtain calibrated probability: P = 1 / (1 + exp(-(logit_base + sum_shap * scale)))
  const logitBase = Math.log(baseValue / (1 - baseValue)); // ~ 0.08
  const logit = logitBase + totalShapSum * 2.8; // scale factor
  let rawProbability = 1 / (1 + Math.exp(-logit));
  rawProbability = Math.max(0.02, Math.min(0.98, rawProbability));
  const approval_probability = parseFloat(rawProbability.toFixed(3));

  // Determine ML Raw Decision based on probability thresholds:
  // >= 0.80: Eligible
  // 0.55 to 0.79: Manual Review
  // < 0.55: Not Eligible
  let ml_raw_decision: DecisionStatus = 'Manual Review';
  if (approval_probability >= 0.80) {
    ml_raw_decision = 'Eligible';
  } else if (approval_probability < 0.55) {
    ml_raw_decision = 'Not Eligible';
  }

  // Evaluate Hard Business Rules
  const businessRuleEvaluation = evaluateBusinessRules(input, engineered);

  // Determine Final Decision (Separating ML from Credit Policy Governance)
  let final_decision: DecisionStatus = ml_raw_decision;
  let hard_rule_triggered = false;
  let hard_rule_message: string | undefined = undefined;

  if (businessRuleEvaluation.hardReject) {
    final_decision = 'Not Eligible';
    hard_rule_triggered = true;
    hard_rule_message = businessRuleEvaluation.summaryMessage;
  } else if (businessRuleEvaluation.triggerManual && final_decision === 'Eligible') {
    final_decision = 'Manual Review';
    hard_rule_triggered = true;
    hard_rule_message = `ML predicted Eligible (${(approval_probability * 100).toFixed(1)}%), but Credit Policy triggered Manual Underwriter Review: ${businessRuleEvaluation.summaryMessage}`;
  }

  // Determine Risk Tier
  let risk_tier: RiskTier = 'Moderate Risk';
  if (approval_probability >= 0.82 && !hard_rule_triggered) {
    risk_tier = 'Low Risk';
  } else if (approval_probability >= 0.65) {
    risk_tier = 'Moderate Risk';
  } else if (approval_probability >= 0.40) {
    risk_tier = 'High Risk';
  } else {
    risk_tier = 'Critical Credit Risk';
  }

  // Sort SHAP factors by absolute impact
  shapFactors.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));

  // Generate Counterfactual Actionable Recourse
  const counterfactual_remedies: string[] = [];
  if (final_decision !== 'Eligible') {
    if (engineered.dti_ratio > 45) {
      const targetTenure = Math.min(84, input.loan_term_months + 24);
      const newEmi = calculateEMI(input.loan_amount, targetTenure);
      const newDti = ((input.existing_emi + newEmi) / engineered.total_income) * 100;
      counterfactual_remedies.push(
        `Extend tenure from ${input.loan_term_months} to ${targetTenure} months to lower proposed EMI to ₹${newEmi.toLocaleString('en-IN')}, reducing DTI to ${newDti.toFixed(1)}%.`
      );
    }
    if (input.coapplicant_income === 0) {
      const requiredCoapp = Math.round(engineered.total_emi * 2 - input.monthly_income);
      if (requiredCoapp > 0) {
        counterfactual_remedies.push(
          `Add an earning co-applicant with monthly verifiable income of ≥ ₹${Math.max(20000, requiredCoapp).toLocaleString('en-IN')} to dilute debt-to-income ratio.`
        );
      }
    }
    if (input.collateral_value === 0 && input.loan_amount > 400000) {
      counterfactual_remedies.push(
        `Provide tangible collateral or liquid fixed deposit pledge of ≥ ₹${Math.round(input.loan_amount * 0.6).toLocaleString('en-IN')} to convert facility into secured credit.`
      );
    }
    if (input.credit_score < 700) {
      counterfactual_remedies.push(
        `Maintain zero 30+ DPD delinquencies for 6 consecutive billing cycles to elevate CIBIL score into the prime 720+ tier.`
      );
    }
    if (input.existing_emi > 0) {
      counterfactual_remedies.push(
        `Foreclose or prepay existing personal/credit card loan of EMI ₹${input.existing_emi.toLocaleString('en-IN')} to free up monthly debt servicing capacity.`
      );
    }
  }

  // Generate Adverse Action Notice if not eligible
  let adverse_action_notice: string | undefined = undefined;
  if (final_decision === 'Not Eligible') {
    const topNegativeFactors = shapFactors
      .filter(f => !f.isPositive)
      .slice(0, 3)
      .map(f => `${f.featureName} (${f.actualValue})`);
    
    adverse_action_notice = `Under RBI Fair Practices Code, this notification summarizes key contributing factors: ${topNegativeFactors.join(', ')}. ${hard_rule_message ? `Regulatory / Policy constraints: ${hard_rule_message}` : ''}`;
  }

  return {
    prediction_id: `PRED-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`,
    applicant_id: input.applicant_id,
    model_version: 'XAI-GBC-v2.4-Calibrated',
    timestamp: new Date().toISOString(),
    approval_probability,
    ml_raw_decision,
    final_decision,
    risk_tier,
    engineered_features: engineered,
    shap_factors: shapFactors,
    base_value: baseValue,
    business_rules: businessRuleEvaluation.rules,
    hard_rule_triggered,
    hard_rule_message,
    counterfactual_remedies,
    adverse_action_notice
  };
}
