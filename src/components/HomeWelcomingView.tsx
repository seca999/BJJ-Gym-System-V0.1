import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Flame,
  CalendarDays,
  Users,
  ChevronRight,
  ArrowRight,
  Sparkles,
  MapPin,
  CalendarCheck2
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
import { GymLogoDisplay } from './GymLogoDisplay';
import { getMatboardClassesForDay, resolveTimetableDay, TIMETABLE_DAY_TO_FULL } from '../utils/matboardSchedule';
import { parseTimeToMinutes } from '../utils/timeUtils';

interface HomeWelcomingViewProps {
  settings: GymSettings;
  classes: ClassSession[];
  timetableConfig: TimetableConfig;
  members: Member[];
  coaches: Coach[];
  attendance: AttendanceRecord[];
  onNavigateTab: (tab: ActiveTab, classId?: string) => void;
  onSelectMember?: (member: Member) => void;
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
}) => {
  // Real-time ticking clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's date representations
  const todayDateStr = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, '0');
    const d = String(currentTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentTime]);

  const todayTimetableDay = useMemo(() => resolveTimetableDay(currentTime), [currentTime]);
  const todayDayFull = useMemo(() => TIMETABLE_DAY_TO_FULL[todayTimetableDay] || 'Today', [todayTimetableDay]);

  // Dynamic greeting based on time of day
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, [currentTime]);

  // Formatted date string
  const formattedToday = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentTime]);

  // Formatted time string
  const formattedClock = useMemo(() => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
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

  // Check session status (IN_SESSION, UPCOMING, COMPLETED)
  const getSessionStatus = (timeStr: string) => {
    if (!timeStr) return { status: 'SCHEDULED', label: 'Scheduled', badgeClass: 'bg-stone-800 text-stone-300' };
    const parts = timeStr.split('-').map((s) => s.trim());
    if (parts.length === 0) return { status: 'SCHEDULED', label: 'Scheduled', badgeClass: 'bg-stone-800 text-stone-300' };

    const startMinutes = parseTimeToMinutes(parts[0]);
    const endMinutes = parts.length > 1 ? parseTimeToMinutes(parts[1]) : startMinutes + 60;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

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
      return {
        status: 'COMPLETED',
        label: 'Session Concluded',
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
      {/* 1. Welcoming Academy Hero Greeting Banner with Date & Time */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border border-stone-800 shadow-xl p-6 sm:p-8">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Academy Identity & Greeting (as shown in user reference image) */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="shrink-0 drop-shadow-md">
              <GymLogoDisplay
                logo={settings.logo}
                gymName={settings.gymName}
                sizeOverride={{ width: 84, height: 84 }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                  {greeting}, PROFESSOR & TEAM
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-xs text-stone-400 font-medium">BJJ Academy Station</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                {settings.gymName || 'Mat- 05 SAMY AL-JAMAL'}
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-xl line-clamp-2">
                {settings.slogan || 'Fear No One'}
              </p>
            </div>
          </div>

          {/* Date & Time Widget (as requested) */}
          <div className="shrink-0">
            <div className="bg-stone-950/90 border border-stone-800 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-inner">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  {formattedToday}
                </div>
                <div className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
                  {formattedClock}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TODAY'S CLASSES CALENDAR (MAIN COMPONENT REFERENCING MATBOARD) */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-lg">
        {/* Calendar Header */}
        <div className="pb-5 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Today's Classes Calendar
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Active timetable for <strong className="text-white">{todayDayFull}</strong> ({todayClasses.length} {todayClasses.length === 1 ? 'session' : 'sessions'} programmed on the Matboard today).
          </p>
        </div>

        {/* Classes Calendar List */}
        <div className="mt-5">
          {displayedClasses.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-stone-950/60 border border-dashed border-stone-800 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-stone-800/80 flex items-center justify-center mb-3 text-stone-400">
                <CalendarDays className="w-6 h-6 text-stone-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                No Classes Scheduled on Matboard for {todayDayFull}
              </h3>
              <p className="text-xs text-stone-400 max-w-md mb-5">
                The Matboard is the official reference for the academy schedule. There are no training sessions programmed on the Matboard for {todayDayFull}. Mats are open for recovery, private drilling, or rest.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('schedule')}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-amber-400 hover:text-amber-300 rounded-xl text-xs font-bold inline-flex items-center gap-2 border border-amber-500/40 transition-colors shadow-sm cursor-pointer"
              >
                <CalendarDays className="w-4 h-4 text-amber-400" />
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
                        ? 'bg-gradient-to-br from-stone-900 to-emerald-950/20 border-emerald-700/80 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Top Row: Time & Live Session Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-800">
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
                        <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                          {classItem.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-stone-400 mt-1 flex-wrap">
                          <span className="text-red-400 font-medium">{classItem.type || 'Gi'}</span>
                          <span aria-hidden="true" className="text-stone-600">•</span>
                          <span
                            className={`font-semibold ${
                              classItem.category === 'Kids'
                                ? 'text-amber-400'
                                : classItem.category === 'Teens'
                                ? 'text-blue-400'
                                : 'text-stone-300'
                            }`}
                          >
                            {classItem.category}
                          </span>
                          {classItem.room && (
                            <>
                              <span aria-hidden="true" className="text-stone-600">•</span>
                              <span className="flex items-center gap-1 text-stone-400 text-[11px]">
                                <MapPin className="w-3 h-3 text-stone-500" />
                                {classItem.room}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Coach & Mat Details */}
                      <div className="mt-4 pt-3 border-t border-stone-900 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {assignedCoach?.avatar ? (
                            <img
                              src={assignedCoach.avatar}
                              alt={assignedCoach.fullName}
                              className="w-6 h-6 rounded-full object-cover border border-stone-700 shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-stone-800 text-stone-300 font-bold text-[10px] flex items-center justify-center border border-stone-700 shrink-0">
                              {(classItem.headCoachName || classItem.coach || 'C').charAt(0)}
                            </div>
                          )}
                          <div className="truncate">
                            <span className="text-stone-400 block text-[10px]">Head Coach</span>
                            <span className="text-white font-medium truncate block">
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
                    <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-stone-400">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold text-white">
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
