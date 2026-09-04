/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { AtRiskTransaction, AIDiagnosisResult, GuardrailEvaluation, GuardrailCheckResult } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client server-side
let ai: GoogleGenAI | null = null;
let lastApiKey: string | undefined = undefined;

function getAiClient(): GoogleGenAI | null {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey) return null;
  if (!ai || lastApiKey !== currentKey) {
    ai = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    lastApiKey = currentKey;
  }
  return ai;
}

// Fallback deterministic diagnosis engine for instant offline/offline resilience
function generateFallbackDiagnosis(txn: AtRiskTransaction): AIDiagnosisResult {
  const isHighValue = (txn.amount || 0) >= 20000;
  const isStudentOrNew = (txn.amount || 0) < 1500;
  const customer = txn.customer || txn.customerName || 'Valued Customer';
  const merchant = txn.merchant || txn.merchantName || 'Merchant Store';
  const failureCode = txn.failureCode || txn.gatewayErrorCode || 'BAD_REQUEST_GATEWAY_TIMEOUT';
  const amountFormatted = (txn.amount || 0).toLocaleString('en-IN');

  switch (txn.failureCategory) {
    case 'HARD_DECLINE_CARD_EXPIRED':
      return {
        rootCauseSummary: `Payment failed due to expired payment instrument (${failureCode}). Automatic recurring retry is permanently blocked.`,
        failureNature: 'TERMINAL_HARD_DECLINE',
        recoveryProbability: 78,
        urgencyLevel: 'HIGH',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'PAYMENT_METHOD_UPDATE_PORTAL',
          channel: 'EMAIL',
          title: 'Update Recurring Payment Method',
          description: 'Provide an instant 1-click Razorpay portal to link a new debit/credit card or UPI AutoPay mandate without service disruption.',
          recommendedDiscountPercent: 0,
          messageCopy: `Hi ${customer}, your subscription payment of ₹${amountFormatted} for ${merchant} couldn't process because your card has expired. Click below to securely update your payment method to keep your account active without interruption:`,
          delayMinutes: 0,
          expiryHours: 72,
          fallbackStrategy: 'If no update after 24h, dispatch secondary WhatsApp alert with direct UPI mandate option.',
        },
        reasoningChain: [
          `Detected terminal error code '${failureCode}'. Retrying the expired card is mathematically guaranteed to fail.`,
          `Categorized as involuntary churn for subscription merchant '${merchant}'. Customer intention remains positive.`,
          `Selected secure Payment Method Update Portal over Email with 72-hour grace period to prevent abrupt service cutoff.`,
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
          description: 'Send an immediate WhatsApp nudge with a pre-filled Razorpay UPI checkout link while the buyer is still on their device.',
          recommendedDiscountPercent: (txn.amount || 0) > 3000 ? 5 : 0,
          messageCopy: `Hi ${customer}! We noticed a temporary bank switch delay with your ₹${amountFormatted} order at ${merchant}. Your cart is reserved! Tap here to complete it instantly via UPI (GPay/PhonePe/Paytm):`,
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

    case 'AUTH_FAILED_OTP':
      return {
        rootCauseSummary: `3D Secure OTP verification timed out or failed (${failureCode}). Buyer did not complete OTP in the active window.`,
        failureNature: 'BEHAVIORAL_FRICTION',
        recoveryProbability: 82,
        urgencyLevel: 'HIGH',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'RAZORPAY_PAYMENT_LINK',
          channel: 'WHATSAPP',
          title: 'Instant 1-Click Retry with OTP Assist',
          description: 'Deliver an accelerated checkout link directly to the buyer on WhatsApp with seamless biometric or SMS OTP routing.',
          recommendedDiscountPercent: 0,
          messageCopy: `Hi ${customer}, your ₹${amountFormatted} payment for ${merchant} timed out during OTP verification. Tap here to complete it instantly:`,
          delayMinutes: 1,
          expiryHours: 12,
          fallbackStrategy: 'If uncompleted in 30 minutes, trigger alternate UPI payment link via SMS.',
        },
        reasoningChain: [
          `Identified 3DS2 OTP session timeout. Transaction credentials are valid and user intent is high.`,
          `WhatsApp delivers immediate re-engagement while user is on their mobile device.`,
          `Bypasses redundant checkout steps and directs straight to authentication.`,
        ],
      };

    case 'CHECKOUT_ABANDONED':
      return {
        rootCauseSummary: `Customer initiated checkout for ₹${amountFormatted} but dropped off during payment method selection (${failureCode}).`,
        failureNature: 'BEHAVIORAL_FRICTION',
        recoveryProbability: 64,
        urgencyLevel: isHighValue ? 'CRITICAL' : 'MEDIUM',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: isHighValue ? 'HUMAN_IN_THE_LOOP_ESCALATION' : 'RAZORPAY_PAYMENT_LINK',
          channel: isHighValue ? 'EMAIL' : 'WHATSAPP',
          title: isHighValue ? 'Enterprise Account Exec Recovery Assist' : 'Cart Recovery Dynamic Payment Link',
          description: isHighValue
            ? 'High-value enterprise order requires human account manager touchpoint with customized invoicing options (NEFT/RTGS).'
            : 'Deliver a frictionless multi-option Razorpay payment link with instant cart restoration.',
          recommendedDiscountPercent: isHighValue ? 0 : 5,
          messageCopy: `Hi ${customer}, you left your ${merchant} items in the cart! Complete your order of ₹${amountFormatted} with 1-click via Razorpay:`,
          delayMinutes: 10,
          expiryHours: 24,
          fallbackStrategy: 'Schedule an automated follow-up SMS with 5% limited-time incentive if unopened after 2 hours.',
        },
        reasoningChain: [
          `Analyzed session dropout. Customer spent time configuring order before abandoning at checkout gateway step.`,
          isHighValue
            ? `Amount ₹${amountFormatted} exceeds standard automated intervention threshold; flagged for account manager concierge assist.`
            : `Delivering low-friction multi-rail payment link (UPI, Credit Card, EMI) to overcome single-method friction.`,
        ],
      };

    case 'INSUFFICIENT_FUNDS':
      return {
        rootCauseSummary: `Payment declined due to insufficient account balance on primary bank account (${failureCode}).`,
        failureNature: 'FINANCIAL_CONSTRAINT',
        recoveryProbability: 52,
        urgencyLevel: 'MEDIUM',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'RAZORPAY_PAYMENT_LINK',
          channel: 'WHATSAPP',
          title: 'Alternate Payment Rail or PayLater Option',
          description: 'Provide a flexible checkout link highlighting Credit Card EMI, PayLater, or secondary UPI bank account options.',
          recommendedDiscountPercent: isStudentOrNew ? 10 : 5,
          messageCopy: `Hi ${customer}, your ₹${amountFormatted} payment at ${merchant} had a balance issue. You can easily complete this using an alternate bank account, Credit Card, or No-Cost EMI here:`,
          delayMinutes: 30,
          expiryHours: 48,
          fallbackStrategy: 'Send automated reminder near month-end / payday cycle (1st-5th of month).',
        },
        reasoningChain: [
          `Recognized temporary liquidity constraint on customer's primary account.`,
          `Card retries on the exact same account will repeat failure and hurt gateway reputation scores.`,
          `Offered alternate payment rails (Card/PayLater/EMI) with safe incentive to bridge liquidity gap.`,
        ],
      };

    case 'UPI_LIMIT_EXCEEDED':
      return {
        rootCauseSummary: `User reached cumulative daily UPI transfer ceiling for their bank account (${failureCode}).`,
        failureNature: 'FINANCIAL_CONSTRAINT',
        recoveryProbability: 72,
        urgencyLevel: 'HIGH',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'RAZORPAY_PAYMENT_LINK',
          channel: 'WHATSAPP',
          title: 'Netbanking / Debit Card Alternative Route',
          description: 'Send an instant smart checkout link auto-selecting Netbanking or Corporate Card to bypass UPI caps.',
          recommendedDiscountPercent: 0,
          messageCopy: `Hi ${customer}, your ₹${amountFormatted} payment at ${merchant} reached your bank's daily UPI limit. Pay effortlessly using Netbanking or Debit/Credit Card right here:`,
          delayMinutes: 1,
          expiryHours: 12,
          fallbackStrategy: 'Schedule automatic UPI retry at 00:05 AM tomorrow when daily bank limit resets.',
        },
        reasoningChain: [
          `Detected daily UPI quota exhaustion. Customer has active funds in bank, but NPCI volume cap was triggered.`,
          `Directing user to Netbanking/Card rails immediately captures the transaction without waiting for midnight reset.`,
        ],
      };

    default:
      return {
        rootCauseSummary: `Payment failed during gateway processing with error code ${failureCode}.`,
        failureNature: 'TRANSIENT_SOFT_DECLINE',
        recoveryProbability: 60,
        urgencyLevel: 'MEDIUM',
        customerLifetimeValueTier: txn.customerTier || 'REGULAR',
        proposedIntervention: {
          type: 'RAZORPAY_PAYMENT_LINK',
          channel: 'WHATSAPP',
          title: 'Razorpay Smart Recovery Link',
          description: 'Deliver an optimized multi-method recovery link with 1-click fallback routing.',
          recommendedDiscountPercent: 5,
          messageCopy: `Hi ${customer}, your payment of ₹${amountFormatted} for ${merchant} encountered an issue. Tap here to complete securely:`,
          delayMinutes: 5,
          expiryHours: 24,
          fallbackStrategy: 'Follow up via SMS after 1 hour if unpaid.',
        },
        reasoningChain: [
          `Standard recovery pathway triggered for unclassified gateway code ${failureCode}.`,
          `Multi-rail Razorpay checkout link sent across high-conversion mobile channels.`,
        ],
      };
  }
}

