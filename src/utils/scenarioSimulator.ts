/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AtRiskTransaction,
  SimulationPreset,
  AuditLogEntry,
  AIDiagnosisResult,
  GuardrailEvaluation,
  GuardrailCheckResult,
} from '../types';

/**
 * Creates a fully articulated simulated transaction and its audit logs from a preset.
 */
export function createSimulatedTransaction(
  preset: SimulationPreset
): {
  transaction: AtRiskTransaction;
  auditLogs: AuditLogEntry[];
} {
  const template = preset.transactionTemplate;
  const now = new Date().toISOString();
  const rawIdNum = Math.floor(80197 + Math.random() * 90000);
  const txnId = `txn_rec_${rawIdNum}`;
  const orderId = template.orderId || `order_sim_${Math.floor(1000 + Math.random() * 9000)}`;
  const traceId = `trc_${Math.random().toString(36).substring(2, 8)}`;
  const amount = template.amount ?? 1899;
  const isHighValue = amount >= 50000;

  // Build specific diagnosis based on preset
  let diagnosis: AIDiagnosisResult;
  let guardrailEvaluation: GuardrailEvaluation;
  let status: AtRiskTransaction['status'] = isHighValue ? 'REQUIRES_HUMAN_APPROVAL' : 'DETECTED';

  if (preset.id === 'sim_upi_timeout') {
    diagnosis = {
      rootCauseSummary:
        'NPCI UPI switch gateway timeout during ICICI Bank authorization node routing.',
      failureNature: 'TRANSIENT_SOFT_DECLINE',
      recoveryProbability: 84,
      urgencyLevel: 'HIGH',
      customerLifetimeValueTier: 'REGULAR',
      proposedIntervention: {
        type: 'DYNAMIC_UPI_QR',
        channel: 'WHATSAPP',
        title: 'Instant 1-Click WhatsApp UPI Recovery Link',
        description:
          'Customer experienced an NPCI gateway timeout. Dispatch instant Razorpay UPI deep-link via WhatsApp with 0% discount.',
        recommendedDiscountPercent: 0,
        messageCopy: `Hi ${template.customerName || 'Customer'}, your ₹${amount.toLocaleString('en-IN')} payment to ${template.merchantName || 'Merchant'} was interrupted due to a bank server timeout. Complete your order in 1 tap here: https://demo.simulated-payment.example/i/recov_${rawIdNum}`,
        delayMinutes: 0,
        expiryHours: 24,
        fallbackStrategy: 'Schedule automated background gateway retry after 15 minutes.',
      },
      reasoningChain: [
        "Detected transient NPCI bank switch timeout code 'BAD_REQUEST_GATEWAY_TIMEOUT'.",
        'Zero retries attempted so far; customer payment intent remains very high.',
        'Selected instant WhatsApp 1-tap UPI deep-link without discounting to preserve merchant margin.',
      ],
    };

    guardrailEvaluation = {
      allPassed: true,
      requiresHumanApproval: false,
      clampedDiscountPercent: 0,
      checks: [
        {
          ruleId: 'GR-RETRY-LIMIT',
          ruleName: 'Max Retries Policy',
          passed: true,
          reason: 'Retry count 0 is within maximum 3 retries limit.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-AMOUNT-THRESHOLD',
          ruleName: 'Autonomous Recovery Limit',
          passed: true,
          reason: `Amount ₹${amount.toLocaleString('en-IN')} is within autonomous limit (≤ ₹50,000).`,
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-TERMINAL-DECLINE',
          ruleName: 'Terminal Decline Protection',
          passed: true,
          reason: 'Soft network timeout is safe for automated recovery.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-DISCOUNT-CEILING',
          ruleName: 'Discount Ceiling Cap (≤15%)',
          passed: true,
          reason: '0% incentive requested (within 15% cap).',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-RATE-LIMIT',
          ruleName: 'Anti-Spam Frequency Cap',
          passed: true,
          reason: '0 messages sent to customer in last 24h. Cap compliant.',
          riskLevel: 'LOW',
        },
      ],
    };
  } else if (preset.id === 'sim_card_expired') {
    diagnosis = {
      rootCauseSummary:
        'Linked corporate card for recurring SaaS subscription expired (08/26). Direct retries blocked.',
      failureNature: 'TERMINAL_HARD_DECLINE',
      recoveryProbability: 78,
      urgencyLevel: 'HIGH',
      customerLifetimeValueTier: 'HIGH_VALUE',
      proposedIntervention: {
        type: 'PAYMENT_METHOD_UPDATE_PORTAL',
        channel: 'EMAIL',
        title: 'Payment Method Update Portal via Email',
        description:
          'Direct card retry suppressed by guardrails. Send secure payment credential update portal to customer email.',
        recommendedDiscountPercent: 0,
        messageCopy: `Hi ${template.customerName || 'Customer'}, your card for ${template.merchantName || 'Merchant'} has expired. Update your billing details securely to keep your subscription active: https://demo.simulated-payment.example/i/recov_${rawIdNum}`,
        delayMinutes: 0,
        expiryHours: 72,
        fallbackStrategy: 'In-app grace period banner upon next user login.',
      },
      reasoningChain: [
        "Detected hard decline code 'CARD_EXPIRED'. Direct gateway retries are permanently blocked by policy.",
        'Classified as involuntary churn with high recovery likelihood if update link is emailed immediately.',
        'Formulated credential update portal with 72-hour grace period.',
      ],
    };

    guardrailEvaluation = {
      allPassed: true,
      requiresHumanApproval: false,
      clampedDiscountPercent: 0,
      checks: [
        {
          ruleId: 'GR-RETRY-LIMIT',
          ruleName: 'Max Retries Policy',
          passed: true,
          reason: 'Zero direct retry permitted on hard card decline.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-AMOUNT-THRESHOLD',
          ruleName: 'Autonomous Recovery Limit',
          passed: true,
          reason: `Amount ₹${amount.toLocaleString('en-IN')} is within autonomous limit (≤ ₹50,000).`,
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-TERMINAL-DECLINE',
          ruleName: 'Terminal Decline Protection',
          passed: true,
          reason: 'Direct gateway retries suppressed; routed to credential update portal.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-DISCOUNT-CEILING',
          ruleName: 'Discount Ceiling Cap (≤15%)',
          passed: true,
          reason: '0% incentive requested (within 15% cap).',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-RATE-LIMIT',
          ruleName: 'Anti-Spam Frequency Cap',
          passed: true,
          reason: '0 messages sent in last 24h.',
          riskLevel: 'LOW',
        },
      ],
    };
  } else if (preset.id === 'sim_high_val_guardrail') {
    diagnosis = {
      rootCauseSummary:
        'High-value enterprise checkout session abandoned at corporate netbanking selection portal.',
      failureNature: 'BEHAVIORAL_FRICTION',
      recoveryProbability: 91,
      urgencyLevel: 'CRITICAL',
      customerLifetimeValueTier: 'HIGH_VALUE',
      proposedIntervention: {
        type: 'HUMAN_IN_THE_LOOP_ESCALATION',
        channel: 'SMS',
        title: 'Dedicated Enterprise Account Concierge Recovery',
        description:
          'High-value transaction exceeds ₹50,000. Flagged for operator review before dispatching custom corporate invoice link.',
        recommendedDiscountPercent: 0,
        messageCopy: `Dear ${template.customerName || 'Customer'}, your ${template.merchantName || 'Enterprise'} invoice payment of ₹${amount.toLocaleString('en-IN')} was interrupted. Your account manager has reserved your cluster renewal: https://demo.simulated-payment.example/i/recov_${rawIdNum}`,
        delayMinutes: 0,
        expiryHours: 72,
        fallbackStrategy: 'Direct phone outreach by enterprise account representative.',
      },
      reasoningChain: [
        `Identified ₹${amount.toLocaleString('en-IN')} enterprise checkout dropout.`,
        'High-value policy rule POL-02 triggered: amounts ≥ ₹50,000 require manual operator verification.',
        'Prepared VIP concierge recovery package awaiting human gate sign-off.',
      ],
    };

    guardrailEvaluation = {
      allPassed: false,
      requiresHumanApproval: true,
      approvalReason: `Transaction amount ₹${amount.toLocaleString('en-IN')} exceeds autonomous safety limit of ₹50,000.`,
      clampedDiscountPercent: 0,
      checks: [
        {
          ruleId: 'GR-RETRY-LIMIT',
          ruleName: 'Max Retries Policy',
          passed: true,
          reason: 'Retry count 0 is within maximum 2 retries limit.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-AMOUNT-THRESHOLD',
          ruleName: 'Autonomous Recovery Limit',
          passed: false,
          reason: `Amount ₹${amount.toLocaleString('en-IN')} exceeds ₹50,000 threshold. Operator sign-off required.`,
          riskLevel: 'HIGH',
        },
        {
          ruleId: 'GR-TERMINAL-DECLINE',
          ruleName: 'Terminal Decline Protection',
          passed: true,
          reason: 'Checkout abandonment is recoverable via concierge channel.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-DISCOUNT-CEILING',
          ruleName: 'Discount Ceiling Cap (≤15%)',
          passed: true,
          reason: '0% incentive requested (within 15% cap).',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-RATE-LIMIT',
          ruleName: 'Anti-Spam Frequency Cap',
          passed: true,
          reason: '0 messages sent in last 24h.',
          riskLevel: 'LOW',
        },
      ],
    };
  } else if (preset.id === 'sim_insufficient_funds') {
    diagnosis = {
      rootCauseSummary:
        'Insufficient funds on issuing bank account during UPI authorization.',
      failureNature: 'FINANCIAL_CONSTRAINT',
      recoveryProbability: 42,
      urgencyLevel: 'MEDIUM',
      customerLifetimeValueTier: 'NEW_USER',
      proposedIntervention: {
        type: 'WHATSAPP_NUDGE_WITH_DISCOUNT',
        channel: 'WHATSAPP',
        title: 'Low-Friction Pay Later / Salary-Cycle Reminder',
        description:
          'Avoid immediate aggressive retry. Send gentle WhatsApp nudge offering alternate UPI or Pay Later option with 10% coupon.',
        recommendedDiscountPercent: 10,
        messageCopy: `Hi ${template.customerName || 'Customer'}, your ₹${amount.toLocaleString('en-IN')} payment on ${template.merchantName || 'LearnCode'} was paused. Use code LEARN10 for 10% off when you complete your order: https://demo.simulated-payment.example/i/recov_${rawIdNum}`,
        delayMinutes: 30,
        expiryHours: 48,
        fallbackStrategy:
          'Follow-up SMS reminder during evening prime hours (7 PM - 9 PM).',
      },
      reasoningChain: [
        "Detected insufficient funds error 'PAYMENT_FAILED_INSUFFICIENT_FUNDS'.",
        'Immediate automated retry suppressed to prevent repeated bank decline fees and customer frustration.',
        'Offered 10% financial incentive and delayed nudge to allow fund replenishment.',
      ],
    };

    guardrailEvaluation = {
      allPassed: true,
      requiresHumanApproval: false,
      clampedDiscountPercent: 10,
      checks: [
        {
          ruleId: 'GR-RETRY-LIMIT',
          ruleName: 'Max Retries Policy',
          passed: true,
          reason: 'Retry count 1 is within maximum 3 retries limit.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-AMOUNT-THRESHOLD',
          ruleName: 'Autonomous Recovery Limit',
          passed: true,
          reason: `Amount ₹${amount.toLocaleString('en-IN')} is within autonomous limit (≤ ₹50,000).`,
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-TERMINAL-DECLINE',
          ruleName: 'Terminal Decline Protection',
          passed: true,
          reason: 'Soft financial friction handled via delayed nudge.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-DISCOUNT-CEILING',
          ruleName: 'Discount Ceiling Cap (≤15%)',
          passed: true,
          reason: '10% incentive requested (within 15% cap).',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-RATE-LIMIT',
          ruleName: 'Anti-Spam Frequency Cap',
          passed: true,
          reason: '0 messages sent in last 24h.',
          riskLevel: 'LOW',
        },
      ],
    };
  } else {
    // Dynamic Fallback for Custom Injectors
    const discount = Math.min(15, amount > 10000 ? 5 : 10);
    diagnosis = {
      rootCauseSummary:
        template.gatewayErrorMessage ||
        `Simulated payment failure code ${template.gatewayErrorCode || 'UNKNOWN'}.`,
      failureNature: isHighValue
        ? 'BEHAVIORAL_FRICTION'
        : template.paymentMethod === 'SUBSCRIPTION_MANDATE'
        ? 'TERMINAL_HARD_DECLINE'
        : 'TRANSIENT_SOFT_DECLINE',
      recoveryProbability: isHighValue ? 88 : 74,
      urgencyLevel: isHighValue ? 'CRITICAL' : 'HIGH',
      customerLifetimeValueTier: template.customerTier || 'REGULAR',
      proposedIntervention: {
        type: isHighValue
          ? 'HUMAN_IN_THE_LOOP_ESCALATION'
          : template.paymentMethod === 'UPI'
          ? 'DYNAMIC_UPI_QR'
          : 'RAZORPAY_PAYMENT_LINK',
        channel: template.paymentMethod === 'UPI' ? 'WHATSAPP' : 'EMAIL',
        title: isHighValue
          ? 'High-Value Account Escrow & Assisted Recovery'
          : 'Adaptive Payment Link Recovery',
        description: `Automated recovery formulation for ₹${amount.toLocaleString('en-IN')} order.`,
        recommendedDiscountPercent: discount,
        messageCopy: `Hi ${template.customerName || 'Customer'}, resume your ₹${amount.toLocaleString('en-IN')} payment for ${template.merchantName || 'Order'}: https://demo.simulated-payment.example/i/recov_${rawIdNum}`,
        delayMinutes: 0,
        expiryHours: 48,
        fallbackStrategy: 'Schedule background retry if unresolved.',
      },
      reasoningChain: [
        `Ingested failure code ${template.gatewayErrorCode || 'GATEWAY_ERROR'}.`,
        isHighValue
          ? 'Amount ≥ ₹50,000 threshold triggers human review guardrail.'
          : 'All autonomous recovery criteria satisfied.',
        'Formulated bounded recovery intervention.',
      ],
    };

    guardrailEvaluation = {
      allPassed: !isHighValue,
      requiresHumanApproval: isHighValue,
      approvalReason: isHighValue
        ? `Amount ₹${amount.toLocaleString('en-IN')} exceeds ₹50,000 autonomous threshold.`
        : undefined,
      clampedDiscountPercent: discount,
      checks: [
        {
          ruleId: 'GR-RETRY-LIMIT',
          ruleName: 'Max Retries Policy',
          passed: true,
          reason: `Retry count ${template.retryCount ?? 0} is within maximum limit.`,
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-AMOUNT-THRESHOLD',
          ruleName: 'Autonomous Recovery Limit',
          passed: !isHighValue,
          reason: isHighValue
            ? `Amount ₹${amount.toLocaleString('en-IN')} exceeds ₹50,000 threshold.`
            : `Amount ₹${amount.toLocaleString('en-IN')} is within autonomous limit.`,
          riskLevel: isHighValue ? 'HIGH' : 'LOW',
        },
        {
          ruleId: 'GR-TERMINAL-DECLINE',
          ruleName: 'Terminal Decline Protection',
          passed: true,
          reason: 'Passed terminal decline evaluation.',
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-DISCOUNT-CEILING',
          ruleName: 'Discount Ceiling Cap (≤15%)',
          passed: true,
          reason: `${discount}% incentive requested (within 15% cap).`,
          riskLevel: 'LOW',
        },
        {
          ruleId: 'GR-RATE-LIMIT',
          ruleName: 'Anti-Spam Frequency Cap',
          passed: true,
          reason: 'Rate limit evaluated.',
          riskLevel: 'LOW',
        },
      ],
    };
  }

  const customer = template.customerName || template.customer || 'Test Customer';
  const merchant = template.merchantName || template.merchant || 'Demo Merchant';
  const paymentRail: AtRiskTransaction['paymentRail'] = template.paymentMethod || template.paymentRail || 'UPI';
  const failureCode = template.gatewayErrorCode || template.failureCode || 'GATEWAY_ERROR';
  const failureCategory = template.failureCategory || 'SOFT_DECLINE_NETWORK';
  const retryCount = template.retryCount ?? 0;
  const maxRetries = template.maxRetries ?? 3;
  const customerTier = template.customerTier || 'REGULAR';

  const transaction: AtRiskTransaction = {
    // Canonical 13 fields
    transactionId: txnId,
    traceId,
    customer,
    merchant,
    amount,
    paymentRail,
    failureCode,
    failureCategory,
    retryCount,
    maxRetries,
    customerTier,
    timestamp: now,
    status,

    // Aliases
    id: txnId,
    customerName: customer,
    merchantName: merchant,
    paymentMethod: paymentRail,
    gatewayErrorCode: failureCode,
    createdAt: now,
    lastAttemptAt: now,

    // Supplementary
    orderId,
    customerEmail:
      template.customerEmail ||
      `${customer.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`,
    customerPhone:
      template.customerPhone ||
      `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
    currency: 'INR',
    gatewayErrorMessage:
      template.gatewayErrorMessage || 'Simulated payment failure event.',
    diagnosis,
    guardrailEvaluation,
  };

  // Generate audit trail entries
  const auditLogs: AuditLogEntry[] = [
    {
      id: `aud_log_${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: now,
      transactionId: txnId,
      orderId,
      eventType: 'FAILURE_DETECTED',
      actor: 'SYSTEM_WEBHOOK',
      summary: `Payment failed for ${transaction.customerName} (₹${amount.toLocaleString('en-IN')}) via ${transaction.paymentMethod}. Code: ${transaction.gatewayErrorCode}.`,
      details: {
        traceId,
        transactionId: txnId,
        orderId,
        amount,
        currency: 'INR',
        customerName: transaction.customerName,
        customerPhone: transaction.customerPhone,
        customerEmail: transaction.customerEmail,
        merchantName: transaction.merchantName,
        paymentMethod: transaction.paymentMethod,
        failureCode: transaction.gatewayErrorCode,
        failureCategory: transaction.failureCategory,
        gatewayErrorMessage: transaction.gatewayErrorMessage,
        retryCount: transaction.retryCount,
        maxRetries: transaction.maxRetries,
        timestamp: now,
      },
      riskLevel: isHighValue ? 'ALERT' : 'INFO',
      traceId,
    },
    {
      id: `aud_log_${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date(Date.now() + 1000).toISOString(),
      transactionId: txnId,
      orderId,
      eventType: 'AI_DIAGNOSIS_COMPLETED',
      actor: 'RECOVER_AI_AGENT',
      summary: `AI cognitive analysis: ${diagnosis.recoveryProbability}% win probability. Intervention: ${diagnosis.proposedIntervention.title}.`,
      details: {
        traceId,
        transactionId: txnId,
        orderId,
        amount,
        currency: 'INR',
        customerName: transaction.customerName,
        merchantName: transaction.merchantName,
        failureCode: transaction.gatewayErrorCode,
        failureNature: diagnosis.failureNature,
        recoveryProbability: diagnosis.recoveryProbability,
        urgencyLevel: diagnosis.urgencyLevel,
        decision: `${diagnosis.proposedIntervention.title} (${diagnosis.recoveryProbability}% Win Probability)`,
        interventionType: diagnosis.proposedIntervention.type,
        channel: diagnosis.proposedIntervention.channel,
        reasoningChain: diagnosis.reasoningChain,
      },
      riskLevel: 'INFO',
      traceId,
    },
    {
      id: `aud_log_${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date(Date.now() + 2000).toISOString(),
      transactionId: txnId,
      orderId,
      eventType: isHighValue ? 'GUARDRAIL_BLOCKED' : 'GUARDRAILS_EVALUATED',
      actor: 'GUARDRAIL_POLICY_ENGINE',
      summary: isHighValue
        ? `High-Value Threshold Exceeded: ₹${amount.toLocaleString('en-IN')} ≥ ₹50,000. Autonomous execution suspended for human sign-off.`
        : `Deterministic guardrail policy checks satisfied (5/5). Autonomous recovery permitted.`,
      details: {
        traceId,
        transactionId: txnId,
        orderId,
        amount,
        currency: 'INR',
        failureCode: transaction.gatewayErrorCode,
        decision: isHighValue ? 'HUMAN_APPROVAL_REQUIRED' : 'DISPATCH_PERMITTED',
        guardrailResult: isHighValue ? 'REQUIRES_HUMAN_APPROVAL' : 'PASS',
        policyChecks: guardrailEvaluation.checks,
      },
      riskLevel: isHighValue ? 'WARNING' : 'SUCCESS',
      traceId,
    },
  ];

  return { transaction, auditLogs };
}
