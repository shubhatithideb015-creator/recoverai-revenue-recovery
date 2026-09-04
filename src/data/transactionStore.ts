/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AtRiskTransaction,
  AuditLogEntry,
  PaymentFailureEvent,
  PaymentFailedWebhookEvent,
  SimulationPreset,
  PolicyRuleDefinition,
  AIDiagnosisResult,
  GuardrailEvaluation,
  PaymentMethod,
  FailureCategory,
  TransactionStatus,
} from '../types';
import {
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  SIMULATION_PRESETS,
  POLICY_RULES,
} from './seedData';
import { createSimulatedTransaction } from '../utils/scenarioSimulator';
import { WebhookEventProcessor, ProcessedEventResult } from '../services/eventProcessor';

/**
 * Normalizes any transaction / payment failure event to ensure all 13 canonical fields
 * and their backward-compatible aliases are fully synchronized and guaranteed present.
 *
 * Canonical schema:
 * 1. transactionId
 * 2. traceId
 * 3. customer
 * 4. merchant
 * 5. amount
 * 6. paymentRail
 * 7. failureCode
 * 8. failureCategory
 * 9. retryCount
 * 10. maxRetries
 * 11. customerTier
 * 12. timestamp
 * 13. status
 */
export function normalizeTransaction(raw: Partial<AtRiskTransaction> & Record<string, any>): AtRiskTransaction {
  const transactionId = raw.transactionId || raw.id || `txn_rec_${Math.floor(10000 + Math.random() * 90000)}`;
  const traceId = raw.traceId || `trc_${transactionId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const customer = raw.customer || raw.customerName || 'Customer';
  const merchant = raw.merchant || raw.merchantName || 'Merchant';
  const amount = Number(raw.amount) || 0;
  const paymentRail: PaymentMethod = (raw.paymentRail || raw.paymentMethod || 'UPI') as PaymentMethod;
  const failureCode = raw.failureCode || raw.gatewayErrorCode || 'GATEWAY_ERROR';
  const failureCategory: FailureCategory = (raw.failureCategory || 'SOFT_DECLINE_NETWORK') as FailureCategory;
  const retryCount = raw.retryCount !== undefined ? Number(raw.retryCount) : 0;
  const maxRetries = raw.maxRetries !== undefined ? Number(raw.maxRetries) : 3;
  const customerTier: 'HIGH_VALUE' | 'REGULAR' | 'NEW_USER' = raw.customerTier || 'REGULAR';
  const timestamp = raw.timestamp || raw.createdAt || raw.lastAttemptAt || new Date().toISOString();
  const status: TransactionStatus = raw.status || 'DETECTED';

  const orderId = raw.orderId || `order_${transactionId.replace('txn_', '')}`;
  const customerEmail = raw.customerEmail || `${customer.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`;
  const customerPhone = raw.customerPhone || `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const gatewayErrorMessage = raw.gatewayErrorMessage || `Payment failure code ${failureCode}`;

  return {
    // Canonical properties
    transactionId,
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
    timestamp,
    status,

    // Aliases for seamless backward compatibility
    id: transactionId,
    customerName: customer,
    merchantName: merchant,
    paymentMethod: paymentRail,
    gatewayErrorCode: failureCode,
    createdAt: timestamp,
    lastAttemptAt: raw.lastAttemptAt || timestamp,

    // Supplementary properties
    orderId,
    customerEmail,
    customerPhone,
    currency: 'INR',
    gatewayErrorMessage,

    // AI Cognition & Guardrail states
    diagnosis: raw.diagnosis,
    guardrailEvaluation: raw.guardrailEvaluation,
    humanApproved: raw.humanApproved,
    humanReviewNotes: raw.humanReviewNotes,
    simulatedPaymentLink: raw.simulatedPaymentLink,
    simulatedMessageSent: raw.simulatedMessageSent,
    recoveredAmount: raw.recoveredAmount,
    recoveredAt: raw.recoveredAt,
    executionError: raw.executionError,
  };
}

/**
 * Pre-hydrates canonical initial transactions with their full diagnosis, traceId, and guardrail models
 * so all pages (Assets, Intelligence, Network & Policy, Archive, Sandbox) share rich unified data.
 */
function buildInitialHydratedTransactions(): AtRiskTransaction[] {
  return INITIAL_TRANSACTIONS.map((rawTxn) => {
    const normalized = normalizeTransaction(rawTxn);

    // Map specific traceId from INITIAL_AUDIT_LOGS if available
    const matchingAuditLog = INITIAL_AUDIT_LOGS.find((log) => log.transactionId === normalized.id);
    if (matchingAuditLog && matchingAuditLog.traceId) {
      normalized.traceId = matchingAuditLog.traceId;
    }

    // Build diagnoses if not already present
    if (!normalized.diagnosis) {
      if (normalized.id === 'txn_rec_80191') {
        normalized.diagnosis = {
          rootCauseSummary: 'Linked corporate card for recurring SaaS subscription expired (07/26). Direct retries blocked.',
          failureNature: 'TERMINAL_HARD_DECLINE',
          recoveryProbability: 78,
          urgencyLevel: 'HIGH',
          customerLifetimeValueTier: 'HIGH_VALUE',
          proposedIntervention: {
            type: 'PAYMENT_METHOD_UPDATE_PORTAL',
            channel: 'EMAIL',
            title: 'Payment Method Update Portal via Email',
            description: 'Direct card retry suppressed by guardrails. Send secure payment credential update portal to customer email.',
            recommendedDiscountPercent: 0,
            messageCopy: 'Hi Aarav, your card for CloudScale SaaS Pro has expired. Update your billing details securely to keep your subscription active: https://demo.simulated-payment.example/i/recov_80191',
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

        normalized.guardrailEvaluation = {
          allPassed: true,
          requiresHumanApproval: false,
          clampedDiscountPercent: 0,
          checks: [
            { ruleId: 'GR-RETRY-LIMIT', ruleName: 'Max Retries Policy', passed: true, reason: 'Zero direct retry permitted on hard card decline.', riskLevel: 'LOW' },
            { ruleId: 'GR-AMOUNT-THRESHOLD', ruleName: 'Autonomous Recovery Limit', passed: true, reason: 'Amount ₹4,999 is within autonomous limit (≤ ₹50,000).', riskLevel: 'LOW' },
            { ruleId: 'GR-TERMINAL-DECLINE', ruleName: 'Terminal Decline Protection', passed: true, reason: 'Direct gateway retries suppressed; routed to credential update portal.', riskLevel: 'LOW' },
            { ruleId: 'GR-DISCOUNT-CEILING', ruleName: 'Discount Ceiling Cap (≤15%)', passed: true, reason: '0% incentive requested (within 15% cap).', riskLevel: 'LOW' },
            { ruleId: 'GR-RATE-LIMIT', ruleName: 'Anti-Spam Frequency Cap', passed: true, reason: '0 messages sent in last 24h.', riskLevel: 'LOW' },
          ],
        };
      } else if (normalized.id === 'txn_rec_80192') {
        normalized.diagnosis = {
          rootCauseSummary: 'NPCI UPI switch gateway timeout during HDFC Bank node authorization.',
          failureNature: 'TRANSIENT_SOFT_DECLINE',
          recoveryProbability: 84,
          urgencyLevel: 'HIGH',
          customerLifetimeValueTier: 'REGULAR',
          proposedIntervention: {
            type: 'DYNAMIC_UPI_QR',
            channel: 'WHATSAPP',
            title: 'Instant 1-Click WhatsApp UPI Recovery Link',
            description: 'Customer experienced an NPCI gateway timeout. Dispatch instant Razorpay UPI deep-link via WhatsApp with 0% discount.',
            recommendedDiscountPercent: 0,
            messageCopy: 'Hi Priya, your ₹3,499 payment to UrbanKicks India was interrupted due to a bank server timeout. Complete your order in 1 tap here: https://demo.simulated-payment.example/i/recov_80192',
            delayMinutes: 0,
            expiryHours: 24,
            fallbackStrategy: 'Schedule automated background gateway retry after 15 minutes.',
          },
          reasoningChain: [
            "Detected transient NPCI bank switch timeout code 'BAD_REQUEST_GATEWAY_TIMEOUT'.",
            'Zero retries attempted so far; customer payment intent remains high.',
            'Selected instant WhatsApp 1-tap UPI deep-link without discounting to preserve merchant margin.',
          ],
        };

        normalized.guardrailEvaluation = {
          allPassed: true,
          requiresHumanApproval: false,
          clampedDiscountPercent: 0,
          checks: [
            { ruleId: 'GR-RETRY-LIMIT', ruleName: 'Max Retries Policy', passed: true, reason: 'Retry count 0 is within maximum 3 retries limit.', riskLevel: 'LOW' },
            { ruleId: 'GR-AMOUNT-THRESHOLD', ruleName: 'Autonomous Recovery Limit', passed: true, reason: 'Amount ₹3,499 is within autonomous limit (≤ ₹50,000).', riskLevel: 'LOW' },
            { ruleId: 'GR-TERMINAL-DECLINE', ruleName: 'Terminal Decline Protection', passed: true, reason: 'Soft network timeout is safe for automated recovery.', riskLevel: 'LOW' },
            { ruleId: 'GR-DISCOUNT-CEILING', ruleName: 'Discount Ceiling Cap (≤15%)', passed: true, reason: '0% incentive requested (within 15% cap).', riskLevel: 'LOW' },
            { ruleId: 'GR-RATE-LIMIT', ruleName: 'Anti-Spam Frequency Cap', passed: true, reason: '0 messages sent in last 24h.', riskLevel: 'LOW' },
          ],
        };
      } else if (normalized.id === 'txn_rec_80193') {
        normalized.status = 'REQUIRES_HUMAN_APPROVAL';
        normalized.diagnosis = {
          rootCauseSummary: 'High-value enterprise invoice session abandoned at Corporate Netbanking selection screen.',
          failureNature: 'BEHAVIORAL_FRICTION',
          recoveryProbability: 91,
          urgencyLevel: 'CRITICAL',
          customerLifetimeValueTier: 'HIGH_VALUE',
          proposedIntervention: {
            type: 'HUMAN_IN_THE_LOOP_ESCALATION',
            channel: 'SMS',
            title: 'Dedicated Enterprise Account Concierge Recovery',
            description: 'High-value transaction exceeds ₹50,000. Flagged for operator review before dispatching custom corporate invoice link.',
            recommendedDiscountPercent: 0,
            messageCopy: 'Dear Vikramaditya, your Apex Logistics invoice payment of ₹85,000 was interrupted. Your account manager has reserved your cluster renewal: https://demo.simulated-payment.example/i/recov_80193',
            delayMinutes: 0,
            expiryHours: 72,
            fallbackStrategy: 'Direct phone outreach by enterprise account representative.',
          },
          reasoningChain: [
            'Identified ₹85,000 enterprise checkout dropout.',
            'High-value policy rule POL-02 triggered: amounts ≥ ₹50,000 require manual operator verification.',
            'Prepared VIP concierge recovery package awaiting human gate sign-off.',
          ],
        };

        normalized.guardrailEvaluation = {
          allPassed: false,
          requiresHumanApproval: true,
          approvalReason: 'Transaction amount ₹85,000 exceeds autonomous safety limit of ₹50,000.',
          clampedDiscountPercent: 0,
          checks: [
            { ruleId: 'GR-RETRY-LIMIT', ruleName: 'Max Retries Policy', passed: true, reason: 'Retry count 0 is within maximum 2 retries limit.', riskLevel: 'LOW' },
            { ruleId: 'GR-AMOUNT-THRESHOLD', ruleName: 'Autonomous Recovery Limit', passed: false, reason: 'Amount ₹85,000 exceeds ₹50,000 threshold. Operator sign-off required.', riskLevel: 'HIGH' },
            { ruleId: 'GR-TERMINAL-DECLINE', ruleName: 'Terminal Decline Protection', passed: true, reason: 'Checkout abandonment is recoverable via concierge channel.', riskLevel: 'LOW' },
            { ruleId: 'GR-DISCOUNT-CEILING', ruleName: 'Discount Ceiling Cap (≤15%)', passed: true, reason: '0% incentive requested (within 15% cap).', riskLevel: 'LOW' },
            { ruleId: 'GR-RATE-LIMIT', ruleName: 'Anti-Spam Frequency Cap', passed: true, reason: '0 messages sent in last 24h.', riskLevel: 'LOW' },
          ],
        };
      } else if (normalized.id === 'txn_rec_80194') {
        normalized.diagnosis = {
          rootCauseSummary: 'Issuing bank rejected debit request due to insufficient account balance (SBI UPI).',
          failureNature: 'FINANCIAL_CONSTRAINT',
          recoveryProbability: 42,
          urgencyLevel: 'MEDIUM',
          customerLifetimeValueTier: 'NEW_USER',
          proposedIntervention: {
            type: 'WHATSAPP_NUDGE_WITH_DISCOUNT',
            channel: 'WHATSAPP',
            title: 'Low-Friction Pay Later / Salary-Cycle Reminder',
            description: 'Avoid immediate aggressive retry. Send gentle WhatsApp nudge offering alternate UPI or Pay Later option with 10% coupon.',
            recommendedDiscountPercent: 10,
            messageCopy: 'Hi Rohan, your ₹1,499 payment on CodeMaster Academy was paused. Use code LEARN10 for 10% off when you complete your order: https://demo.simulated-payment.example/i/recov_80194',
            delayMinutes: 30,
            expiryHours: 48,
            fallbackStrategy: 'Follow-up SMS reminder during evening prime hours (7 PM - 9 PM).',
          },
          reasoningChain: [
            "Detected insufficient funds error 'PAYMENT_FAILED_INSUFFICIENT_FUNDS'.",
            'Immediate automated retry suppressed to prevent repeated bank decline fees and customer frustration.',
            'Offered 10% financial incentive and delayed nudge to allow fund replenishment.',
          ],
        };

        normalized.guardrailEvaluation = {
          allPassed: true,
          requiresHumanApproval: false,
          clampedDiscountPercent: 10,
          checks: [
            { ruleId: 'GR-RETRY-LIMIT', ruleName: 'Max Retries Policy', passed: true, reason: 'Retry count 1 is within maximum 3 retries limit.', riskLevel: 'LOW' },
            { ruleId: 'GR-AMOUNT-THRESHOLD', ruleName: 'Autonomous Recovery Limit', passed: true, reason: 'Amount ₹1,499 is within autonomous limit (≤ ₹50,000).', riskLevel: 'LOW' },
            { ruleId: 'GR-TERMINAL-DECLINE', ruleName: 'Terminal Decline Protection', passed: true, reason: 'Soft financial friction handled via delayed nudge.', riskLevel: 'LOW' },
            { ruleId: 'GR-DISCOUNT-CEILING', ruleName: 'Discount Ceiling Cap (≤15%)', passed: true, reason: '10% incentive requested (within 15% cap).', riskLevel: 'LOW' },
            { ruleId: 'GR-RATE-LIMIT', ruleName: 'Anti-Spam Frequency Cap', passed: true, reason: '0 messages sent in last 24h.', riskLevel: 'LOW' },
          ],
        };
      } else if (normalized.id === 'txn_rec_80195') {
        normalized.diagnosis = {
          rootCauseSummary: '3D Secure 2.0 OTP verification timed out; customer did not submit OTP in 180s.',
          failureNature: 'BEHAVIORAL_FRICTION',
          recoveryProbability: 72,
          urgencyLevel: 'HIGH',
          customerLifetimeValueTier: 'REGULAR',
          proposedIntervention: {
            type: 'DYNAMIC_UPI_QR',
            channel: 'WHATSAPP',
            title: '1-Tap UPI Alternative Recovery Link',
            description: 'OTP session dropped on Card rail. Send 1-tap WhatsApp payment link supporting instant biometric UPI authorization.',
            recommendedDiscountPercent: 0,
            messageCopy: 'Hi Ananya, your ₹18,999 order at GizmoHub India is reserved. Complete your checkout securely with 1 tap: https://demo.simulated-payment.example/i/recov_80195',
            delayMinutes: 0,
            expiryHours: 24,
            fallbackStrategy: 'Send reminder email with 3D Secure session link after 2 hours.',
          },
          reasoningChain: [
            'Detected card authentication timeout code PAYMENT_AUTHENTICATION_FAILED.',
            'Switching channel from friction-heavy 3D Secure OTP to instant UPI intent flow.',
            'Zero discounting required as buyer has verified high purchase intent.',
          ],
        };

        normalized.guardrailEvaluation = {
          allPassed: true,
          requiresHumanApproval: false,
          clampedDiscountPercent: 0,
          checks: [
            { ruleId: 'GR-RETRY-LIMIT', ruleName: 'Max Retries Policy', passed: true, reason: 'Retry count 0 is within maximum 3 retries limit.', riskLevel: 'LOW' },
            { ruleId: 'GR-AMOUNT-THRESHOLD', ruleName: 'Autonomous Recovery Limit', passed: true, reason: 'Amount ₹18,999 is within autonomous limit (≤ ₹50,000).', riskLevel: 'LOW' },
            { ruleId: 'GR-TERMINAL-DECLINE', ruleName: 'Terminal Decline Protection', passed: true, reason: 'Authentication drop is non-terminal.', riskLevel: 'LOW' },
            { ruleId: 'GR-DISCOUNT-CEILING', ruleName: 'Discount Ceiling Cap (≤15%)', passed: true, reason: '0% incentive requested (within 15% cap).', riskLevel: 'LOW' },
            { ruleId: 'GR-RATE-LIMIT', ruleName: 'Anti-Spam Frequency Cap', passed: true, reason: '0 messages sent in last 24h.', riskLevel: 'LOW' },
          ],
        };
      } else if (normalized.id === 'txn_rec_80196') {
        normalized.diagnosis = {
          rootCauseSummary: 'Daily cumulative UPI peer-to-merchant limit of ₹1,00,000 exceeded for Axis Bank account.',
          failureNature: 'BEHAVIORAL_FRICTION',
          recoveryProbability: 86,
          urgencyLevel: 'HIGH',
          customerLifetimeValueTier: 'HIGH_VALUE',
          proposedIntervention: {
            type: 'RAZORPAY_PAYMENT_LINK',
            channel: 'WHATSAPP',
            title: 'Alternate Multi-Rail Payment Link',
            description: 'Customer hit UPI daily bank ceiling. Provide intelligent multi-rail checkout link highlighting Netbanking and Credit Card.',
            recommendedDiscountPercent: 0,
            messageCopy: 'Hi Kavita, your AirFly booking of ₹24,500 reached your bank UPI limit. Complete your booking via Card or Netbanking: https://demo.simulated-payment.example/i/recov_80196',
            delayMinutes: 0,
            expiryHours: 12,
            fallbackStrategy: 'Schedule automated morning SMS reminder when UPI limits reset at midnight.',
          },
          reasoningChain: [
            'Detected failure code TRANSACTION_LIMIT_EXCEEDED_FOR_USER on UPI rail.',
            'Direct UPI retries are blocked to avoid bank throttling.',
            'Constructed multi-rail checkout payload pre-selecting Netbanking & Card.',
          ],
        };

        normalized.guardrailEvaluation = {
          allPassed: true,
          requiresHumanApproval: false,
          clampedDiscountPercent: 0,
          checks: [
            { ruleId: 'GR-RETRY-LIMIT', ruleName: 'Max Retries Policy', passed: true, reason: '0/2 attempts used.', riskLevel: 'LOW' },
            { ruleId: 'GR-AMOUNT-THRESHOLD', ruleName: 'Autonomous Recovery Limit', passed: true, reason: 'Amount ₹24,500 within autonomous limit (≤ ₹50,000).', riskLevel: 'LOW' },
            { ruleId: 'GR-TERMINAL-DECLINE', ruleName: 'Terminal Decline Protection', passed: true, reason: 'UPI automated retry suppressed; customer redirected to Netbanking.', riskLevel: 'LOW' },
            { ruleId: 'GR-DISCOUNT-CEILING', ruleName: 'Discount Ceiling Cap (≤15%)', passed: true, reason: '0% incentive requested (within 15% cap).', riskLevel: 'LOW' },
            { ruleId: 'GR-RATE-LIMIT', ruleName: 'Anti-Spam Frequency Cap', passed: true, reason: '0 messages sent in last 24h.', riskLevel: 'LOW' },
          ],
        };
      }
    }

    return normalized;
  });
}

export const CANONICAL_TRANSACTIONS: AtRiskTransaction[] = buildInitialHydratedTransactions();
export const CANONICAL_AUDIT_LOGS: AuditLogEntry[] = INITIAL_AUDIT_LOGS;
export const CANONICAL_PRESETS: SimulationPreset[] = SIMULATION_PRESETS;
export const CANONICAL_POLICY_RULES: PolicyRuleDefinition[] = POLICY_RULES;

/**
 * Centralized Data Service API
 * This acts as the centralized source of truth and allows effortless future
 * migration to a real backend REST/GraphQL API or WebSocket streaming service.
 */
export const TransactionDataService = {
  /**
   * Retrieves the canonical baseline list of payment failure events.
   */
  getBaselineTransactions(): AtRiskTransaction[] {
    return CANONICAL_TRANSACTIONS.map((t) => ({ ...t }));
  },

  /**
   * Retrieves the canonical baseline audit trail logs.
   */
  getBaselineAuditLogs(): AuditLogEntry[] {
    return CANONICAL_AUDIT_LOGS.map((l) => ({ ...l }));
  },

  /**
   * Generates a simulated `payment.failed` webhook event from a preset or custom payload.
   */
  createWebhookEvent(
    eventInput: Partial<AtRiskTransaction> | SimulationPreset
  ): PaymentFailedWebhookEvent {
    return WebhookEventProcessor.createPaymentFailedWebhook(eventInput);
  },

  /**
   * Processes a simulated or external `payment.failed` webhook event,
   * updating transaction state and generating the initial FAILURE_DETECTED audit entry.
   */
  processWebhookEvent(
    event: PaymentFailedWebhookEvent
  ): ProcessedEventResult {
    return WebhookEventProcessor.processPaymentFailedWebhook(event);
  },

  /**
   * Ingests a new payment failure event into the centralized pipeline via the event-driven webhook processor,
   * producing the normalized transaction, initial FAILURE_DETECTED audit event, and cognitive models.
   */
  ingestPaymentFailureEvent(
    eventInput: Partial<AtRiskTransaction> | SimulationPreset
  ): {
    transaction: AtRiskTransaction;
    initialAuditLog: AuditLogEntry;
    auditLogs: AuditLogEntry[];
    rawWebhookEvent: PaymentFailedWebhookEvent;
  } {
    const webhook = WebhookEventProcessor.createPaymentFailedWebhook(eventInput);
    return WebhookEventProcessor.processPaymentFailedWebhook(webhook);
  },

  /**
   * Returns simulation presets.
   */
  getPresets(): SimulationPreset[] {
    return CANONICAL_PRESETS;
  },

  /**
   * Returns deterministic policy rules.
   */
  getPolicyRules(): PolicyRuleDefinition[] {
    return CANONICAL_POLICY_RULES;
  },
};

/**
 * Deterministic client-side fallback diagnosis generator.
 * Guarantees zero-downtime operation even during network interruptions or proxy anomalies.
 */
export function generateClientFallbackDiagnosis(txn: AtRiskTransaction): AIDiagnosisResult {
  const customer = txn.customer || txn.customerName || 'Valued Customer';
  const merchant = txn.merchant || txn.merchantName || 'Merchant Store';
  const failureCode = txn.failureCode || txn.gatewayErrorCode || 'GATEWAY_TIMEOUT';
  const amountFormatted = (txn.amount || 0).toLocaleString('en-IN');

  switch (txn.failureCategory) {
    case 'HARD_DECLINE_CARD_EXPIRED':
      return {
        rootCauseSummary: `Card expired (${failureCode}). Automatic gateway retry is permanently blocked to prevent card scheme penalty.`,
        failureNature: 'TERMINAL_HARD_DECLINE',
        recoveryProbability: 78,
        urgencyLevel: 'HIGH',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'PAYMENT_METHOD_UPDATE_PORTAL',
          channel: 'EMAIL',
          title: 'Update Recurring Payment Method',
          description: 'Provide an instant 1-click Razorpay portal to link a new debit/credit card or UPI AutoPay mandate.',
          recommendedDiscountPercent: 0,
          messageCopy: `Hi ${customer}, your payment of ₹${amountFormatted} for ${merchant} couldn't process because your card expired. Update payment details securely here: https://demo.simulated-payment.example/i/recov_${(txn.id || 'order').replace(/[^a-zA-Z0-9]/g, '')}`,
          delayMinutes: 0,
          expiryHours: 72,
          fallbackStrategy: 'If no update after 24h, dispatch secondary WhatsApp alert with direct UPI mandate option.',
        },
        reasoningChain: [
          `Detected terminal error code '${failureCode}'. Retrying the expired card is mathematically guaranteed to fail.`,
          `Categorized as involuntary churn for subscription merchant '${merchant}'. Customer intention remains positive.`,
          `Selected secure Payment Method Update Portal over Email with 72-hour grace period.`,
        ],
      };

    case 'SOFT_DECLINE_NETWORK':
      return {
        rootCauseSummary: `Transient network switch timeout during UPI/Bank authorization (${failureCode}). Instrument is valid and healthy.`,
        failureNature: 'TRANSIENT_SOFT_DECLINE',
        recoveryProbability: 88,
        urgencyLevel: 'HIGH',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'WHATSAPP_NUDGE_WITH_DISCOUNT',
          channel: 'WHATSAPP',
          title: 'Instant 1-Click UPI Payment Link',
          description: 'Send an immediate WhatsApp nudge with a pre-filled Razorpay UPI checkout link while the buyer is still active.',
          recommendedDiscountPercent: (txn.amount || 0) > 3000 ? 5 : 0,
          messageCopy: `Hi ${customer}! We noticed a temporary bank switch delay with your ₹${amountFormatted} order at ${merchant}. Your cart is reserved! Tap here to complete it instantly via UPI: https://demo.simulated-payment.example/i/recov_${(txn.id || 'order').replace(/[^a-zA-Z0-9]/g, '')}`,
          delayMinutes: 2,
          expiryHours: 6,
          fallbackStrategy: 'If not opened in 15 minutes, trigger automated secondary payment router retry.',
        },
        reasoningChain: [
          `Identified transient network glitch on NPCI/Bank switch. Customer has high active purchase intent.`,
          `WhatsApp delivers 90%+ open rate within 5 minutes in Indian digital commerce.`,
          `Attached a bounded discount to prevent cart drop-off while strictly adhering to merchant margin rules.`,
        ],
      };

    case 'INSUFFICIENT_FUNDS':
      return {
        rootCauseSummary: `Account balance insufficient for immediate debit (${failureCode}).`,
        failureNature: 'FINANCIAL_CONSTRAINT',
        recoveryProbability: 64,
        urgencyLevel: 'MEDIUM',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'SMART_RETRY_SCHEDULE',
          channel: 'SMS',
          title: 'Scheduled Salary-Cycle Retry & Split Payment',
          description: 'Schedule a delayed retry timed with standard salary cycles or offer an instant split-pay UPI checkout link.',
          recommendedDiscountPercent: 0,
          messageCopy: `Hi ${customer}, your payment of ₹${amountFormatted} at ${merchant} was declined. Retry anytime or choose an alternate card/UPI: https://demo.simulated-payment.example/i/recov_${(txn.id || 'order').replace(/[^a-zA-Z0-9]/g, '')}`,
          delayMinutes: 60,
          expiryHours: 48,
          fallbackStrategy: 'Offer Pay-Later or 3-month no-cost EMI options if user visits the checkout link.',
        },
        reasoningChain: [
          `Recognized soft decline from insufficient balance. Immediate aggressive retries will fail and irritate customer.`,
          `Configured a delayed retry and provided payment link with alternate funding instruments (Credit Card / EMI).`,
        ],
      };

    default:
      return {
        rootCauseSummary: `Payment failed during authorization stage (${failureCode}). Standard recovery route evaluated.`,
        failureNature: 'TRANSIENT_SOFT_DECLINE',
        recoveryProbability: 75,
        urgencyLevel: 'HIGH',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'RAZORPAY_PAYMENT_LINK',
          channel: 'WHATSAPP',
          title: 'Direct Multi-Rail Recovery Link',
          description: 'Dispatch an expedited recovery payment link supporting Netbanking, UPI, and Cards.',
          recommendedDiscountPercent: 0,
          messageCopy: `Hi ${customer}, your ₹${amountFormatted} payment to ${merchant} was interrupted. Tap here to complete securely: https://demo.simulated-payment.example/i/recov_${(txn.id || 'order').replace(/[^a-zA-Z0-9]/g, '')}`,
          delayMinutes: 1,
          expiryHours: 24,
          fallbackStrategy: 'Send automated email notification with alternate payment rails.',
        },
        reasoningChain: [
          `Standard recovery pathway triggered for unclassified gateway code ${failureCode}.`,
          `Multi-rail Razorpay checkout link sent across high-conversion mobile channels.`,
        ],
      };
  }
}
