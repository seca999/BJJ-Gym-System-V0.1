import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Flame,
  Clock,
  Layers,
  Sparkles,
  BarChart3,
  CalendarDays,
  RotateCcw,
} from 'lucide-react';
import { AttendanceRecord, ClassSession } from '../types';

interface WeeklyAttendanceBarChartProps {
  attendance: AttendanceRecord[];
  classes?: ClassSession[];
}

interface DayData {
  dayName: string; // "Mon", "Tue", etc.
  fullDayName: string; // "Monday", etc.
  dateStr: string; // "2026-09-21"
  displayDate: string; // "Mon 21"
  dayNum: string;
  kids: number;
  teens: number;
  adults: number;
  total: number;
  isTrainingDay: boolean;
  isToday: boolean;
  records: AttendanceRecord[];
}

export const WeeklyAttendanceBarChart: React.FC<WeeklyAttendanceBarChartProps> = ({
  attendance,
  classes = [],
}) => {
  // Determine reference "today" date
  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  // Determine latest date in attendance records if available
  const latestAttendanceDate = useMemo(() => {
    if (attendance.length === 0) return new Date();
    const dates = attendance
      .map((a) => new Date(a.date).getTime())
      .filter((t) => !isNaN(t));
    if (dates.length === 0) return new Date();
    return new Date(Math.max(...dates, new Date().getTime()));
  }, [attendance]);

  // Offset in weeks from the reference week (0 = current week, -1 = last week, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Chart display mode: Stacked by Class (Kids/Teens/Adults) vs Single Total Bar
  const [chartMode, setChartMode] = useState<'stacked' | 'total'>('stacked');

  // Currently hovered or selected day index (0..6)
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // Compute Monday of the selected week
  const weekMonday = useMemo(() => {
    const base = new Date(latestAttendanceDate);
    base.setDate(base.getDate() + weekOffset * 7);

    const day = base.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = base.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(base.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, [latestAttendanceDate, weekOffset]);

  // Compute 7 days of the week (Monday through Sunday)
  const weekDays = useMemo<DayData[]>(() => {
    const days: DayData[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Dynamically derive active training days from registered academy classes
    const trainingDays = new Set<string>();
    if (classes && classes.length > 0) {
      classes.forEach((c) => {
        if (c.daySchedule) {
          Object.keys(c.daySchedule).forEach((d) => trainingDays.add(d));
        }
        if (c.daysOfWeek) {
          c.daysOfWeek.forEach((d) => {
            if (d === 'Mon') trainingDays.add('Monday');
            if (d === 'Tue') trainingDays.add('Tuesday');
            if (d === 'Wed') trainingDays.add('Wednesday');
            if (d === 'Thu') trainingDays.add('Thursday');
            if (d === 'Fri') trainingDays.add('Friday');
            if (d === 'Sat') trainingDays.add('Saturday');
            if (d === 'Sun') trainingDays.add('Sunday');
          });
        }
      });
    }
    if (trainingDays.size === 0) {
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'].forEach((d) => trainingDays.add(d));
    }

    // Build map of attendance for fast lookup by date
    const attendanceByDate = new Map<string, AttendanceRecord[]>();
    attendance.forEach((rec) => {
      const list = attendanceByDate.get(rec.date) || [];
      list.push(rec);
      attendanceByDate.set(rec.date, list);
    });

    for (let i = 0; i < 7; i++) {
      const current = new Date(weekMonday);
      current.setDate(weekMonday.getDate() + i);

      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const recs = attendanceByDate.get(dateStr) || [];

      let kids = 0;
      let teens = 0;
      let adults = 0;

      recs.forEach((r) => {
        const cat =
          r.classCategory ||
          (r.className.toLowerCase().includes('kid')
            ? 'Kids'
            : r.className.toLowerCase().includes('teen')
            ? 'Teens'
            : 'Adults');

        if (cat === 'Kids') kids++;
        else if (cat === 'Teens') teens++;
        else adults++;
      });

      const dayName = dayNames[i];
      const fullDayName = fullDayNames[i];

      days.push({
        dayName,
        fullDayName,
        dateStr,
        displayDate: `${dayName} ${d}`,
        dayNum: d,
        kids,
        teens,
        adults,
        total: kids + teens + adults,
        isTrainingDay: trainingDays.has(fullDayName),
        isToday: dateStr === todayStr,
        records: recs,
      });
    }

    return days;
  }, [weekMonday, attendance, classes, todayStr]);

  // Week range label e.g., "Sep 21 – Sep 27, 2026"
  const weekLabel = useMemo(() => {
    const monday = weekDays[0];
    const sunday = weekDays[6];
    if (!monday || !sunday) return '';

    const mDate = new Date(monday.dateStr + 'T00:00:00');
    const sDate = new Date(sunday.dateStr + 'T00:00:00');

    const mMonth = mDate.toLocaleDateString('en-US', { month: 'short' });
    const sMonth = sDate.toLocaleDateString('en-US', { month: 'short' });
    const year = sDate.getFullYear();

    if (mMonth === sMonth) {
      return `${mMonth} ${mDate.getDate()} – ${sDate.getDate()}, ${year}`;
    }
    return `${mMonth} ${mDate.getDate()} – ${sMonth} ${sDate.getDate()}, ${year}`;
  }, [weekDays]);

  // Weekly summary aggregates
  const weekSummary = useMemo(() => {
    let total = 0;
    let kids = 0;
    let teens = 0;
    let adults = 0;
    let peakDay: DayData | null = null;
    const uniqueStudents = new Set<string>();

    weekDays.forEach((d) => {
      total += d.total;
      kids += d.kids;
      teens += d.teens;
      adults += d.adults;

      d.records.forEach((r) => uniqueStudents.add(r.memberId));

      if (!peakDay || d.total > peakDay.total) {
        if (d.total > 0) {
          peakDay = d;
        }
      }
    });

    const activeTrainingDaysCount = weekDays.filter((d) => d.isTrainingDay).length;
    const avgPerTrainingDay = activeTrainingDaysCount > 0 ? (total / activeTrainingDaysCount).toFixed(1) : '0';

    return {
      total,
      kids,
      teens,
      adults,
      peakDay,
      uniqueStudentsCount: uniqueStudents.size,
      avgPerTrainingDay,
    };
  }, [weekDays]);

  // Y-axis maximum scale calculation
  const maxDayTotal = useMemo(() => {
    const maxVal = Math.max(...weekDays.map((d) => d.total), 0);
    if (maxVal <= 5) return 8;
    if (maxVal <= 10) return 12;
    if (maxVal <= 20) return 24;
    return Math.ceil((maxVal + 2) / 5) * 5;
  }, [weekDays]);

  // SVG coordinate constants
  const svgWidth = 720;
  const svgHeight = 220;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 42;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const colWidth = plotWidth / 7;
  const barWidth = 42;

  // Grid steps (4 horizontal guide lines)
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  // Active tooltip day (either hovered or default to today if in range, otherwise peak day)
  const activeDay = hoveredDayIndex !== null 
    ? weekDays[hoveredDayIndex] 
    : weekDays.find((d) => d.isToday) || weekSummary.peakDay || weekDays[0];

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-900/60 inline-flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Weekly Gym Traffic
            </span>
            <span className="text-xs text-stone-400">
              Check-ins per day for{' '}
              <strong className="text-white font-semibold">{weekLabel}</strong>
            </span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>Weekly Attendance Traffic</span>
            {weekOffset === 0 ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                Current Week
              </span>
            ) : weekOffset === -1 ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-800 text-stone-300 border border-stone-700">
                Previous Week
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-800 text-stone-300 border border-stone-700">
                {Math.abs(weekOffset)} Weeks {weekOffset < 0 ? 'Ago' : 'Ahead'}
              </span>
            )}
          </h3>
        </div>

        {/* Week navigation & display mode */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Stacked vs Total toggle */}
          <div className="inline-flex items-center bg-stone-950 border border-stone-800 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                chartMode === 'stacked'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              By Class
            </button>
            <button
              type="button"
              onClick={() => setChartMode('total')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                chartMode === 'total'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Total Only
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="inline-flex items-center bg-stone-950 border border-stone-800 rounded-lg p-1 text-xs gap-1">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-2 py-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-stone-800 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                title="Reset to current week"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Today</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-950 border border-stone-800/80 p-3 rounded-xl">
          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>Total Check-Ins</span>
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-xl font-black text-white mt-1">
            {weekSummary.total}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            across {weekDays.filter((d) => d.total > 0).length} active days
          </div>
        </div>

        <div className="bg-stone-950 border border-stone-800/80 p-3 rounded-xl">
          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>Peak Mat Traffic</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 mt-1 truncate">
            {weekSummary.peakDay ? (
              <span>
                {weekSummary.peakDay.fullDayName} ({weekSummary.peakDay.total})
              </span>
            ) : (
              <span className="text-stone-500 text-base font-normal">None yet</span>
            )}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">busiest day of week</div>
        </div>

        <div className="bg-stone-950 border border-stone-800/80 p-3 rounded-xl">
          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>Active Students</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {weekSummary.uniqueStudentsCount}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">unique members trained</div>
        </div>

        <div className="bg-stone-950 border border-stone-800/80 p-3 rounded-xl">
          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>Training Day Avg</span>
            <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-400 mt-1">
            {weekSummary.avgPerTrainingDay}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            check-ins / class session
          </div>
        </div>
      </div>

      {/* Main SVG Bar Chart Visualizer */}
      <div className="pt-1">
        {/* Legend */}
        {chartMode === 'stacked' && (
          <div className="flex items-center justify-end gap-4 pb-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-stone-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
              <span>Kids Class</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-stone-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
              <span>Teens Class</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-stone-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-500" />
              <span>Adults Class</span>
            </span>
          </div>
        )}

        <div className="relative w-full bg-stone-950/60 border border-stone-800/80 rounded-xl p-2 sm:p-4 overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            style={{ maxHeight: '280px' }}
          >
            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {gridSteps.map((step, idx) => {
              const val = Math.round(maxDayTotal * step);
              const y = paddingTop + plotHeight * (1 - step);
              return (
                <g key={`grid-${idx}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#292524"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#78716c"
                    fontSize="10"
                    fontWeight="500"
                    fontFamily="inherit"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Baseline */}
            <line
              x1={paddingLeft}
              y1={paddingTop + plotHeight}
              x2={svgWidth - paddingRight}
              y2={paddingTop + plotHeight}
              stroke="#44403c"
              strokeWidth="1.5"
            />

            {/* 7 Days Columns */}
            {weekDays.map((day, i) => {
              const colX = paddingLeft + i * colWidth;
              const barX = colX + (colWidth - barWidth) / 2;
              const isHovered = hoveredDayIndex === i;

              // Heights
              const scale = plotHeight / maxDayTotal;
              const totalHeight = Math.min(plotHeight, day.total * scale);
              const kidsHeight = Math.min(plotHeight, day.kids * scale);
              const teensHeight = Math.min(plotHeight, day.teens * scale);
              const adultsHeight = Math.min(plotHeight, day.adults * scale);

              const baselineY = paddingTop + plotHeight;

              return (
                <g
                  key={`day-col-${i}`}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredDayIndex(i)}
                  onMouseLeave={() => setHoveredDayIndex(null)}
                  onClick={() => setHoveredDayIndex(i)}
                >
                  {/* Hover background column indicator */}
                  <rect
                    x={colX + 2}
                    y={paddingTop - 6}
                    width={colWidth - 4}
                    height={plotHeight + 14}
                    fill={isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
                    rx="8"
                    className="transition-colors duration-150"
                  />

                  {/* Highlight bar for Today */}
                  {day.isToday && (
                    <rect
                      x={colX + 4}
                      y={paddingTop - 2}
                      width={colWidth - 8}
                      height={plotHeight + 4}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      rx="6"
                      opacity="0.4"
                    />
                  )}

                  {/* Empty state pill if 0 check-ins */}
                  {day.total === 0 && (
                    <rect
                      x={barX + 6}
                      y={baselineY - 3}
                      width={barWidth - 12}
                      height="3"
                      fill="#44403c"
                      rx="1.5"
                    />
                  )}

                  {/* Bars rendering */}
                  {day.total > 0 && (
                    <>
                      {chartMode === 'stacked' ? (
                        <g>
                          {/* Kids Bar (Bottom) */}
                          {day.kids > 0 && (
                            <rect
                              x={barX}
                              y={baselineY - kidsHeight}
                              width={barWidth}
                              height={kidsHeight}
                              fill="#f59e0b"
                              rx={day.teens === 0 && day.adults === 0 ? '5' : '0'}
                            />
                          )}

                          {/* Teens Bar (Middle) */}
                          {day.teens > 0 && (
                            <rect
                              x={barX}
                              y={baselineY - kidsHeight - teensHeight}
                              width={barWidth}
                              height={teensHeight}
                              fill="#3b82f6"
                              rx={day.adults === 0 ? '5' : '0'}
                            />
                          )}

                          {/* Adults Bar (Top) */}
                          {day.adults > 0 && (
                            <rect
                              x={barX}
                              y={baselineY - kidsHeight - teensHeight - adultsHeight}
                              width={barWidth}
                              height={adultsHeight}
                              fill="#ef4444"
                              rx="5"
                            />
                          )}
                        </g>
                      ) : (
                        /* Total Only Bar */
                        <rect
                          x={barX}
                          y={baselineY - totalHeight}
                          width={barWidth}
                          height={totalHeight}
                          fill={
                            day.isToday
                              ? '#dc2626'
                              : day.isTrainingDay
                              ? '#ef4444'
                              : '#78716c'
                          }
                          rx="5"
                        />
                      )}

                      {/* Total Number Label above bar */}
                      <text
                        x={barX + barWidth / 2}
                        y={baselineY - totalHeight - 6}
                        textAnchor="middle"
                        fill={isHovered ? '#ffffff' : '#d6d3d1'}
                        fontSize="11"
                        fontWeight="700"
                        fontFamily="inherit"
                      >
                        {day.total}
                      </text>
                    </>
                  )}

                  {/* X-Axis Day Label */}
                  <text
                    x={barX + barWidth / 2}
                    y={baselineY + 16}
                    textAnchor="middle"
                    fill={day.isToday ? '#ef4444' : isHovered ? '#ffffff' : '#a8a29e'}
                    fontSize="11"
                    fontWeight={day.isToday || isHovered ? '700' : '600'}
                    fontFamily="inherit"
                  >
                    {day.dayName}
                  </text>

                  {/* Date number */}
                  <text
                    x={barX + barWidth / 2}
                    y={baselineY + 29}
                    textAnchor="middle"
                    fill={day.isToday ? '#ef4444' : '#78716c'}
                    fontSize="10"
                    fontWeight="500"
                    fontFamily="inherit"
                  >
                    {day.dayNum}
                  </text>

                  {/* Little red dot if today */}
                  {day.isToday && (
                    <circle
                      cx={barX + barWidth / 2}
                      cy={baselineY + 35}
                      r="2"
                      fill="#ef4444"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Day Inspector Card (Below or Hovered) */}
          {activeDay && (
            <div className="mt-3 pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-stone-900/90 p-3 rounded-lg border border-stone-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  {activeDay.fullDayName} ({activeDay.dateStr})
                </span>
                {activeDay.isToday && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                    Today
                  </span>
                )}
                {activeDay.isTrainingDay ? (
                  <span className="text-amber-400 font-semibold inline-flex items-center gap-1 text-[11px]">
                    <span>🥋</span> Class Day
                  </span>
                ) : (
                  <span className="text-stone-500 italic inline-flex items-center gap-1 text-[11px]">
                    <span>💤</span> Open Mat
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-stone-300">
                  <span className="w-2 h-2 rounded-xs bg-amber-500" />
                  <span>Kids:</span>
                  <strong className="text-amber-400">{activeDay.kids}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 text-stone-300">
                  <span className="w-2 h-2 rounded-xs bg-blue-500" />
                  <span>Teens:</span>
                  <strong className="text-blue-400">{activeDay.teens}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 text-stone-300">
                  <span className="w-2 h-2 rounded-xs bg-red-500" />
                  <span>Adults:</span>
                  <strong className="text-red-400">{activeDay.adults}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 text-white font-bold pl-2 border-l border-stone-800">
                  <span>Total:</span>
                  <span className="text-red-400 text-sm">{activeDay.total}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Indicator & Day Badges */}
      <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-stone-400 font-medium text-[11px]">
            Academy Schedule:
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Mon: Kids 4:30p • Teens 5:30p • Adults 7:00p</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Wed: Kids 4:30p • Teens 5:30p • Adults 7:00p</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Sat: Kids 9:30a • Teens 10:30a • Adults 12:00p</span>
          </span>
        </div>

        {weekSummary.total === 0 && (
          <div className="text-stone-500 text-[11px] italic">
            No check-ins recorded for this week yet.
          </div>
        )}
      </div>
    </div>
  );
};
