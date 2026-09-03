/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NavigationTab =
  | 'OVERVIEW'
  | 'TRANSACTIONS'
  | 'AI_AGENT'
  | 'GUARDRAILS'
  | 'AUDIT_TRAIL'
  | 'SIMULATION_LAB'
  | 'SETTINGS';

export type FailureCategory =
  | 'SOFT_DECLINE_NETWORK'
  | 'INSUFFICIENT_FUNDS'
  | 'AUTH_FAILED_OTP'
  | 'HARD_DECLINE_CARD_EXPIRED'
  | 'CHECKOUT_ABANDONED'
  | 'UPI_LIMIT_EXCEEDED'
  | 'SUBSCRIPTION_MANDATE_INVOLUNTARY_CHURN';

export type PaymentMethod =
  | 'UPI'
  | 'CARD'
  | 'NETBANKING'
  | 'WALLET'
  | 'SUBSCRIPTION_MANDATE';

export type TransactionStatus =
  | 'DETECTED'
  | 'DIAGNOSING'
  | 'GUARDRAILS_CHECK'
  | 'ACTION_SCHEDULED'
  | 'REQUIRES_HUMAN_APPROVAL'
  | 'EXECUTING_RECOVERY'
  | 'RECOVERED'
  | 'EXHAUSTED'
  | 'REJECTED_GUARDRAIL';

export type InterventionType =
  | 'RAZORPAY_PAYMENT_LINK'
  | 'SMART_RETRY_SCHEDULE'
  | 'DYNAMIC_UPI_QR'
  | 'WHATSAPP_NUDGE_WITH_DISCOUNT'
  | 'PAYMENT_METHOD_UPDATE_PORTAL'
  | 'HUMAN_IN_THE_LOOP_ESCALATION';

export interface GuardrailCheckResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  reason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface GuardrailEvaluation {
  allPassed: boolean;
  requiresHumanApproval: boolean;
  approvalReason?: string;
  checks: GuardrailCheckResult[];
  clampedDiscountPercent: number;
}

export interface ProposedIntervention {
  type: InterventionType;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'IN_APP_POPUP' | 'BACKGROUND_GATEWAY_RETRY';
  title: string;
  description: string;
  recommendedDiscountPercent: number;
  messageCopy: string;
  delayMinutes: number;
  expiryHours: number;
  fallbackStrategy: string;
}

export interface AIDiagnosisResult {
  rootCauseSummary: string;
  failureNature: 'TRANSIENT_SOFT_DECLINE' | 'TERMINAL_HARD_DECLINE' | 'BEHAVIORAL_FRICTION' | 'FINANCIAL_CONSTRAINT';
  recoveryProbability: number; // 0 to 100
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  customerLifetimeValueTier: 'HIGH_VALUE' | 'REGULAR' | 'NEW_USER';
  proposedIntervention: ProposedIntervention;
  reasoningChain: string[];
}

export interface PaymentFailureEvent {
  transactionId: string;
  traceId: string;
  customer: string;
  merchant: string;
  amount: number;
  paymentRail: PaymentMethod;
  failureCode: string;
  failureCategory: FailureCategory;
  retryCount: number;
  maxRetries: number;
  customerTier: 'HIGH_VALUE' | 'REGULAR' | 'NEW_USER';
  timestamp: string;
  status: TransactionStatus;
}

/**
 * Canonical simulated webhook event payload for payment failures.
 * Matches standard payment gateway webhook event envelopes.
 */
export interface PaymentFailedWebhookEvent {
  eventId: string;
  eventType: 'payment.failed';
  transactionId: string;
  traceId: string;
  timestamp: string;
  customer: string;
  merchant: string;
  amount: number;
  paymentRail: PaymentMethod;
  failureCode: string;
  failureCategory: FailureCategory;
  retryCount: number;
  maxRetries: number;
  customerTier: 'HIGH_VALUE' | 'REGULAR' | 'NEW_USER';
  metadata?: {
    orderId?: string;
    customerEmail?: string;
    customerPhone?: string;
    gatewayErrorMessage?: string;
    currency?: 'INR';
    rawGatewayResponse?: Record<string, any>;
  };
}

export interface AtRiskTransaction extends PaymentFailureEvent {
  // Standardized schema fields
  id: string; // Alias for transactionId
  customerName: string; // Alias for customer
  merchantName: string; // Alias for merchant
  paymentMethod: PaymentMethod; // Alias for paymentRail
  gatewayErrorCode: string; // Alias for failureCode
  createdAt: string; // Alias for timestamp
  lastAttemptAt: string;

  // Supplementary details
  orderId: string;
  customerEmail: string;
  customerPhone: string;
  currency: 'INR';
  gatewayErrorMessage: string;
  
  // AI Cognition & Recovery State
  diagnosis?: AIDiagnosisResult;
  guardrailEvaluation?: GuardrailEvaluation;
  humanApproved?: boolean;
  humanReviewNotes?: string;
  
  // Execution Outcome
  simulatedPaymentLink?: string;
  simulatedMessageSent?: boolean;
  recoveredAmount?: number;
  recoveredAt?: string;
  executionError?: string;
}

export interface AuditLogEntry {
  id: string;
  eventId?: string;
  timestamp: string;
  transactionId: string;
  orderId: string;
  eventType:
    | 'FAILURE_DETECTED'
    | 'AI_DIAGNOSIS_COMPLETED'
    | 'GUARDRAILS_EVALUATED'
    | 'HUMAN_APPROVAL_GRANTED'
    | 'RECOVERY_ACTION_EXECUTED'
    | 'RECOVERY_DISPATCHED'
    | 'PAYMENT_SETTLED_RECOVERED'
    | 'SETTLEMENT_COMPLETED'
    | 'RECOVERY_EXHAUSTED'
    | 'GUARDRAIL_BLOCKED';
  actor: 'SYSTEM_WEBHOOK' | 'RECOVER_AI_AGENT' | 'GUARDRAIL_POLICY_ENGINE' | 'HUMAN_OPERATOR';
  summary: string;
  details: Record<string, any>;
  riskLevel: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  traceId: string;
}

export interface SimulationPreset {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  iconName: string;
  transactionTemplate: Partial<AtRiskTransaction>;
}

export interface PolicyRuleDefinition {
  id: string;
  name: string;
  category: 'FINANCIAL' | 'SAFETY' | 'CHANNEL' | 'RATE_LIMIT';
  description: string;
  currentValue: string;
  status: 'ENFORCED' | 'MONITORING';
  whyItExists: string;
  historicalBlocksCount: number;
}
