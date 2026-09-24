import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  CreditCard, 
  ClipboardList, 
  Calendar, 
  Phone, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  Edit3, 
  Save, 
  Award,
  Receipt,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  Sparkles
} from 'lucide-react';
import { Member, AttendanceRecord, PaymentRecord, BeltRank, StripeCount, ClassCategory } from '../types';
import { BeltBadge, getBeltsForAgeGroup } from '../utils/bjjBelts';
import { StudentPhotoModal } from './StudentPhotoModal';
import { compressAndResizeImage, STUDENT_AVATAR_PRESETS } from '../utils/imageUtils';
import { formatCurrency } from '../utils/currencyUtils';
import { 
  calculateStudentAge, 
  calculateIBJJFCompetitionAge,
  getIBJJFCategory, 
  getIBJJFDivisionLabel, 
  getIBJJFTransferMilestone,
  transitionBeltForNewAgeGroup 
} from '../utils/ibjjfAgeManager';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  attendance: AttendanceRecord[];
  payments: PaymentRecord[];
  initialTab?: 'attendance' | 'payments' | 'edit';
  onOpenPayment: (memberId: string) => void;
  onUpdateMember: (updated: Member) => void;
  onViewReceipt: (payment: PaymentRecord) => void;
  onDeleteMember?: (memberId: string) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  isOpen,
  onClose,
  member,
  attendance,
  payments,
  initialTab = 'attendance',
  onOpenPayment,
  onUpdateMember,
  onViewReceipt,
  onDeleteMember,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'payments' | 'edit'>('attendance');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editDobInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAgeGroup, setEditAgeGroup] = useState<ClassCategory>('Adults');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBelt, setEditBelt] = useState<BeltRank>('White');
  const [editStripes, setEditStripes] = useState<StripeCount>(0);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editClassesRemaining, setEditClassesRemaining] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editEmergencyRelation, setEditEmergencyRelation] = useState('');
  const [editLastPromotion, setEditLastPromotion] = useState('');
  const [editNextPromotion, setEditNextPromotion] = useState('');

  // Sync state when member changes
  React.useEffect(() => {
    if (member) {
      setEditFullName(member.fullName || '');
      setEditBirthDate(member.birthDate || '');
      setEditAgeGroup(member.ageGroup || 'Adults');
      setEditAvatar(member.avatar || '');
      setEditBelt(member.beltRank);
      setEditStripes(member.stripes);
      setEditPhone(member.phone);
      setEditEmail(member.email);
      setEditClassesRemaining(member.classesRemaining);
      setEditNotes(member.notes || '');
      setEditEmergencyName(member.emergencyContact?.name || '');
      setEditEmergencyPhone(member.emergencyContact?.phone || '');
      setEditEmergencyRelation(member.emergencyContact?.relation || '');
      setEditLastPromotion(member.lastPromotionDate || '');
      setEditNextPromotion(member.nextExpectedPromotionDate || '');
      setActiveTab(initialTab || 'attendance');
      setIsEditing(false);
    }
  }, [member, initialTab]);

  if (!isOpen || !member) return null;

  // Filter attendance & payments for this member
  const memberAttendance = attendance.filter((a) => a.memberId === member.id);
  const memberPayments = payments.filter((p) => p.memberId === member.id);
  const totalPaid = memberPayments.reduce((acc, p) => acc + p.amount, 0);

  const isUnlimited = member.membershipType === 'monthly_unlimited';
  const isZero = !isUnlimited && member.classesRemaining <= 0;
  const isLow = !isUnlimited && member.classesRemaining > 0 && member.classesRemaining <= 2;

  // Calculate IBJJF age details
  const todayStr = new Date().toISOString().split('T')[0];
  const computedAge = member.birthDate ? calculateStudentAge(member.birthDate, todayStr) : member.age;
  const milestone = member.birthDate ? getIBJJFTransferMilestone(member.birthDate, member.ageGroup, todayStr) : null;
  const divisionInfo = computedAge !== undefined ? getIBJJFDivisionLabel(computedAge) : null;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedNewAge = editBirthDate ? calculateStudentAge(editBirthDate, todayStr) : undefined;
    const updated: Member = {
      ...member,
      fullName: editFullName.trim() || member.fullName,
      birthDate: editBirthDate || undefined,
      age: calculatedNewAge ?? member.age,
      ageGroup: editAgeGroup,
      avatar: editAvatar.trim() || undefined,
      beltRank: editBelt,
      stripes: editStripes,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      classesRemaining: isUnlimited ? -1 : Number(editClassesRemaining),
      notes: editNotes.trim(),
      emergencyContact: {
        name: editEmergencyName.trim() || 'Not specified',
        phone: editEmergencyPhone.trim() || member.phone,
        relation: editEmergencyRelation.trim() || 'Emergency Contact',
      },
      lastPromotionDate: editLastPromotion || undefined,
      nextExpectedPromotionDate: editNextPromotion || undefined,
      status: !isUnlimited && Number(editClassesRemaining) <= 0 ? 'expired' : 'active',
    };
    onUpdateMember(updated);
    setActiveTab('attendance');
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl shadow-2xl text-stone-100 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80 shrink-0">
          <div className="flex items-center gap-3">
            {/* Clickable Student Photo / Avatar */}
            <div
              onClick={() => setIsPhotoModalOpen(true)}
              className="relative group/avatar cursor-pointer shrink-0"
              title="Click to add or change student picture"
            >
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.fullName}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-stone-700 group-hover/avatar:border-red-500 shadow-sm transition-all"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-stone-800 border-2 border-stone-700 group-hover/avatar:border-red-500 flex items-center justify-center text-amber-400 font-bold text-lg transition-all shadow-sm">
                  {member.fullName.charAt(0)}
                </div>
              )}
              {/* Camera Badge Overlay */}
              <div className="absolute -bottom-1 -right-1 bg-stone-900 border border-stone-700 p-1 rounded-full text-stone-300 group-hover/avatar:text-amber-400 group-hover/avatar:border-amber-400/80 shadow-md transition-all">
                <Camera className="w-3 h-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{member.fullName}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isZero
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : isLow
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {isZero ? 'Renewal Due' : isLow ? 'Low Classes' : 'Active'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                <span className="text-[11px] text-stone-400">• Joined {member.joinDate}</span>
                {member.lastPromotionDate && (
                  <span className="text-[11px] text-amber-400/90 font-medium">
                    • Promoted {member.lastPromotionDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPayment(member.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              + Renew / Pay
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Key Stat Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Classes Remaining */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                member.classesRemaining < 0
                  ? 'bg-red-950/40 border-red-800'
                  : isZero
                  ? 'bg-red-950/20 border-red-900/60'
                  : isLow
                  ? 'bg-amber-950/20 border-amber-900/60'
                  : 'bg-stone-950/60 border-stone-800'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Classes Remaining
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  {isUnlimited ? (
                    <span className="text-2xl font-black text-blue-400">Unlimited</span>
                  ) : member.classesRemaining < 0 ? (
                    <>
                      <span className="text-3xl font-black text-red-400">
                        -{Math.abs(member.classesRemaining)}
                      </span>
                      <span className="text-xs text-red-300 font-bold">
                        (Debt)
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        className={`text-3xl font-black ${
                          isZero
                            ? 'text-red-400'
                            : isLow
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {member.classesRemaining}
                      </span>
                      <span className="text-xs text-stone-400">
                        of {member.classesTotal} classes
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                <span className="text-stone-400">
                  {member.classesRemaining < 0 
                    ? 'Attendance debt to deduct' 
                    : isZero 
                    ? 'No classes left' 
                    : isLow 
                    ? 'Expiring soon' 
                    : 'Valid balance'}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenPayment(member.id)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                >
                  + Add Classes
                </button>
              </div>
            </div>

            {/* Card 2: Attendance Total */}
            <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Total Attended
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-white">
                    {member.totalClassesAttended}
                  </span>
                  <span className="text-xs text-stone-400">classes on mat</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-800/80 text-xs text-stone-400 truncate">
                Last mat: {member.lastAttendedDate || 'None yet'}
              </div>
            </div>

            {/* Card 3: Total Paid & Plan */}
            <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Total Tuition Paid
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-emerald-400">
                    ${totalPaid.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-400">
                    ({memberPayments.length} payments)
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-800/80 text-xs text-stone-400 truncate">
                Expires: {member.membershipEndDate}
              </div>
            </div>
          </div>

          {/* Quick Contact & Emergency Strip */}
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-semibold">Phone</span>
              <span className="font-semibold text-stone-200">{member.phone}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-semibold">Email</span>
              <span className="font-semibold text-stone-200 truncate block">{member.email}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                Emergency Contact
              </span>
              <span className="font-bold text-white block truncate">
                {member.emergencyContact.name}{' '}
                <span className="text-stone-300 font-normal">({member.emergencyContact.phone})</span>
              </span>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-300 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/70">
                <span className="text-stone-400 font-normal">Relation:</span>
                <span>{member.emergencyContact.relation || 'Emergency Contact'}</span>
              </div>
            </div>
          </div>

          {/* IBJJF Age Division & Automatic Transfer Status Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  IBJJF Category & Age Progression
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-stone-300 font-semibold">
                  {member.ageGroup} Division
                </span>
                {computedAge !== undefined && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/80 text-amber-300 font-bold">
                    Age {computedAge}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-950/80 p-3 rounded-lg border border-stone-800/90">
              <div>
                <span className="text-[10px] uppercase font-semibold text-stone-400 block">Date of Birth & Division</span>
                <p className="font-bold text-stone-200 mt-0.5">
                  {member.birthDate ? `${member.birthDate} (${computedAge} yrs)` : 'No DOB recorded'}
                </p>
                {divisionInfo && (
                  <p className="text-[11px] text-amber-300/90 font-medium mt-0.5">
                    {divisionInfo.divisionName} • {divisionInfo.subGroup}
                  </p>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-stone-400 block">Next Category Milestone</span>
                {milestone ? (
                  <div>
                    <p className={`font-bold mt-0.5 ${milestone.isEligibleForNext ? 'text-emerald-400' : 'text-stone-200'}`}>
                      {milestone.isEligibleForNext 
                        ? `Ready for ${milestone.nextCategory} Division!` 
                        : milestone.nextCategory 
                        ? `Transfer to ${milestone.nextCategory} in ${milestone.daysRemaining} days` 
                        : 'Senior Adult Division'}
                    </p>
                    {milestone.transferDate && !milestone.isEligibleForNext && (
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Target graduation date: {milestone.transferDate}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-stone-400 mt-0.5">Add date of birth in Edit tab to enable auto-tracking.</p>
                )}
              </div>
            </div>

            {/* Check if student is overdue for automatic transfer */}
            {computedAge !== undefined && ((member.ageGroup === 'Kids' && computedAge >= 16) || (member.ageGroup === 'Teens' && computedAge >= 18)) && (
              <div className="p-3 bg-amber-950/50 border border-amber-800/80 rounded-lg flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-200 font-semibold">
                    Student has reached age {computedAge} and is ready to transfer from <strong>{member.ageGroup}</strong> to <strong>{getIBJJFCategory(computedAge)}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const targetCategory = getIBJJFCategory(computedAge);
                    const { newBelt, wasConverted } = transitionBeltForNewAgeGroup(member.beltRank, targetCategory);
                    const updated: Member = {
                      ...member,
                      ageGroup: targetCategory,
                      beltRank: newBelt,
                      notes: `${member.notes ? member.notes + ' | ' : ''}Auto-transferred to ${targetCategory} (Age ${computedAge})${wasConverted ? ` with belt update to ${newBelt}` : ''}.`,
                    };
                    onUpdateMember(updated);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-lg transition-colors shadow-xs"
                >
                  ⚡ Execute Category Transfer Now
                </button>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-stone-800 flex space-x-4">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`pb-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'attendance'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-red-400" />
              <span>Attendance History ({memberAttendance.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Payment & Receipt History ({memberPayments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`pb-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Edit Info & Promotion</span>
            </button>
          </div>

          {/* Tab 1: Attendance History */}
          {activeTab === 'attendance' && (
            <div className="space-y-3">
              {/* Frequency Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total Attended</span>
                  <span className="text-base font-black text-white">{memberAttendance.length} classes</span>
                </div>
                <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold block">Kids Class</span>
                  <span className="text-base font-black text-amber-400">
                    {memberAttendance.filter((a) => a.classCategory === 'Kids' || a.className.toLowerCase().includes('kid')).length}x
                  </span>
                </div>
                <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                  <span className="text-[10px] text-blue-400 uppercase font-semibold block">Teens Class</span>
                  <span className="text-base font-black text-blue-400">
                    {memberAttendance.filter((a) => a.classCategory === 'Teens' || a.className.toLowerCase().includes('teen')).length}x
                  </span>
                </div>
                <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                  <span className="text-[10px] text-red-400 uppercase font-semibold block">Adults Class</span>
                  <span className="text-base font-black text-red-400">
                    {memberAttendance.filter((a) => (!a.classCategory || a.classCategory === 'Adults') && !a.className.toLowerCase().includes('kid') && !a.className.toLowerCase().includes('teen')).length}x
                  </span>
                </div>
              </div>

              {memberAttendance.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  No attendance records logged for this student yet.
                </div>
              ) : (
                <div className="border border-stone-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Class Session</th>
                        <th className="py-2.5 px-3">Coach</th>
                        <th className="py-2.5 px-3">Classes Balance After</th>
                        <th className="py-2.5 px-3">Coach Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {memberAttendance.map((rec) => (
                        <tr key={rec.id} className="hover:bg-stone-800/40">
                          <td className="py-2.5 px-3 font-medium text-white">
                            {rec.date} <span className="text-stone-400 font-normal">at {rec.time}</span>
                          </td>
                          <td className="py-2.5 px-3 text-stone-200 font-semibold">
                            {rec.className}
                          </td>
                          <td className="py-2.5 px-3 text-stone-400">{rec.coach}</td>
                          <td className="py-2.5 px-3">
                            {rec.classesRemainingAfter === -1 ? (
                              <span className="text-blue-400 font-bold">Unlimited</span>
                            ) : (
                              <span
                                className={`font-bold ${
                                  rec.classesRemainingAfter <= 1
                                    ? 'text-red-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {rec.classesRemainingAfter} classes left
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-stone-400 text-[11px]">
                            {rec.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Payments History */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  Every payment recorded for this student. Click receipt to view or print.
                </span>
                <button
                  type="button"
                  onClick={() => onOpenPayment(member.id)}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Record Payment</span>
                </button>
              </div>

              {memberPayments.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  No payment records found for this student.
                </div>
              ) : (
                <div className="border border-stone-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Payment Date</th>
                        <th className="py-2.5 px-3">Package / Items</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Classes Credited</th>
                        <th className="py-2.5 px-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {memberPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-stone-800/40">
                          <td className="py-2.5 px-3 text-white font-medium">
                            {pay.date} <span className="text-stone-400 text-[11px]">({pay.time})</span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-stone-200">
                            {pay.membershipPackage}
                          </td>
                          <td className="py-2.5 px-3 text-stone-400">{pay.paymentMethod}</td>
                          <td className="py-2.5 px-3 font-black text-emerald-400 text-sm">
                            {formatCurrency(pay.amount, pay.currency || 'JOD')}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-stone-300">
                            {pay.classesCredited > 0 ? `+${pay.classesCredited} classes` : 'Unlimited'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onViewReceipt(pay)}
                              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-[11px] inline-flex items-center gap-1 border border-stone-700 transition-colors"
                            >
                              <Receipt className="w-3 h-3 text-emerald-400" />
                              <span>{pay.receiptNumber}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Edit Student Info & Promotion */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Student Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-200 mb-1">
                    Student Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. Renzo Gracie"
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                  />
                </div>

                {/* Date of Birth & Age */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Date of Birth</span>
                    </span>
                    {editBirthDate && (
                      <span className="text-[10px] text-amber-300 font-semibold">
                        Age: {calculateStudentAge(editBirthDate, todayStr)} yrs
                      </span>
                    )}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      ref={editDobInputRef}
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => {
                        const newDob = e.target.value;
                        setEditBirthDate(newDob);
                        if (newDob) {
                          const compAge = calculateIBJJFCompetitionAge(newDob);
                          const chronoAge = calculateStudentAge(newDob, todayStr);
                          const effectiveAge = compAge > 0 ? compAge : chronoAge;
                          const calculatedCategory = getIBJJFCategory(effectiveAge);
                          setEditAgeGroup(calculatedCategory);
                          const allowed = getBeltsForAgeGroup(calculatedCategory);
                          if (!allowed.includes(editBelt)) {
                            setEditBelt(allowed[0]);
                          }
                        }
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          (editDobInputRef.current as any)?.showPicker();
                        } catch {
                          editDobInputRef.current?.focus();
                        }
                      }}
                      className="absolute right-2 p-1 text-amber-400 hover:text-amber-300 hover:bg-stone-800 rounded transition-colors"
                      title="Open Calendar Picker"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                  {editBirthDate && (
                    <p className="text-[10px] text-amber-300/80 mt-1">
                      IBJJF Division: {getIBJJFDivisionLabel(calculateStudentAge(editBirthDate, todayStr)).divisionName} ({getIBJJFDivisionLabel(calculateStudentAge(editBirthDate, todayStr)).subGroup})
                    </p>
                  )}
                </div>

                {/* Program / Age Group */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Class Program / Age Category
                  </label>
                  <select
                    value={editAgeGroup}
                    onChange={(e) => {
                      const newAge = e.target.value as ClassCategory;
                      setEditAgeGroup(newAge);
                      const allowed = getBeltsForAgeGroup(newAge);
                      if (!allowed.includes(editBelt)) {
                        setEditBelt(allowed[0]);
                      }
                    }}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-semibold"
                  >
                    <option value="Kids">Kids Class (Ages 4-15 • IBJJF Youth Belts)</option>
                    <option value="Teens">Teens Class (Ages 16-17 • White, Blue, Purple)</option>
                    <option value="Adults">Adults Class (Ages 18+ • White through Black)</option>
                  </select>
                  <p className="text-[10px] text-stone-400 mt-1">
                    {editAgeGroup === 'Kids' && 'Youth under 16 remain in Kids until age 16.'}
                    {editAgeGroup === 'Teens' && 'Teens automatically transfer to Adults at 18.'}
                    {editAgeGroup === 'Adults' && 'Adults division (Ages 18+).'}
                  </p>
                </div>

                {/* Belt Promotion */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    BJJ Belt Rank ({editAgeGroup} Permitted Ranks)
                  </label>
                  <select
                    value={editBelt}
                    onChange={(e) => setEditBelt(e.target.value as BeltRank)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-semibold"
                  >
                    {getBeltsForAgeGroup(editAgeGroup).map((b) => (
                      <option key={b} value={b}>
                        {b} Belt {editAgeGroup === 'Kids' && b !== 'White' ? '(Youth System)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student Photo Section */}
                <div className="sm:col-span-2 p-3.5 bg-stone-950/60 rounded-xl border border-stone-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Student Picture</span>
                    </label>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar('')}
                        className="text-[11px] text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Thumbnail preview */}
                    <div className="relative shrink-0">
                      {editAvatar ? (
                        <img
                          src={editAvatar}
                          alt={member.fullName}
                          className="w-14 h-14 rounded-xl object-cover border border-stone-700 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 font-bold text-base shadow-xs">
                          {member.fullName.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={editFileInputRef}
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressAndResizeImage(file, 360, 360, 0.85);
                                setEditAvatar(compressed);
                              } catch (err: any) {
                                alert(err?.message || 'Error processing image file');
                              }
                            }
                            e.target.value = '';
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-stone-700 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5 text-red-400" />
                          <span>Upload File</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsPhotoModalOpen(true)}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-stone-700 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Photo Studio & Presets</span>
                        </button>
                      </div>

                      <input
                        type="url"
                        placeholder="Or paste direct image URL (https://...)"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Stripes */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Stripes (Degrees)
                  </label>
                  <select
                    value={editStripes}
                    onChange={(e) => setEditStripes(Number(e.target.value) as StripeCount)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
                  >
                    <option value={0}>0 Stripes</option>
                    <option value={1}>1 Stripe</option>
                    <option value={2}>2 Stripes</option>
                    <option value={3}>3 Stripes</option>
                    <option value={4}>4 Stripes</option>
                  </select>
                </div>

                {/* Promotion Milestones */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Last Promotion Date
                  </label>
                  <input
                    type="date"
                    value={editLastPromotion}
                    onChange={(e) => setEditLastPromotion(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Expected Next Promotion Date
                  </label>
                  <input
                    type="date"
                    value={editNextPromotion}
                    onChange={(e) => setEditNextPromotion(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
                  />
                </div>

                {/* Manual Class Balance Adjustment */}
                {!isUnlimited && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Classes Remaining Balance (Manual Adjust)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editClassesRemaining}
                      onChange={(e) => setEditClassesRemaining(Number(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2 bg-stone-950/70 p-3.5 rounded-xl border border-stone-800">
                  <label className="block text-xs font-semibold text-stone-200 mb-2 flex items-center justify-between">
                    <span>Emergency Contact & Relationship</span>
                    <span className="text-[11px] text-amber-400 font-normal">Who is this contact to the student?</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-semibold mb-1">
                        Contact Name
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Maria Rivera"
                        value={editEmergencyName}
                        onChange={(e) => setEditEmergencyName(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-semibold mb-1">
                        Contact Phone
                      </span>
                      <input
                        type="tel"
                        placeholder="(555) 234-8902"
                        value={editEmergencyPhone}
                        onChange={(e) => setEditEmergencyPhone(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 uppercase font-semibold mb-1">
                        Relationship to Student
                      </span>
                      <input
                        type="text"
                        list="emergency-relation-options"
                        placeholder="e.g. Spouse, Parent, Mother, Father"
                        value={editEmergencyRelation}
                        onChange={(e) => setEditEmergencyRelation(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                      <datalist id="emergency-relation-options">
                        <option value="Spouse" />
                        <option value="Mother" />
                        <option value="Father" />
                        <option value="Parent" />
                        <option value="Guardian" />
                        <option value="Sibling" />
                        <option value="Brother" />
                        <option value="Sister" />
                        <option value="Friend" />
                        <option value="Partner" />
                      </datalist>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Notes & Medical
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                {onDeleteMember && (
                  <button
                    type="button"
                    onClick={() => {
                      const confirmDelete = window.confirm(
                        `Are you sure you want to delete / archive the student "${member.fullName}"?\n\nThey will be removed from lists and rosters, but their past attendance logs and payment ledger history will remain intact for future reference.`
                      );
                      if (confirmDelete) {
                        onDeleteMember(member.id);
                        onClose();
                      }
                    }}
                    className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-800/60 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Archive / Delete Student</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm ml-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Student Photo Modal */}
      <StudentPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        member={member}
        onSavePhoto={(memberId, newPhoto) => {
          const updated: Member = {
            ...member,
            avatar: newPhoto,
          };
          onUpdateMember(updated);
          setEditAvatar(newPhoto || '');
        }}
      />
    </div>
  );
};
