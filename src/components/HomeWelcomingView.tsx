import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Flame,
  CalendarDays,
  Users,
  User,
  ChevronRight,
  ArrowRight,
  Sparkles,
  MapPin,
  CalendarCheck2,
  ShieldCheck,
  Palette,
  Pipette
} from 'lucide-react';
import {
  ClassSession,
  Member,
  Coach,
  AttendanceRecord,
  GymSettings,
  TimetableConfig
} from '../types';
import { ActiveTab } from './Navbar';
import { BeltBadge } from '../utils/bjjBelts';
import { getMatboardClassesForDay, resolveTimetableDay, TIMETABLE_DAY_TO_FULL } from '../utils/matboardSchedule';
import { 
  parseTimeToMinutes,
  parseSlotStartMinutes,
  parseSlotEndMinutes,
  getJordanDateStr, 
  getJordanTime12Str, 
  formatJordanDate, 
  getJordanCurrentMinutes, 
  toJordanDate 
} from '../utils/timeUtils';

interface HomeWelcomingViewProps {
  settings: GymSettings;
  classes: ClassSession[];
  timetableConfig: TimetableConfig;
  members: Member[];
  coaches: Coach[];
  attendance: AttendanceRecord[];
  onNavigateTab: (tab: ActiveTab, classId?: string) => void;
  onSelectMember?: (member: Member) => void;
  theme?: 'light' | 'dark';
}

