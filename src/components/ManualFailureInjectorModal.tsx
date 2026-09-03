/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AtRiskTransaction, FailureCategory, PaymentMethod } from '../types';
import { X, PlusCircle, Terminal, Copy, Check, ShieldAlert, Zap } from 'lucide-react';

interface ManualFailureInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (txn: AtRiskTransaction) => void;
}

export const ManualFailureInjectorModal: React.FC<ManualFailureInjectorModalProps> = ({
  isOpen,
  onClose,
  onInject,
}) => {
  if (!isOpen) return null;

  // Form State
  const [customerName, setCustomerName] = useState('Rahul Varma');
  const [customerEmail, setCustomerEmail] = useState('rahul.varma@example.com');
  const [customerPhone, setCustomerPhone] = useState('+91 98450 11223');
  const [customerTier, setCustomerTier] = useState<'HIGH_VALUE' | 'REGULAR' | 'NEW_USER'>('REGULAR');

  const [merchantName, setMerchantName] = useState('Zomato Enterprise / D2C');
  const [amount, setAmount] = useState('2499');
  const [currency] = useState('INR');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');

  const [failureCategory, setFailureCategory] = useState<FailureCategory>('SOFT_DECLINE_NETWORK');
  const [gatewayErrorCode, setGatewayErrorCode] = useState('BAD_REQUEST_GATEWAY_TIMEOUT');
  const [gatewayErrorMessage, setGatewayErrorMessage] = useState('UPI PSP Switch timed out during authorization.');
  const [maxRetries, setMaxRetries] = useState(3);

  const [copiedJson, setCopiedJson] = useState(false);

  // Static / stable IDs for event preview
  const [simIds] = useState(() => {
    const rawIdNum = Math.floor(10000 + Math.random() * 90000);
    return {
      eventId: `evt_wh_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`,
      transactionId: `txn_rec_${rawIdNum}`,
      traceId: `trc_${Math.random().toString(36).substring(2, 8)}`,
      orderId: `order_sim_${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
    };
  });

  const parsedAmount = parseFloat(amount) || 0;
  const isHighValue = parsedAmount >= 50000;

  const handleCategoryChange = (cat: FailureCategory) => {
    setFailureCategory(cat);
    switch (cat) {
      case 'SOFT_DECLINE_NETWORK':
        setGatewayErrorCode('BAD_REQUEST_GATEWAY_TIMEOUT');
        setGatewayErrorMessage('NPCI UPI Switch timed out after 45s during bank authorization.');
        break;
      case 'HARD_DECLINE_CARD_EXPIRED':
        setGatewayErrorCode('CARD_EXPIRED');
        setGatewayErrorMessage('Card linked to e-mandate has expired. Recurring payment rejected.');
        break;
      case 'CHECKOUT_ABANDONED':
        setGatewayErrorCode('CHECKOUT_DROPOUT_AFTER_PAYLOAD_INIT');
        setGatewayErrorMessage('User initialized payment session but abandoned cart at gateway.');
        break;
      case 'INSUFFICIENT_FUNDS':
        setGatewayErrorCode('PAYMENT_FAILED_INSUFFICIENT_FUNDS');
        setGatewayErrorMessage('Account balance is insufficient for debit on primary bank account.');
        break;
      case 'UPI_LIMIT_EXCEEDED':
        setGatewayErrorCode('TRANSACTION_LIMIT_EXCEEDED_FOR_USER');
        setGatewayErrorMessage('Daily cumulative UPI transaction limit of ₹1,00,000 exceeded.');
        break;
    }
  };

  // Construct Preview JSON
  const webhookPreviewPayload = useMemo(() => {
    return {
      event: 'payment.failed',
      event_id: simIds.eventId,
      created_at: simIds.timestamp,
      payload: {
        payment: {
          entity: {
            id: simIds.transactionId,
            trace_id: simIds.traceId,
            order_id: simIds.orderId,
            amount: parsedAmount,
            currency: currency,
            status: 'failed',
            method: paymentMethod,
            error_code: gatewayErrorCode,
            error_description: gatewayErrorMessage,
            error_source: 'gateway',
            error_step: 'payment_authentication',
            error_reason: failureCategory,
            created_at: Math.floor(Date.now() / 1000),
          },
        },
        merchant: {
          name: merchantName,
        },
        customer: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
          tier: customerTier,
        },
        recovery_policy: {
          max_retries: maxRetries,
          guardrail_tier: isHighValue ? 'HUMAN_APPROVAL_GATED' : 'AUTONOMOUS_PERMITTED',
        },
      },
    };
  }, [
    simIds,
    parsedAmount,
    currency,
    paymentMethod,
    gatewayErrorCode,
    gatewayErrorMessage,
    failureCategory,
    merchantName,
    customerName,
    customerEmail,
    customerPhone,
    customerTier,
    maxRetries,
    isHighValue,
  ]);

  const jsonString = JSON.stringify(webhookPreviewPayload, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date().toISOString();
    const newTxn: AtRiskTransaction = {
      // Canonical 13 fields
      transactionId: simIds.transactionId,
      traceId: simIds.traceId,
      customer: customerName,
      merchant: merchantName,
      amount: parsedAmount,
      paymentRail: paymentMethod,
      failureCode: gatewayErrorCode,
      failureCategory,
      retryCount: 0,
      maxRetries: Number(maxRetries) || 3,
      customerTier,
      timestamp: now,
      status: isHighValue ? 'REQUIRES_HUMAN_APPROVAL' : 'DETECTED',

      // Aliases
      id: simIds.transactionId,
      customerName,
      merchantName,
      paymentMethod,
      gatewayErrorCode,
      createdAt: now,
      lastAttemptAt: now,

      // Supplementary
      orderId: simIds.orderId,
      customerEmail,
      customerPhone,
      currency: 'INR',
      gatewayErrorMessage,
    };

    onInject(newTxn);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4">
      <div className="bg-[#141313] border border-[#2b2a2a] w-full max-w-5xl shadow-2xl overflow-hidden font-hanken rounded-none flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2b2a2a] flex items-center justify-between bg-[#0e0e0e]">
          <div className="flex items-center space-x-2.5">
            <Terminal className="h-4 w-4 text-[#4edea3]" />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-jetbrains text-sm font-bold text-[#ffffff] uppercase tracking-wider">
                  Payment Webhook Ingestion Console
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-jetbrains font-bold bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30 uppercase">
                  SIMULATION ENVIRONMENT
                </span>
              </div>
              <p className="text-[11px] text-[#8e9192] font-jetbrains mt-0.5">
                Dispatch deterministic payment failure payloads to test autonomous AI reasoning and boundary guardrails.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8e9192] hover:text-[#ffffff] hover:bg-[#1c1b1b] border border-transparent hover:border-[#2b2a2a] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content: Form (Left) & Live JSON Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-[#2b2a2a]">
          {/* Form (7 Cols) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 p-5 space-y-6 text-xs font-jetbrains">
            {/* GROUP 1: EVENT */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-1.5">
                <span className="text-[10px] font-bold text-[#4edea3] uppercase tracking-wider">
                  01 // EVENT HEADERS
                </span>
                <span className="text-[10px] text-[#8e9192]">RFC-7807 TELEMETRY</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Event Type</label>
                  <input
                    type="text"
                    readOnly
                    value="payment.failed"
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#4edea3] font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Webhook Event ID</label>
                  <input
                    type="text"
                    readOnly
                    value={simIds.eventId}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#8e9192] truncate focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* GROUP 2: TRANSACTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-1.5">
                <span className="text-[10px] font-bold text-[#ffffff] uppercase tracking-wider">
                  02 // TRANSACTION METRICS
                </span>
                <span className="text-[10px] text-[#8e9192]">ORDER VALUES</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Transaction ID</label>
                  <input
                    type="text"
                    readOnly
                    value={simIds.transactionId}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#c4c7c5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Order ID</label>
                  <input
                    type="text"
                    readOnly
                    value={simIds.orderId}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#c4c7c5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Amount (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    max="1000000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffffff] font-bold focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
              </div>
            </div>

            {/* GROUP 3: CUSTOMER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-1.5">
                <span className="text-[10px] font-bold text-[#ffffff] uppercase tracking-wider">
                  03 // CUSTOMER IDENTITY
                </span>
                <span className="text-[10px] text-[#8e9192]">BUYER ACCOUNT</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#c4c7c5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Customer Tier</label>
                  <select
                    value={customerTier}
                    onChange={(e) => setCustomerTier(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  >
                    <option value="REGULAR">REGULAR</option>
                    <option value="HIGH_VALUE">HIGH_VALUE</option>
                    <option value="NEW_USER">NEW_USER</option>
                  </select>
                </div>
              </div>
            </div>

            {/* GROUP 4: PAYMENT */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-1.5">
                <span className="text-[10px] font-bold text-[#ffffff] uppercase tracking-wider">
                  04 // PAYMENT INSTRUMENT & ROUTE
                </span>
                <span className="text-[10px] text-[#8e9192]">RAIL SETTINGS</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Payment Rail *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="SUBSCRIPTION_MANDATE">Subscription Auto-Debit Mandate</option>
                    <option value="NETBANKING">Corporate Netbanking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Merchant / Account *</label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
              </div>
            </div>

            {/* GROUP 5: FAILURE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-1.5">
                <span className="text-[10px] font-bold text-[#ffb4ab] uppercase tracking-wider">
                  05 // GATEWAY ERROR TELEMETRY
                </span>
                <span className="text-[10px] text-[#8e9192]">DOWNSTREAM CODE</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Failure Category *</label>
                  <select
                    value={failureCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as FailureCategory)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  >
                    <option value="SOFT_DECLINE_NETWORK">Network Timeout (Soft Decline)</option>
                    <option value="HARD_DECLINE_CARD_EXPIRED">Card Expired (Terminal Hard Decline)</option>
                    <option value="CHECKOUT_ABANDONED">Checkout Abandoned</option>
                    <option value="INSUFFICIENT_FUNDS">Insufficient Account Balance</option>
                    <option value="UPI_LIMIT_EXCEEDED">UPI Daily Limit Exceeded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Gateway Error Code</label>
                  <input
                    type="text"
                    required
                    value={gatewayErrorCode}
                    onChange={(e) => setGatewayErrorCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffb4ab] font-bold focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Gateway Error Reason</label>
                <input
                  type="text"
                  required
                  value={gatewayErrorMessage}
                  onChange={(e) => setGatewayErrorMessage(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#c4c7c5] focus:outline-none"
                />
              </div>
            </div>

            {/* GROUP 6: RECOVERY POLICY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-1.5">
                <span className="text-[10px] font-bold text-[#ffffff] uppercase tracking-wider">
                  06 // RECOVERY POLICY & BOUNDARIES
                </span>
                <span className="text-[10px] text-[#8e9192]">GOVERNANCE RULES</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Max Retry Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(parseInt(e.target.value) || 3)}
                    className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2b2a2a] text-[#ffffff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8e9192] text-[10px] uppercase mb-1">Guardrail Status</label>
                  <div className={`px-2.5 py-1.5 border text-[10px] font-bold uppercase flex items-center space-x-1 ${
                    isHighValue
                      ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]'
                      : 'bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3]'
                  }`}>
                    {isHighValue ? (
                      <>
                        <ShieldAlert className="h-3 w-3 shrink-0" />
                        <span>≥₹50k HUMAN GATE ENFORCED</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3 shrink-0" />
                        <span>AUTONOMOUS RECOVERY PERMITTED</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-[#2b2a2a] flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1c1b1b] hover:bg-[#2b2a2a] border border-[#2b2a2a] text-[#c4c7c5] hover:text-[#ffffff] uppercase tracking-wider text-[11px] font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#ffffff] hover:bg-[#e5e2e1] text-[#0e0e0e] font-bold uppercase tracking-wider text-[11px] transition cursor-pointer flex items-center space-x-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>INJECT WEBHOOK EVENT</span>
              </button>
            </div>
          </form>

          {/* Live JSON Preview (5 Cols) */}
          <div className="lg:col-span-5 bg-[#0e0e0e] p-5 flex flex-col justify-between font-jetbrains">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2b2a2a]">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-none bg-[#4edea3]"></span>
                  <span className="text-[11px] font-bold text-[#ffffff] uppercase tracking-wider">
                    LIVE WEBHOOK PAYLOAD
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-[#8e9192]">
                    {new Blob([jsonString]).size} B
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="p-1 bg-[#1c1b1b] hover:bg-[#2b2a2a] border border-[#2b2a2a] text-[#8e9192] hover:text-[#ffffff] transition cursor-pointer"
                    title="Copy JSON Payload"
                  >
                    {copiedJson ? <Check className="h-3 w-3 text-[#4edea3]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="mt-3 p-3 bg-[#141313] border border-[#2b2a2a] overflow-x-auto max-h-[500px]">
                <pre className="text-[10px] text-[#c4c7c5] leading-relaxed font-jetbrains">
                  {jsonString}
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2b2a2a] text-[10px] text-[#8e9192] flex items-center justify-between">
              <span>ENDPOINT: /api/webhooks/razorpay</span>
              <span className="text-[#4edea3]">TLS 1.3 ENCRYPTED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
