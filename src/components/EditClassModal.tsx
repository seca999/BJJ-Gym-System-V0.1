import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Trash2, 
  Save, 
  Plus, 
  Check, 
  Shield, 
  Sparkles,
  MapPin,
  Tag,
  Phone,
  Mail,
  UserCheck,
  AlertTriangle,
  Info,
  Search,
  BookOpen,
  ArrowLeft,
  Edit3,
  Layers,
  Award,
  Users,
  Copy,
  Zap
} from 'lucide-react';
import { ClassSession, ClassCategory, Coach, ClassCoachContact } from '../types';
import { MouseTimeRangePicker } from './MouseTimeRangePicker';
import { parseTimeRange, calculateDurationMinutes, formatTimeRange } from '../utils/timeUtils';

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes?: ClassSession[];
  classSession: ClassSession | null; // null if opened to manage/add classes
  coaches: Coach[];
  onSaveClass: (savedClass: ClassSession) => void;
  onDeleteClass?: (classId: string) => void;
}

const DAYS_OF_WEEK = [
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' },
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
];

const CLASS_TYPES = [
  'Gi',
  'No-Gi',
  'Wrestling',
  'Morning',
  'Fundamentals',
  'Kids',
  'Open Mat',
  'Competition Sparring',
];

export const EditClassModal: React.FC<EditClassModalProps> = ({
  isOpen,
  onClose,
  classes = [],
  classSession,
  coaches,
  onSaveClass,
  onDeleteClass,
}) => {
  // Navigation inside the modal: 'list' (all classes directory) or 'form' (add / edit form)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassSession | null>(null);

  // Search & Filter in list view
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ClassCategory>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ClassCategory>('Adults');
  const [type, setType] = useState<string>('Gi');
  
  // Head Coach state
  const [headCoachId, setHeadCoachId] = useState<string>('');
  const [headCoachName, setHeadCoachName] = useState<string>('');
  const [headCoachRank, setHeadCoachRank] = useState<string>('');
  const [headCoachPhone, setHeadCoachPhone] = useState<string>('');
  const [headCoachEmail, setHeadCoachEmail] = useState<string>('');

  // Assistant Coaches state
  const [assistantCoachIds, setAssistantCoachIds] = useState<string[]>([]);
  const [assistantCoachesList, setAssistantCoachesList] = useState<ClassCoachContact[]>([]);

  // Schedule & location
  const [selectedDays, setSelectedDays] = useState<string[]>(['Sat', 'Mon', 'Wed']);
  const [timeSummary, setTimeSummary] = useState('');
  const [room, setRoom] = useState('Main Dojo Mat A');
  const [durationMinutes, setDurationMinutes] = useState(75);
  const [description, setDescription] = useState('');
  const [daySchedules, setDaySchedules] = useState<{ [day: string]: string }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to load session into form
  const loadSessionIntoForm = (session: ClassSession | null) => {
    setEditingSession(session);
    if (session) {
      setTitle(session.title);
      setCategory(session.category);
      setType(session.type);
      
      const defaultHead = coaches.find(c => c.id === session.headCoachId && !c.isDeleted) || coaches.find(c => !c.isDeleted);
      setHeadCoachId(session.headCoachId || defaultHead?.id || '');
      setHeadCoachName(session.headCoachName || defaultHead?.fullName || (session.coach ? session.coach.replace(' (Head Coach)', '') : ''));
      setHeadCoachRank(session.headCoachRank || (defaultHead ? `${defaultHead.beltRank} Belt` : ''));
      setHeadCoachPhone(session.headCoachPhone || defaultHead?.phone || '');
      setHeadCoachEmail(session.headCoachEmail || defaultHead?.email || '');

      setAssistantCoachIds(session.assistantCoachIds || []);
      setAssistantCoachesList(session.assistantCoaches || []);

      setSelectedDays(session.daysOfWeek || ['Sat', 'Mon', 'Wed']);
      setTimeSummary(session.time || '07:00 PM - 08:30 PM');
      setRoom(session.room || 'Main Dojo Mat A');
      setDurationMinutes(session.durationMinutes || 75);
      setDescription(session.description || '');
      setDaySchedules(session.daySchedule ? { ...session.daySchedule } as any : {});
    } else {
      // Default for brand new class
      setTitle('');
      setCategory('Adults');
      setType('Gi');
      
      const activeCoaches = coaches.filter(c => !c.isDeleted);
      const defaultHead = activeCoaches[0];
      setHeadCoachId(defaultHead?.id || '');
      setHeadCoachName(defaultHead?.fullName || '');
      setHeadCoachRank(defaultHead ? `${defaultHead.beltRank} Belt` : '');
      setHeadCoachPhone(defaultHead?.phone || '');
      setHeadCoachEmail(defaultHead?.email || '');

      setAssistantCoachIds([]);
      setAssistantCoachesList([]);

      setSelectedDays(['Sat', 'Mon', 'Wed']);
      setTimeSummary('07:00 PM - 08:30 PM');
      setRoom('Main Dojo Mat A');
      setDurationMinutes(75);
      setDescription('');
      setDaySchedules({
        Saturday: '12:00 PM - 01:30 PM',
        Monday: '07:00 PM - 08:30 PM',
        Wednesday: '07:00 PM - 08:30 PM',
      });
    }
  };

  // Reset or load data when modal opens or session changes
  useEffect(() => {
    if (isOpen) {
      if (classSession) {
        // If a specific class was requested to edit (e.g. from its card's pencil icon)
        loadSessionIntoForm(classSession);
        setViewMode('form');
      } else {
        // Opened from main "+ Add Class / Manage Classes" button -> show all classes list
        loadSessionIntoForm(null);
        setViewMode('list');
      }
      setSearchQuery('');
      setCategoryFilter('ALL');
    }
  }, [classSession, isOpen]);

  if (!isOpen) return null;

  const handleHeadCoachSelect = (coachId: string) => {
    setHeadCoachId(coachId);
    const found = coaches.find(c => c.id === coachId && !c.isDeleted);
    if (found) {
      setHeadCoachName(found.fullName);
      setHeadCoachRank(`${found.beltRank} Belt${found.stripes ? ` (${found.stripes} Degrees)` : ''}`);
      setHeadCoachPhone(found.phone || '');
      setHeadCoachEmail(found.email || '');

      // Remove from assistants if previously selected
      if (assistantCoachIds.includes(coachId)) {
        setAssistantCoachIds(prev => prev.filter(id => id !== coachId));
        setAssistantCoachesList(prev => prev.filter(a => a.id !== coachId));
      }
    } else {
      setHeadCoachName('');
      setHeadCoachRank('');
      setHeadCoachPhone('');
      setHeadCoachEmail('');
    }
  };

  const toggleAssistantCoach = (coachObj: Coach) => {
    if (assistantCoachIds.includes(coachObj.id)) {
      setAssistantCoachIds(prev => prev.filter(id => id !== coachObj.id));
      setAssistantCoachesList(prev => prev.filter(a => a.id !== coachObj.id));
    } else {
      setAssistantCoachIds(prev => [...prev, coachObj.id]);
      setAssistantCoachesList(prev => [
        ...prev,
        {
          id: coachObj.id,
          fullName: coachObj.fullName,
          role: 'Assistant Coach',
          rank: `${coachObj.beltRank} Belt${coachObj.stripes ? ` (${coachObj.stripes} Deg)` : ''}`,
          phone: coachObj.phone,
          email: coachObj.email,
          avatar: coachObj.avatar,
        }
      ]);
    }
  };

  const toggleDay = (dayShort: string, dayFull: string) => {
    if (selectedDays.includes(dayShort)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayShort));
      const updated = { ...daySchedules };
      delete updated[dayFull];
      setDaySchedules(updated);
    } else {
      setSelectedDays([...selectedDays, dayShort]);
      setDaySchedules({
        ...daySchedules,
        [dayFull]: timeSummary || '07:00 PM - 08:30 PM',
      });
    }
  };

  const handlePrimaryTimeChange = (newRange: string, newDuration: number) => {
    setTimeSummary(newRange);
    setDurationMinutes(newDuration);
    // Update all existing day schedules to this new range if they matched old timeSummary
    const updatedSchedules = { ...daySchedules };
    selectedDays.forEach((dShort) => {
      const dFull = DAYS_OF_WEEK.find((d) => d.short === dShort)?.full || dShort;
      updatedSchedules[dFull] = newRange;
    });
    setDaySchedules(updatedSchedules);
  };

  const handleDayTimeChange = (dayFull: string, newRange: string, newDuration?: number) => {
    setDaySchedules((prev) => ({
      ...prev,
      [dayFull]: newRange,
    }));
    if (newDuration) {
      setDurationMinutes(newDuration);
    }
  };

  const handleApplyTimeToAllDays = (sourceRange: string) => {
    const { duration: dur } = parseTimeRange(sourceRange);
    setTimeSummary(sourceRange);
    setDurationMinutes(dur);

    const updated: { [day: string]: string } = {};
    selectedDays.forEach((dShort) => {
      const dFull = DAYS_OF_WEEK.find((d) => d.short === dShort)?.full || dShort;
      updated[dFull] = sourceRange;
    });
    setDaySchedules(updated);
    showToast(`Applied ${sourceRange} to all selected days!`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a class title.');
      return;
    }
    if (selectedDays.length === 0) {
      alert('Please select at least one training day of the week.');
      return;
    }

    const primaryCoachName = headCoachName ? `${headCoachName} (Head Coach)` : 'Unassigned Coach';

    const savedClass: ClassSession = {
      id: editingSession?.id || `cls-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      category,
      type,
      coach: primaryCoachName,
      headCoachId: headCoachId || undefined,
      headCoachName: headCoachName.trim() || undefined,
      headCoachRank: headCoachRank.trim() || undefined,
      headCoachPhone: headCoachPhone.trim() || undefined,
      headCoachEmail: headCoachEmail.trim() || undefined,
      assistantCoachIds,
      assistantCoaches: assistantCoachesList,
      time: timeSummary.trim() || 'Schedule per day',
      daysOfWeek: selectedDays,
      daySchedule: daySchedules,
      durationMinutes,
      room: room.trim(),
      description: description.trim(),
      eligibleAgeMin: category === 'Kids' ? 4 : category === 'Teens' ? 16 : 18,
      eligibleAgeMax: category === 'Kids' ? 15 : category === 'Teens' ? 17 : undefined,
    };

    onSaveClass(savedClass);
    showToast(`Saved "${savedClass.title}" successfully!`);

    // Switch back to list view so user can review the updated classes directory
    setViewMode('list');
    setEditingSession(null);
  };

  // Helper for badge color by class type
  const getClassTypeColor = (tStr: string) => {
    const t = tStr.toLowerCase();
    if (t.includes('wrestl')) return 'bg-amber-950 text-amber-300 border-amber-800/90';
    if (t.includes('morning')) return 'bg-sky-950 text-sky-300 border-sky-800/90';
    if (t.includes('no-gi')) return 'bg-purple-950 text-purple-300 border-purple-800/90';
    if (t.includes('sparring') || t.includes('comp')) return 'bg-red-950 text-red-300 border-red-800/90';
    if (t.includes('kids')) return 'bg-emerald-950 text-emerald-300 border-emerald-800/90';
    return 'bg-stone-800 text-stone-200 border-stone-700';
  };

  // Filter classes for list view
  const filteredClasses = classes.filter((c) => {
    if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.coach && c.coach.toLowerCase().includes(q)) ||
      (c.type && c.type.toLowerCase().includes(q)) ||
      (c.room && c.room.toLowerCase().includes(q)) ||
      (c.daysOfWeek && c.daysOfWeek.some((d) => d.toLowerCase().includes(q)))
    );
  });

  const adultsCount = classes.filter((c) => c.category === 'Adults').length;
  const kidsCount = classes.filter((c) => c.category === 'Kids').length;
  const teensCount = classes.filter((c) => c.category === 'Teens').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3">
            {viewMode === 'form' ? (
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  setEditingSession(null);
                }}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Back to Classes Directory"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                <BookOpen className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>
                  {viewMode === 'list'
                    ? `Academy Classes Directory (${classes.length})`
                    : editingSession
                    ? `Edit Class: ${editingSession.title}`
                    : 'Create New Academy Class'}
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                {viewMode === 'list'
                  ? 'Official academy classes. Editable here and assignable on the Matboard.'
                  : 'Configure schedule, coaches, and age restrictions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'list' && (
              <button
                type="button"
                onClick={() => {
                  loadSessionIntoForm(null);
                  setViewMode('form');
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Class</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VIEW MODE 1: ALL CLASSES DIRECTORY (LIST & ACTIONS) */}
        {viewMode === 'list' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search & Filter Tabs */}
            <div className="p-4 border-b border-stone-800 bg-stone-900/90 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search classes by name, coach, style, room, or day..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-800/90 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-400 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    categoryFilter === 'ALL'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  All ({classes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('Adults')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    categoryFilter === 'Adults'
                      ? 'bg-stone-800 text-amber-300 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Adults ({adultsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('Kids')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    categoryFilter === 'Kids'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Kids ({kidsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('Teens')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    categoryFilter === 'Teens'
                      ? 'bg-blue-950 text-blue-300 border border-blue-700 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Teens ({teensCount})
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              {filteredClasses.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-stone-950/60 border border-dashed border-stone-800">
                  <Calendar className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">No classes found</h4>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No academy classes match your search query.'
                      : 'No classes have been added yet. Click "+ Add Class" above to create your first class.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      loadSessionIntoForm(null);
                      setViewMode('form');
                    }}
                    className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Class Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredClasses.map((cls) => {
                    const scheduledDays = cls.daysOfWeek || [];

                    return (
                      <div
                        key={cls.id}
                        className="bg-stone-850 border border-stone-750 hover:border-stone-600 rounded-2xl p-4 transition-all shadow-sm flex flex-col justify-between group"
                      >
                        <div>
                          {/* Badges & Actions */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getClassTypeColor(
                                  cls.type
                                )}`}
                              >
                                {cls.type}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  cls.category === 'Kids'
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                    : cls.category === 'Teens'
                                    ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                                    : 'bg-stone-900 text-amber-300 border-amber-600/60'
                                }`}
                              >
                                {cls.category}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  loadSessionIntoForm(cls);
                                  setViewMode('form');
                                }}
                                className="p-1.5 text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border border-stone-700"
                                title="Edit this class"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteClass && (
                                <button
                                  type="button"
                                  onClick={() => setClassToDelete(cls)}
                                  className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-950/40 bg-stone-800 rounded-lg transition-colors border border-stone-700 hover:border-red-700/60 cursor-pointer"
                                  title="Delete this class from academy"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <h3 className="text-sm sm:text-base font-black text-white group-hover:text-red-400 transition-colors">
                            {cls.title}
                          </h3>

                          {/* Coach details */}
                          <div className="mt-2 space-y-1 text-xs text-stone-300">
                            <div className="flex items-center gap-1.5 text-stone-400">
                              <Award className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span>
                                Head Coach:{' '}
                                <strong className="text-white">
                                  {cls.headCoachName || cls.coach.replace(' (Head Coach)', '')}
                                </strong>
                              </span>
                            </div>

                            {cls.assistantCoaches && cls.assistantCoaches.length > 0 && (
                              <div className="flex items-center gap-1.5 text-stone-400 text-[11px]">
                                <Users className="w-3 h-3 text-blue-400 shrink-0" />
                                <span>Assistants: {cls.assistantCoaches.map((a) => a.fullName).join(', ')}</span>
                              </div>
                            )}

                            {cls.room && (
                              <div className="flex items-center gap-1.5 text-stone-400">
                                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{cls.room}</span>
                              </div>
                            )}
                          </div>

                          {/* Scheduled Days & Times */}
                          <div className="mt-3 pt-2.5 border-t border-stone-800">
                            <span className="text-[11px] font-bold text-stone-400 block mb-1">
                              Scheduled Days & Times:
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {scheduledDays.map((d) => {
                                const fullDay = DAYS_OF_WEEK.find((dw) => dw.short.toLowerCase() === d.toLowerCase())?.full;
                                const specificTime =
                                  (cls.daySchedule && fullDay && cls.daySchedule[fullDay]) ||
                                  (cls.daySchedule && cls.daySchedule[d]) ||
                                  cls.time;

                                return (
                                  <span
                                    key={d}
                                    className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-750 text-[11px] text-stone-300"
                                    title={`${d}: ${specificTime}`}
                                  >
                                    <strong className="text-amber-400 font-mono-digits">{d}</strong>
                                    {specificTime ? ` • ${specificTime}` : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
                          <span className="text-[11px] text-stone-400">
                            Duration: {cls.durationMinutes || 75} mins
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              loadSessionIntoForm(cls);
                              setViewMode('form');
                            }}
                            className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Class</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* List Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between">
              <span className="text-xs text-stone-400">
                Total Classes in Academy: <strong className="text-white">{classes.length}</strong>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* VIEW MODE 2: EDIT OR CREATE CLASS FORM */}
        {viewMode === 'form' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
            {/* Section 1: Basic Info & Strict Age Category */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-red-400" />
                <span>1. Class Info & Student Eligibility</span>
              </h3>

              {/* Class Title */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Class Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Kids BJJ Class or Adults BJJ (Gi & Sparring)"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white placeholder-stone-500 focus:outline-hidden focus:border-red-500 font-medium"
                />
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Target Student Division <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ClassCategory)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-red-500 font-bold"
                  >
                    <option value="Kids">Kids Division (Ages 4-15 • Strict IBJJF Youth Belts)</option>
                    <option value="Teens">Teens Division (Ages 16-17 • White, Blue, Purple)</option>
                    <option value="Adults">Adults Division (Ages 18+ • Full Ranks)</option>
                    <option value="All Levels">All Levels (Open Mat Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Class Focus / Style
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-red-500"
                  >
                    {CLASS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Age & Belt restriction banner */}
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                category === 'Kids' 
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-200' 
                  : category === 'Teens'
                  ? 'bg-blue-950/40 border-blue-800/80 text-blue-200'
                  : 'bg-stone-950/80 border-stone-800 text-stone-300'
              }`}>
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="text-[11px] leading-relaxed">
                  {category === 'Kids' && (
                    <p>
                      <strong className="text-amber-300">Strict IBJJF Youth Enforcement:</strong> Kids classes only admit youth students holding IBJJF Youth Belts (White, Grey, Yellow, Orange, Green). Adults, Teens, and Adult Belts are strictly blocked from check-in.
                    </p>
                  )}
                  {category === 'Teens' && (
                    <p>
                      <strong className="text-blue-300">Teens / Juvenile Enforcement:</strong> Reserved for students ages 16-17 holding White, Blue, or Purple belts. Adult and Kids students cannot be enrolled in Teens sparring.
                    </p>
                  )}
                  {category === 'Adults' && (
                    <p>
                      <strong className="text-stone-200">Adult Ranks (18+):</strong> White through Black Belt adult division. Minimum age is 18 years old.
                    </p>
                  )}
                  {category === 'All Levels' && (
                    <p>
                      <strong className="text-stone-200">Open Academy Mat:</strong> Open to all eligible students and academy guests with active mat passes.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Head Coach & Coaching Staff */}
            <div className="space-y-3 pt-3 border-t border-stone-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Coaching Staff & Instructor Contacts</span>
              </h3>

              {/* Head Coach Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Primary Head Coach <span className="text-red-400">*</span>
                </label>
                <select
                  value={headCoachId}
                  onChange={(e) => handleHeadCoachSelect(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-red-500 font-semibold"
                >
                  <option value="">{coaches.filter((c) => !c.isDeleted).length === 0 ? '-- No Coaches in Database (Add in Coaches section) --' : '-- Choose Head Coach --'}</option>
                  {coaches.filter((c) => !c.isDeleted).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} — {c.beltRank} Belt {c.stripes ? `(${c.stripes} Stripes)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Head Coach Direct Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>Head Coach Phone</span>
                  </label>
                  <input
                    type="text"
                    value={headCoachPhone}
                    onChange={(e) => setHeadCoachPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-sky-400" />
                    <span>Head Coach Email</span>
                  </label>
                  <input
                    type="email"
                    value={headCoachEmail}
                    onChange={(e) => setHeadCoachEmail(e.target.value)}
                    placeholder="coach@artesuave.bjj"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
              </div>

              {/* Assistant Coaches Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Assistant Coaches on the Mat
                </label>
                <div className="flex flex-wrap gap-2">
                  {coaches
                    .filter((c) => c.id !== headCoachId && !c.isDeleted)
                    .map((c) => {
                      const isSelected = assistantCoachIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleAssistantCoach(c)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-blue-950 text-blue-200 border-blue-600 shadow-sm'
                              : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-stone-600'}`} />
                          <span>{c.fullName}</span>
                          <span className="text-[10px] opacity-70">({c.beltRank})</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Section 3: Training Days & Class Timeslot */}
            <div className="space-y-4 pt-3 border-t border-stone-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. Scheduled Training Days & Timeslot</span>
                </h3>
                <span className="text-[11px] text-stone-400 font-medium">
                  Uniform class schedule across all selected days
                </span>
              </div>

              {/* Days Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Select Days of the Week <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.includes(day.short);
                    return (
                      <button
                        key={day.short}
                        type="button"
                        onClick={() => toggleDay(day.short, day.full)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-500 shadow-sm'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Master Time Selector */}
              <div className="bg-stone-950/90 p-4 rounded-xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Class Time & Duration</span>
                  </span>
                  <span className="text-[11px] text-stone-400 font-medium">
                    Same duration on each selected day
                  </span>
                </div>

                <MouseTimeRangePicker
                  value={timeSummary || '07:00 PM - 08:30 PM'}
                  onChange={handlePrimaryTimeChange}
                />
              </div>
            </div>

            {/* Section 4: Location, Duration & Notes */}
            <div className="space-y-3 pt-3 border-t border-stone-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>4. Mat Area & Class Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Mat Area / Room
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Main Dojo Mat A"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-red-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-300">
                      Calculated Class Duration
                    </label>
                    <span className="text-[10px] font-bold text-emerald-400">
                      Auto-Calculated
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white font-mono font-black text-sm flex items-center justify-between">
                      <span>{durationMinutes} Minutes</span>
                      <span className="text-xs font-normal text-stone-400">
                        ({(durationMinutes / 60).toFixed(1)} hrs)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Technique Curriculum & Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline syllabus, position focus (e.g. guard retention, passing, submissions), or gear requirements..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white placeholder-stone-500 focus:outline-hidden focus:border-red-500 resize-none text-xs"
                />
              </div>
            </div>

            {/* Form Footer Actions */}
            <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-3">
              {editingSession && onDeleteClass ? (
                <button
                  type="button"
                  onClick={() => setClassToDelete(editingSession)}
                  className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900/70 text-red-300 hover:text-red-100 border border-red-800/80 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Class</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setEditingSession(null);
                  }}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingSession ? 'Save Changes' : 'Create Class'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* In-App Delete Confirmation Modal (Bypasses iframe window.confirm restriction) */}
        {classToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Delete Academy Class?</h3>
                  <p className="text-xs text-stone-400">This class will be permanently removed.</p>
                </div>
              </div>

              <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-1.5 text-xs">
                <p className="font-black text-white text-sm">{classToDelete.title}</p>
                <div className="flex items-center gap-2 text-stone-400">
                  <span>Category: <strong className="text-stone-200">{classToDelete.category}</strong></span>
                  <span>•</span>
                  <span>Type: <strong className="text-stone-200">{classToDelete.type}</strong></span>
                </div>
                <p className="text-stone-400">
                  Head Coach: <strong className="text-stone-200">{classToDelete.headCoachName || classToDelete.coach}</strong>
                </p>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed">
                Deleting this class will remove it from the <strong>Mat Attendance</strong> selector and automatically clear any scheduled occurrences on the <strong>Matboard</strong>.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setClassToDelete(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteClass) {
                      onDeleteClass(classToDelete.id);
                      showToast(`Successfully deleted "${classToDelete.title}"`);
                      if (editingSession?.id === classToDelete.id) {
                        setViewMode('list');
                        setEditingSession(null);
                      }
                    }
                    setClassToDelete(null);
                  }}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