export const HomeWelcomingView: React.FC<HomeWelcomingViewProps> = ({
  settings,
  classes,
  timetableConfig,
  members,
  coaches,
  attendance,
  onNavigateTab,
  onSelectMember,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  // Real-time ticking clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's date representations in Jordan Amman time
  const todayDateStr = useMemo(() => {
    return getJordanDateStr(currentTime);
  }, [currentTime]);

  const todayTimetableDay = useMemo(() => {
    const jordanDate = toJordanDate(currentTime);
    return resolveTimetableDay(jordanDate);
  }, [currentTime]);
  
  const todayDayFull = useMemo(() => TIMETABLE_DAY_TO_FULL[todayTimetableDay] || 'Today', [todayTimetableDay]);

  // Dynamic greeting based on Jordan time of day
  const greeting = useMemo(() => {
    const { hours } = getJordanCurrentMinutes(currentTime);
    if (hours < 12) return 'GOOD MORNING';
    if (hours < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, [currentTime]);

  // Formatted date string in Jordan Amman time
  const formattedToday = useMemo(() => {
    return formatJordanDate(currentTime, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentTime]);

  // Formatted time string in Jordan Amman time
  const formattedClock = useMemo(() => {
    return getJordanTime12Str(currentTime, true);
  }, [currentTime]);

  // Check-ins for today
  const todayAttendanceRecords = useMemo(() => {
    return attendance.filter((a) => a.date === todayDateStr);
  }, [attendance, todayDateStr]);

  // Matboard classes for today (Matboard is the single source of truth)
  const todayClasses = useMemo(() => {
    return getMatboardClassesForDay(todayTimetableDay, timetableConfig, classes, coaches);
  }, [todayTimetableDay, timetableConfig, classes, coaches]);

  const displayedClasses = todayClasses;

  // Map of coach by ID or name
  const coachMap = useMemo(() => {
    const map: Record<string, Coach> = {};
    coaches.forEach((c) => {
      if (!c.isDeleted) {
        map[c.id] = c;
        map[c.fullName.toLowerCase()] = c;
      }
    });
    return map;
  }, [coaches]);

  // Resolve coach details for a class session
  const resolveCoach = (c: ClassSession) => {
    if (c.headCoachId && coachMap[c.headCoachId]) {
      return coachMap[c.headCoachId];
    }
    if (c.coach && coachMap[c.coach.toLowerCase()]) {
      return coachMap[c.coach.toLowerCase()];
    }
    return null;
  };

  // Check session status (IN_SESSION, UPCOMING, COMPLETED) according to Jordan Amman time
  const getSessionStatus = (timeStr: string) => {
    if (!timeStr) return { status: 'SCHEDULED', label: 'Scheduled', badgeClass: 'bg-stone-800 text-stone-300' };

    const startMinutes = parseSlotStartMinutes(timeStr);
    const endMinutes = parseSlotEndMinutes(timeStr);
    const { totalMinutes: currentMinutes } = getJordanCurrentMinutes(currentTime);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      const remainingMinutes = endMinutes - currentMinutes;
      return {
        status: 'IN_SESSION',
        label: `In Session (${remainingMinutes}m left)`,
        badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-600/80 animate-pulse',
      };
    } else if (currentMinutes < startMinutes) {
      const minUntil = startMinutes - currentMinutes;
      const hours = Math.floor(minUntil / 60);
      const mins = minUntil % 60;
      const timeLabel = hours > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${mins}m`;
      return {
        status: 'UPCOMING',
        label: timeLabel,
        badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/70',
      };
    } else {
      const elapsed = currentMinutes - endMinutes;
      const hours = Math.floor(elapsed / 60);
      const mins = elapsed % 60;
      const elapsedLabel = hours > 0 ? `Concluded ${hours}h ${mins}m ago` : `Concluded ${mins}m ago`;
      return {
        status: 'COMPLETED',
        label: elapsedLabel,
        badgeClass: 'bg-stone-850 text-stone-400 border-stone-700/60',
      };
    }
  };

  // Check how many students checked in for a specific class today
  const getClassTodayAttendance = (classItem: ClassSession) => {
    return todayAttendanceRecords.filter(
      (a) => a.className.toLowerCase() === classItem.title.toLowerCase() || (classItem.id && a.notes?.includes(classItem.id))
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Welcoming Academy Overview & Operational Status Bar with Date & Time */}
      <div className={`relative overflow-hidden rounded-3xl border transition-all p-5 sm:p-7 ${
        isLight
          ? 'bg-white border-stone-200 shadow-md text-stone-900'
          : 'bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border-stone-800 shadow-xl text-white'
      }`}>
        {/* Subtle decorative background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Academy Command Greeting & Live Status */}
          <div className="flex items-start sm:items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isLight
                ? 'bg-red-50 text-red-600 border-red-200 shadow-xs'
                : 'bg-red-950/80 text-red-400 border-red-800/80 shadow-inner'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-red-950 text-red-400 border-red-800'
                }`}>
                  {greeting}, PROFESSOR & TEAM
                </span>
              </div>

              <h1 className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                Today's Matboard & Academy Operations
              </h1>
            </div>
          </div>

          {/* Date & Time Widget */}
          <div className="shrink-0 flex items-center gap-3 self-start lg:self-auto flex-wrap">
            <div className={`rounded-2xl px-5 py-3 flex items-center gap-4 border shadow-inner ${
              isLight
                ? 'bg-stone-100 border-stone-200'
                : 'bg-stone-950/90 border-stone-800'
            }`}>
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <div className={`text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-stone-500' : 'text-stone-400'
                }`}>
                  {formattedToday}
                </div>
                <div className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                  isLight ? 'text-stone-900' : 'text-white'
                }`}>
                  {formattedClock}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TODAY'S CLASSES CALENDAR (MAIN COMPONENT REFERENCING MATBOARD) */}
      <div className={`rounded-3xl p-5 sm:p-7 border transition-all ${
        isLight
          ? 'bg-white border-stone-200 shadow-md text-stone-900'
          : 'bg-stone-900 border-stone-800 shadow-lg text-white'
      }`}>
        {/* Calendar Header */}
        <div className={`pb-5 border-b ${isLight ? 'border-stone-200' : 'border-stone-800'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              isLight
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-red-950/80 border-red-800/80 text-red-400'
            }`}>
              <Flame className="w-4 h-4" />
            </div>
            <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? 'text-stone-900' : 'text-white'}`}>
              Today's Classes Calendar
            </h2>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
            Active timetable for <strong className={isLight ? 'text-stone-900' : 'text-white'}>{todayDayFull}</strong> ({todayClasses.length} {todayClasses.length === 1 ? 'session' : 'sessions'} programmed on the Matboard today).
          </p>
        </div>

        {/* Classes Calendar List */}
        <div className="mt-5">
          {displayedClasses.length === 0 ? (
            <div className={`py-12 px-4 rounded-2xl border border-dashed text-center flex flex-col items-center justify-center ${
              isLight
                ? 'bg-stone-50 border-stone-300 text-stone-600'
                : 'bg-stone-950/60 border-stone-800 text-stone-400'
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                isLight ? 'bg-stone-200 text-stone-500' : 'bg-stone-800/80 text-stone-400'
              }`}>
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className={`text-base font-bold mb-1 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                No Classes Scheduled on Matboard for {todayDayFull}
              </h3>
              <p className="text-xs max-w-md mb-5">
                The Matboard is the official reference for the academy schedule. There are no training sessions programmed on the Matboard for {todayDayFull}. Mats are open for recovery, private drilling, or rest.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-colors shadow-xs cursor-pointer ${
                  isLight
                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                    : 'bg-stone-800 hover:bg-stone-750 text-amber-400 hover:text-amber-300 border-amber-500/40'
                }`}
              >
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <span>View Academy Matboard</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {displayedClasses.map((classItem) => {
                const sessionStatus = getSessionStatus(classItem.time);
                const assignedCoach = resolveCoach(classItem);
                const classCheckIns = getClassTodayAttendance(classItem);

                return (
                  <div
                    key={classItem.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between group ${
                      sessionStatus.status === 'IN_SESSION'
                        ? isLight
                          ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400/50 shadow-sm'
                          : 'bg-gradient-to-br from-stone-900 to-emerald-950/20 border-emerald-700/80 shadow-md ring-1 ring-emerald-500/30'
                        : isLight
                        ? 'bg-stone-50/80 hover:bg-white border-stone-200 hover:border-stone-300 shadow-2xs'
                        : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Top Row: Time & Live Session Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                          isLight
                            ? 'bg-white text-stone-900 border-stone-300'
                            : 'bg-stone-900 text-white border-stone-800'
                        }`}>
                          <Clock className="w-3.5 h-3.5 text-red-500" />
                          <span>{classItem.time || 'Schedule TBA'}</span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sessionStatus.badgeClass}`}
                        >
                          {sessionStatus.status === 'IN_SESSION' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse" />
                          )}
                          {sessionStatus.label}
                        </span>
                      </div>

                      {/* Class Title & Tags */}
                      <div className="mt-3.5">
                        <h3 className={`text-base font-bold transition-colors ${
                          isLight
                            ? 'text-stone-900 group-hover:text-red-600'
                            : 'text-white group-hover:text-red-400'
                        }`}>
                          {classItem.title}
                        </h3>

                        <div className={`flex items-center gap-2 text-xs mt-1 flex-wrap ${
                          isLight ? 'text-stone-500' : 'text-stone-400'
                        }`}>
                          <span className="text-red-500 font-semibold">{classItem.type || 'Gi'}</span>
                          <span aria-hidden="true" className={isLight ? 'text-stone-300' : 'text-stone-600'}>•</span>
                          <span
                            className={`font-semibold ${
                              classItem.category === 'Kids'
                                ? 'text-amber-500'
                                : classItem.category === 'Teens'
                                ? 'text-blue-500'
                                : isLight ? 'text-stone-700' : 'text-stone-300'
                            }`}
                          >
                            {classItem.category}
                          </span>
                          {classItem.room && (
                            <>
                              <span aria-hidden="true" className={isLight ? 'text-stone-300' : 'text-stone-600'}>•</span>
                              <span className={`flex items-center gap-1 text-[11px] ${
                                isLight ? 'text-stone-500' : 'text-stone-400'
                              }`}>
                                <MapPin className="w-3 h-3 text-stone-400" />
                                {classItem.room}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Coach & Mat Details */}
                      <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                        isLight ? 'border-stone-200' : 'border-stone-900'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center border shrink-0 ${
                            isLight
                              ? 'bg-stone-200 text-stone-700 border-stone-300'
                              : 'bg-stone-800 text-stone-300 border-stone-700'
                          }`}>
                            <User className="w-3.5 h-3.5 text-stone-400" />
                          </div>
                          <div className="truncate">
                            <span className={`block text-[10px] ${isLight ? 'text-stone-400' : 'text-stone-400'}`}>Head Coach</span>
                            <span className={`font-semibold truncate block ${isLight ? 'text-stone-900' : 'text-white'}`}>
                              {classItem.headCoachName || classItem.coach}
                            </span>
                          </div>
                        </div>

                        {assignedCoach?.beltRank && (
                          <BeltBadge belt={assignedCoach.beltRank} stripes={assignedCoach.stripes || 0} size="sm" />
                        )}
                      </div>
                    </div>

                    {/* Footer: Live Mat Attendance & Action */}
                    <div className={`mt-4 pt-3 border-t flex items-center justify-between ${
                      isLight ? 'border-stone-200' : 'border-stone-800/80'
                    }`}>
                      <div className={`flex items-center gap-1.5 text-xs ${
                        isLight ? 'text-stone-600' : 'text-stone-400'
                      }`}>
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span className={`font-semibold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                          {classCheckIns.length}
                        </span>
                        <span>checked in today</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigateTab('checkin', classItem.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <CalendarCheck2 className="w-3.5 h-3.5" />
                        <span>Mat Check-In</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
