import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { PaymentRecord, GymSettings } from '../types';
import { formatCurrency } from '../utils/currencyUtils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  settings: GymSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  settings,
}) => {
  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white text-stone-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6 border border-stone-200">
        {/* Modal Top Bar (Screen Only) */}
        <div className="px-6 py-3.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Payment Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-500 hover:text-stone-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 space-y-6" id="printable-receipt">
          {/* Receipt Header */}
          <div className="text-center border-b border-stone-200 pb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-700 text-white font-black text-xl mb-2">
              BJJ
            </div>
            <h1 className="text-xl font-black tracking-tight text-stone-900">
              {settings.gymName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Official Membership & Tuition Receipt
            </p>
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Payment Verified & Completed</span>
            </div>
          </div>

          {/* Key Receipt Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-stone-500 block">Receipt Number:</span>
              <span className="font-mono font-bold text-stone-900">{payment.receiptNumber}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Date & Time:</span>
              <span className="font-bold text-stone-900">
                {payment.date} at {payment.time}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">Student Name:</span>
              <span className="font-bold text-stone-900 text-sm">{payment.memberName}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Payment Method:</span>
              <span className="font-bold text-stone-900">{payment.paymentMethod}</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Classes Credited</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="py-3 px-3">
                    <div className="font-bold text-stone-900">{payment.membershipPackage}</div>
                    {payment.notes && (
                      <div className="text-[11px] text-stone-500 mt-0.5">{payment.notes}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-stone-700">
                    {payment.classesCredited > 0 ? `+${payment.classesCredited}` : 'Unlimited'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-stone-900 text-sm">
                    {formatCurrency(payment.amount, payment.currency || settings.currencySymbol)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-stone-50 font-bold border-t border-stone-200">
                <tr>
                  <td colSpan={2} className="py-3 px-3 text-stone-700 text-right">
                    Total Paid:
                  </td>
                  <td className="py-3 px-3 text-right text-base text-stone-950 font-black">
                    {formatCurrency(payment.amount, payment.currency || settings.currencySymbol)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Receipt Footer */}
          <div className="text-center pt-2 border-t border-stone-200 text-stone-400 text-[11px] space-y-1">
            <p>Oss! Thank you for training with {settings.gymName}.</p>
            <p className="text-[10px]">Questions? Contact front desk or coach.</p>
          </div>
        </div>

        {/* Modal Close Button */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 text-right print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
