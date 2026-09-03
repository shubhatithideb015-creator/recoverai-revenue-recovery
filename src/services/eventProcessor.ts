/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AtRiskTransaction,
  AuditLogEntry,
  PaymentFailedWebhookEvent,
  SimulationPreset,
  PaymentMethod,
  FailureCategory,
} from '../types';
import { normalizeTransaction } from '../data/transactionStore';

export interface ProcessedEventResult {
  transaction: AtRiskTransaction;
  initialAuditLog: AuditLogEntry;
  auditLogs: AuditLogEntry[];
  rawWebhookEvent: PaymentFailedWebhookEvent;
}

/**
 * Event-Driven Webhook Layer for RecoverAI.
 * Formats, ingests, and processes incoming payment failure telemetry events.
 * Modular design allows direct drop-in replacement with live HTTP/WebSocket webhook receivers.
 */
export class WebhookEventProcessor {
  /**
   * Factory function that constructs a canonical simulated `payment.failed` webhook payload
   * from a scenario preset or user injection payload.
   */
  public static createPaymentFailedWebhook(
    input: SimulationPreset | Partial<AtRiskTransaction>
  ): PaymentFailedWebhookEvent {
    let tpl: Partial<AtRiskTransaction> = {};

    if ('transactionTemplate' in input && input.transactionTemplate) {
      tpl = input.transactionTemplate;
    } else {
      tpl = input as Partial<AtRiskTransaction>;
    }

    const timestamp = new Date().toISOString();
    const txnId = tpl.transactionId || tpl.id || `txn_rec_${Math.floor(10000 + Math.random() * 90000)}`;
    const traceId = tpl.traceId || `trc_${Math.random().toString(36).substring(2, 8)}`;
    const eventId = `evt_wh_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const customer = tpl.customer || tpl.customerName || 'Test Customer';
    const merchant = tpl.merchant || tpl.merchantName || 'Demo Merchant';
    const amount = Number(tpl.amount) || 999;
    const paymentRail: PaymentMethod = (tpl.paymentRail || tpl.paymentMethod || 'UPI') as PaymentMethod;
    const failureCode = tpl.failureCode || tpl.gatewayErrorCode || 'GATEWAY_ERROR';
    const failureCategory: FailureCategory = (tpl.failureCategory || 'SOFT_DECLINE_NETWORK') as FailureCategory;
    const retryCount = tpl.retryCount !== undefined ? Number(tpl.retryCount) : 0;
    const maxRetries = tpl.maxRetries !== undefined ? Number(tpl.maxRetries) : 3;
    const customerTier = tpl.customerTier || 'REGULAR';
    const orderId = tpl.orderId || `order_${txnId.replace('txn_', '')}`;

    return {
      eventId,
      eventType: 'payment.failed',
      transactionId: txnId,
      traceId,
      timestamp,
      customer,
      merchant,
      amount,
      paymentRail,
      failureCode,
      failureCategory,
      retryCount,
      maxRetries,
      customerTier,
      metadata: {
        orderId,
        customerEmail: tpl.customerEmail || `${customer.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`,
        customerPhone: tpl.customerPhone || `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
        gatewayErrorMessage: tpl.gatewayErrorMessage || `Payment failure code ${failureCode}`,
        currency: 'INR',
        rawGatewayResponse: {
          error: {
            code: failureCode,
            description: tpl.gatewayErrorMessage || `Gateway failure on ${paymentRail} node.`,
            step: 'payment_authentication',
            reason: failureCategory,
          },
        },
      },
    };
  }

  /**
   * Processes a `payment.failed` webhook event:
   * 1. Ingests the webhook into the centralized state
   * 2. Marks the transaction as detected ('DETECTED' status, or 'REQUIRES_HUMAN_APPROVAL' for high ticket >= ₹50k)
   * 3. Creates the canonical initial FAILURE_DETECTED audit event
   * 4. Prepares the transaction for subsequent AI diagnosis via Gemini
   */
  public static processPaymentFailedWebhook(
    event: PaymentFailedWebhookEvent
  ): ProcessedEventResult {
    // 1. Guarantee normalized transaction attributes with initial DETECTED state
    const isHighValue = event.amount >= 50000;
    const initialStatus = isHighValue ? 'REQUIRES_HUMAN_APPROVAL' : 'DETECTED';

    const normalizedTxn = normalizeTransaction({
      transactionId: event.transactionId,
      id: event.transactionId,
      traceId: event.traceId,
      customer: event.customer,
      customerName: event.customer,
      merchant: event.merchant,
      merchantName: event.merchant,
      amount: event.amount,
      paymentRail: event.paymentRail,
      paymentMethod: event.paymentRail,
      failureCode: event.failureCode,
      gatewayErrorCode: event.failureCode,
      failureCategory: event.failureCategory,
      retryCount: event.retryCount,
      maxRetries: event.maxRetries,
      customerTier: event.customerTier,
      timestamp: event.timestamp,
      createdAt: event.timestamp,
      lastAttemptAt: event.timestamp,
      status: initialStatus,
      orderId: event.metadata?.orderId || `order_${event.transactionId.replace('txn_', '')}`,
      customerEmail: event.metadata?.customerEmail,
      customerPhone: event.metadata?.customerPhone,
      gatewayErrorMessage: event.metadata?.gatewayErrorMessage,
      diagnosis: undefined,
      guardrailEvaluation: undefined,
    });

    // 4. Create the canonical initial FAILURE_DETECTED audit event
    const initialAuditLog: AuditLogEntry = {
      id: `aud_evt_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: event.timestamp,
      transactionId: event.transactionId,
      orderId: normalizedTxn.orderId,
      eventType: 'FAILURE_DETECTED',
      actor: 'SYSTEM_WEBHOOK',
      summary: `Payment failed for ${event.customer} (₹${event.amount.toLocaleString('en-IN')}) via ${event.paymentRail}. Code: ${event.failureCode}. Ingested via simulated webhook (${event.eventId}).`,
      details: {
        eventId: event.eventId,
        eventType: event.eventType,
        traceId: event.traceId,
        transactionId: event.transactionId,
        orderId: normalizedTxn.orderId,
        amount: event.amount,
        currency: 'INR',
        customer: event.customer,
        customerName: event.customer,
        merchant: event.merchant,
        merchantName: event.merchant,
        paymentRail: event.paymentRail,
        paymentMethod: event.paymentRail,
        failureCode: event.failureCode,
        gatewayErrorCode: event.failureCode,
        failureCategory: event.failureCategory,
        customerTier: event.customerTier,
        retryCount: event.retryCount,
        maxRetries: event.maxRetries,
        gatewayErrorMessage: event.metadata?.gatewayErrorMessage,
        timestamp: event.timestamp,
      },
      riskLevel: isHighValue ? 'ALERT' : 'INFO',
      traceId: event.traceId,
    };

    return {
      transaction: normalizedTxn,
      initialAuditLog,
      auditLogs: [initialAuditLog],
      rawWebhookEvent: event,
    };
  }
}