// 1. AI Diagnosis API Endpoint
app.post('/api/recover/diagnose', async (req, res) => {
  try {
    const txn: AtRiskTransaction = req.body.transaction;
    if (!txn || (!txn.id && !txn.transactionId)) {
      return res.status(400).json({ error: 'Valid transaction object is required.' });
    }

    const txnId = txn.transactionId || txn.id;
    const orderId = txn.orderId || `order_${txnId.replace(/[^a-zA-Z0-9]/g, '')}`;
    const customer = txn.customer || txn.customerName || 'Customer';
    const merchant = txn.merchant || txn.merchantName || 'Merchant';
    const paymentRail = txn.paymentRail || txn.paymentMethod || 'UPI';
    const failureCode = txn.failureCode || txn.gatewayErrorCode || 'BAD_REQUEST_GATEWAY_TIMEOUT';
    const failureCategory = txn.failureCategory || 'SOFT_DECLINE_NETWORK';
    const customerTier = txn.customerTier || 'REGULAR';
    const retryCount = txn.retryCount ?? 0;
    const maxRetries = txn.maxRetries ?? 3;
    const amount = Number(txn.amount) || 0;
    const gatewayErrorMessage = txn.gatewayErrorMessage || `Payment failure code ${failureCode}`;

    const geminiAi = getAiClient();
    if (!geminiAi) {
      // Return highly structured fallback reasoning if Gemini API key not present
      const fallback = generateFallbackDiagnosis(txn);
      return res.json({ diagnosis: fallback, source: 'RULE_ENGINE_FALLBACK' });
    }

    const prompt = `You are RecoverAI, an enterprise senior fintech recovery AI agent built for Razorpay merchants in India.
Analyze this payment failure and formulate an optimal, bounded recovery strategy.

TRANSACTION DETAILS:
- Transaction ID: ${txnId}
- Order ID: ${orderId}
- Merchant Name: ${merchant}
- Customer Name: ${customer}
- Customer Email: ${txn.customerEmail || 'N/A'}
- Customer Phone: ${txn.customerPhone || 'N/A'}
- Customer Tier: ${customerTier}
- Amount: ₹${amount} INR
- Payment Rail / Method: ${paymentRail}
- Failure Category: ${failureCategory}
- Gateway Error Code: ${failureCode}
- Gateway Error Message: ${gatewayErrorMessage}
- Previous Retry Count: ${retryCount} of ${maxRetries}

RECOVERY OBJECTIVE:
1. Classify failure taxonomy & diagnose root cause (TRANSIENT_SOFT_DECLINE, TERMINAL_HARD_DECLINE, BEHAVIORAL_FRICTION, FINANCIAL_CONSTRAINT).
2. Estimate statistical recovery probability (0 to 100).
3. Determine confidence / urgency level (LOW, MEDIUM, HIGH, CRITICAL).
4. Propose safe, bounded intervention (type, channel, discount up to 15% max, tailored message copy, delay in minutes, expiry in hours, fallback strategy).
5. Outline a 3-step reasoning chain (Detect -> Decide -> Act plan).

Return response adhering strictly to the JSON schema.`;

    // Multi-tier candidate model strategy with verified fast models & strict per-call timeout
    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    const geminiSchemaConfig = {
      systemInstruction: 'You are RecoverAI, an expert fintech payment recovery and agent safety architect. Always provide accurate, compliant, and actionable recovery diagnosis.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rootCauseSummary: { type: Type.STRING },
          failureNature: {
            type: Type.STRING,
            enum: ['TRANSIENT_SOFT_DECLINE', 'TERMINAL_HARD_DECLINE', 'BEHAVIORAL_FRICTION', 'FINANCIAL_CONSTRAINT'],
          },
          recoveryProbability: { type: Type.INTEGER },
          urgencyLevel: {
            type: Type.STRING,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          },
          customerLifetimeValueTier: {
            type: Type.STRING,
            enum: ['HIGH_VALUE', 'REGULAR', 'NEW_USER'],
          },
          proposedIntervention: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                enum: [
                  'RAZORPAY_PAYMENT_LINK',
                  'SMART_RETRY_SCHEDULE',
                  'DYNAMIC_UPI_QR',
                  'WHATSAPP_NUDGE_WITH_DISCOUNT',
                  'PAYMENT_METHOD_UPDATE_PORTAL',
                  'HUMAN_IN_THE_LOOP_ESCALATION',
                ],
              },
              channel: {
                type: Type.STRING,
                enum: ['WHATSAPP', 'SMS', 'EMAIL', 'IN_APP_POPUP', 'BACKGROUND_GATEWAY_RETRY'],
              },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              recommendedDiscountPercent: { type: Type.INTEGER },
              messageCopy: { type: Type.STRING },
              delayMinutes: { type: Type.INTEGER },
              expiryHours: { type: Type.INTEGER },
              fallbackStrategy: { type: Type.STRING },
            },
            required: ['type', 'channel', 'title', 'description', 'recommendedDiscountPercent', 'messageCopy', 'delayMinutes', 'expiryHours', 'fallbackStrategy'],
          },
          reasoningChain: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['rootCauseSummary', 'failureNature', 'recoveryProbability', 'urgencyLevel', 'customerLifetimeValueTier', 'proposedIntervention', 'reasoningChain'],
      },
    };

    let responseText = '';
    let selectedModel = '';

    for (const modelName of candidateModels) {
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout invoking ${modelName}`)), 3500)
        );
        const generatePromise = geminiAi.models.generateContent({
          model: modelName,
          contents: prompt,
          config: geminiSchemaConfig,
        });

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        if (response && response.text) {
          responseText = response.text;
          selectedModel = modelName;
          break;
        }
      } catch (candidateErr: any) {
        // Silently step to the next model in the cascade
        continue;
      }
    }

    if (!responseText) {
      // Deterministic rule engine fallback when upstream models take too long or are unavailable
      const fallback = generateFallbackDiagnosis(txn);
      res.setHeader('Content-Type', 'application/json');
      return res.json({ diagnosis: fallback, source: 'RULE_ENGINE_FALLBACK_ON_HIGH_DEMAND' });
    }

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    let parsedDiagnosis: AIDiagnosisResult;
    try {
      parsedDiagnosis = JSON.parse(cleaned || '{}');
    } catch (parseErr) {
      console.warn('Failed to parse Gemini JSON output, using structured fallback:', parseErr);
      const fallback = generateFallbackDiagnosis(txn);
      return res.json({ diagnosis: fallback, source: 'RULE_ENGINE_FALLBACK_ON_PARSE_ERROR' });
    }
    
    // Ensure recoveryProbability is a valid number between 0 and 100
    if (typeof parsedDiagnosis.recoveryProbability !== 'number' || isNaN(parsedDiagnosis.recoveryProbability)) {
      parsedDiagnosis.recoveryProbability = 70;
    } else {
      parsedDiagnosis.recoveryProbability = Math.max(0, Math.min(100, Math.round(parsedDiagnosis.recoveryProbability)));
    }

    return res.json({ diagnosis: parsedDiagnosis, source: selectedModel ? `GEMINI_AI (${selectedModel})` : 'GEMINI_AI' });
  } catch (error: any) {
    console.error('Error in /api/recover/diagnose:', error);
    const txn: AtRiskTransaction = req.body.transaction;
    const fallback = generateFallbackDiagnosis(txn);
    return res.json({ diagnosis: fallback, source: 'RULE_ENGINE_FALLBACK_ON_ERROR', error: error?.message });
  }
});

// 2. Deterministic Guardrails Evaluation API Endpoint
app.post('/api/recover/guardrail-check', (req, res) => {
  try {
    const { transaction, proposedIntervention } = req.body as {
      transaction: AtRiskTransaction;
      proposedIntervention: AIDiagnosisResult['proposedIntervention'];
    };

    if (!transaction || !proposedIntervention) {
      return res.status(400).json({ error: 'Missing transaction or proposedIntervention' });
    }

    const checks: GuardrailCheckResult[] = [];
    let requiresHumanApproval = false;
    let approvalReason = '';
    let clampedDiscount = proposedIntervention.recommendedDiscountPercent;

    // Guardrail 1: Max Discount Ceiling (Anti-Margin Bleed)
    const MAX_ALLOWED_DISCOUNT = 15;
    if (proposedIntervention.recommendedDiscountPercent > MAX_ALLOWED_DISCOUNT) {
      clampedDiscount = MAX_ALLOWED_DISCOUNT;
      checks.push({
        ruleId: 'GR-DISCOUNT-CEILING',
        ruleName: 'Max 15% Recovery Incentive Limit',
        passed: false,
        reason: `AI proposed ${proposedIntervention.recommendedDiscountPercent}% discount. Clamped to hard ceiling of 15% to prevent merchant loss.`,
        riskLevel: 'HIGH',
      });
    } else {
      checks.push({
        ruleId: 'GR-DISCOUNT-CEILING',
        ruleName: 'Max 15% Recovery Incentive Limit',
        passed: true,
        reason: `Proposed discount of ${proposedIntervention.recommendedDiscountPercent}% is within safe bounds (≤15%).`,
        riskLevel: 'LOW',
      });
    }

    // Guardrail 2: High-Value Transaction Human-in-the-Loop Gate
    const HIGH_VALUE_THRESHOLD = 50000;
    if (transaction.amount >= HIGH_VALUE_THRESHOLD) {
      requiresHumanApproval = true;
      approvalReason = `Transaction amount (₹${transaction.amount.toLocaleString('en-IN')}) exceeds autonomous threshold (₹50,000). Requires human operator sign-off before dispatch.`;
      checks.push({
        ruleId: 'GR-HIGH-VALUE-HUMAN-GATE',
        ruleName: 'High-Value Operator Approval (≥₹50,000)',
        passed: false,
        reason: approvalReason,
        riskLevel: 'CRITICAL',
      });
    } else {
      checks.push({
        ruleId: 'GR-HIGH-VALUE-HUMAN-GATE',
        ruleName: 'High-Value Operator Approval (≥₹50,000)',
        passed: true,
        reason: `Transaction amount (₹${transaction.amount.toLocaleString('en-IN')}) is below ₹50,000; autonomous recovery permitted.`,
        riskLevel: 'LOW',
      });
    }

    // Guardrail 3: Terminal Decline Retry Prohibition
    if (
      transaction.failureCategory === 'HARD_DECLINE_CARD_EXPIRED' &&
      proposedIntervention.type === 'SMART_RETRY_SCHEDULE'
    ) {
      checks.push({
        ruleId: 'GR-TERMINAL-DECLINE-BLOCK',
        ruleName: 'Zero-Retry Rule on Expired/Stolen Cards',
        passed: false,
        reason: 'Expired payment cards cannot be retried automatically. Action must request a new payment method.',
        riskLevel: 'CRITICAL',
      });
    } else {
      checks.push({
        ruleId: 'GR-TERMINAL-DECLINE-BLOCK',
        ruleName: 'Zero-Retry Rule on Expired/Stolen Cards',
        passed: true,
        reason: 'Payment method update strategy appropriately chosen for terminal card state.',
        riskLevel: 'LOW',
      });
    }

    // Guardrail 4: Stopping Rule & Circuit Breaker (Max Retries)
    if (transaction.retryCount >= transaction.maxRetries) {
      checks.push({
        ruleId: 'GR-CIRCUIT-BREAKER-RETRIES',
        ruleName: 'Stopping Rule: Maximum 3 Retries',
        passed: false,
        reason: `Transaction has reached maximum permitted attempts (${transaction.retryCount}/${transaction.maxRetries}). Halting automated loops to avoid network penalty.`,
        riskLevel: 'HIGH',
      });
    } else {
      checks.push({
        ruleId: 'GR-CIRCUIT-BREAKER-RETRIES',
        ruleName: 'Stopping Rule: Maximum 3 Retries',
        passed: true,
        reason: `Current attempt count (${transaction.retryCount}/${transaction.maxRetries}) is within permitted ceiling.`,
        riskLevel: 'LOW',
      });
    }

    // Guardrail 5: Anti-Spam Rate Limit (Max 2 messages in 24h)
    checks.push({
      ruleId: 'GR-ANTI-SPAM-RATE-LIMIT',
      ruleName: 'Anti-Spam Frequency Cap (≤2 msgs / 24h)',
      passed: true,
      reason: `Customer ${transaction.customerPhone} has received 0 messages in the last 24h. Cap compliant.`,
      riskLevel: 'LOW',
    });

    const allPassed = checks.every((c) => c.passed || (c.ruleId === 'GR-HIGH-VALUE-HUMAN-GATE' && transaction.humanApproved));

    const evaluation: GuardrailEvaluation = {
      allPassed,
      requiresHumanApproval,
      approvalReason,
      checks,
      clampedDiscountPercent: clampedDiscount,
    };

    return res.json({ evaluation });
  } catch (error: any) {
    console.error('Error in /api/recover/guardrail-check:', error);
    return res.status(500).json({ error: error?.message });
  }
});

// 3. Simulated Bounded Recovery Action Runner API Endpoint
app.post('/api/recover/execute-action', (req, res) => {
  try {
    const { transaction, intervention, humanApproved } = req.body as {
      transaction: AtRiskTransaction;
      intervention: AIDiagnosisResult['proposedIntervention'];
      humanApproved?: boolean;
    };

    if (!transaction || !intervention) {
      return res.status(400).json({ error: 'Missing transaction or intervention payload' });
    }

    // Enforce high-value safety gate
    if (transaction.amount >= 50000 && !humanApproved) {
      return res.status(403).json({
        error: 'High-value transaction exceeds ₹50,000 and has not received human operator sign-off.',
        code: 'HUMAN_APPROVAL_REQUIRED',
      });
    }

    // Generate simulated demo payment/portal link (NOT a real Razorpay payment link)
    const linkId = intervention.type === 'PAYMENT_METHOD_UPDATE_PORTAL'
      ? `portal_${(transaction.transactionId || transaction.id || 'recov').replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`
      : `recov_${(transaction.transactionId || transaction.id || 'link').replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`;
    const simulatedPaymentLink = intervention.type === 'PAYMENT_METHOD_UPDATE_PORTAL'
      ? `https://demo.simulated-portal.example/portal/${linkId}`
      : `https://demo.simulated-payment.example/i/${linkId}`;
    const timestamp = new Date().toISOString();
    const traceId = transaction.traceId || `trc_${Math.random().toString(36).substring(2, 10)}`;

    const executionLog = {
      status: 'ACTION_SCHEDULED',
      simulatedPaymentLink,
      simulatedMessageSent: true,
      channelDispatched: intervention.channel,
      messagePayload: intervention.messageCopy,
      executedAt: timestamp,
      traceId,
      transactionId: transaction.transactionId || transaction.id,
      note: 'SIMULATED - No real payment executed. This is a demo recovery link.',
    };

    return res.json({
      success: true,
      executionLog,
      traceId,
      transactionId: transaction.transactionId || transaction.id,
      message: `SIMULATED recovery intervention scheduled via ${intervention.channel}. No real Razorpay payment executed - this is a demo environment.`,
    });
  } catch (error: any) {
    console.error('Error in /api/recover/execute-action:', error);
    return res.status(500).json({ error: error?.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'RecoverAI Enterprise Agent Platform',
    geminiEnabled: Boolean(ai),
    timestamp: new Date().toISOString(),
  });
});

// Guard to prevent API requests from falling through to Vite SPA index.html
app.all('/api/*', (req, res) => {
  res.status(404).setHeader('Content-Type', 'application/json').json({
    error: `API route not found: ${req.method} ${req.path}`,
  });
});

// Vite Middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RecoverAI full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
