import React, { useState, useRef } from 'react';
import {
  CalendarDays,
  Plus,
  Edit3,
  Trash2,
  Printer,
  RotateCcw,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  Image as ImageIcon,
  FileDown,
  Clock,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  User,
  Search,
  Filter,
  Flame,
  Shield,
  BookOpen,
  MoveVertical,
  ArrowDown,
  Star,
  Award,
  Zap,
  Smile
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { EditClassModal } from './EditClassModal';
import { MouseTimeRangePicker } from './MouseTimeRangePicker';
import { ACADEMY_TIMETABLE_PRESETS, parseTimeToMinutes, parseTimeRange, addMinutesToTime, formatMinutesToTime, parseSlotStartMinutes, parseSlotEndMinutes } from '../utils/timeUtils';
import {
  TimetableConfig,
  TimetableCell,
  TimetableSlot,
  TimetableDay,
  TimetableMat,
  ClassCategory,
  GymSettings,
  ClassSession,
  Coach
} from '../types';
import { DEFAULT_TIMETABLE_CONFIG, FIXED_6AM_10PM_SLOTS } from '../data/timetableData';

interface ScheduleBoardViewProps {
  config: TimetableConfig;
  gymSettings: GymSettings;
  classes?: ClassSession[];
  coaches?: Coach[];
  theme?: 'dark' | 'light';
  onUpdateConfig: (updated: TimetableConfig) => void;
  onSyncWithLiveClasses?: () => void;
  onSaveClass?: (savedClass: ClassSession) => void;
  onDeleteClass?: (classId: string) => void;
}

// Full day display names
const DAY_LABELS: Record<TimetableDay, { full: string; short: string }> = {
  SAT: { full: 'Saturday', short: 'SAT' },
  SUN: { full: 'Sunday', short: 'SUN' },
  MON: { full: 'Monday', short: 'MON' },
  TUE: { full: 'Tuesday', short: 'TUE' },
  WED: { full: 'Wednesday', short: 'WED' },
  THU: { full: 'Thursday', short: 'THU' },
  FRI: { full: 'Friday', short: 'FRI' },
};

// Standard time range options for quick slot assignment
const STANDARD_TIME_BLOCKS = [
  '7:00 - 8:00 AM',
  '11:00 AM - 12:15 PM',
  '1:00 - 2:00 PM',
  '2:00 - 3:00 PM',
  '4:20 - 5:20 PM',
  '5:30 - 6:30 PM',
  '6:30 - 7:30 PM',
  '7:30 - 9:00 PM',
  '9:00 - 10:00 PM',
];

export const ScheduleBoardView: React.FC<ScheduleBoardViewProps> = ({
  config,
  gymSettings,
  classes = [],
  coaches = [],
  theme = 'dark',
  onUpdateConfig,
  onSaveClass,
  onDeleteClass,
}) => {
  // Always maintain full weekly multi-day grid view on the Matboard
  const selectedDayView: 'ALL' = 'ALL';

  // State for Assigning a Class to a Timeslot via Dropdown
  const [assignDropdownCell, setAssignDropdownCell] = useState<{
    slotId: string;
    day: TimetableDay;
  } | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignCategoryFilter, setAssignCategoryFilter] = useState<'ALL' | ClassCategory>('ALL');
  const [isManageClassesOpen, setIsManageClassesOpen] = useState(false);

  // State for editing time slot row (time range / mat)
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<TimetableSlot | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [slotTimeRange, setSlotTimeRange] = useState('');
  const [slotMatId, setSlotMatId] = useState('');

  // State for editing mats
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [matsList, setMatsList] = useState<TimetableMat[]>(config.mats);

  // Export states
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Reference to printable / exportable grid container
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExportMenuOpen]);

  // Helpers
  const getCell = (slotId: string, day: TimetableDay): TimetableCell | undefined => {
    return config.cells.find((c) => c.slotId === slotId && c.day === day);
  };

  const getSlot = (slotId: string): TimetableSlot | undefined => {
    return config.slots.find((s) => s.id === slotId);
  };

  const getMat = (matId: string): TimetableMat | undefined => {
    return config.mats.find((m) => m.id === matId) || config.mats[0];
  };

  // Helper to find a cell that starts at this slotIdx on this day
  const getStartingCell = (slotIdx: number, day: TimetableDay): TimetableCell | undefined => {
    const slot = config.slots[slotIdx];
    if (!slot) return undefined;
    const slotMin = parseSlotStartMinutes(slot.timeRange);
    const isFirstSlot = slotIdx === 0;
    const isLastSlot = slotIdx === config.slots.length - 1;

    return config.cells.find((c) => {
      if (c.day !== day || !c.title.trim()) return false;
      if (c.timeRange && c.timeRange.trim().length > 0) {
        const sMin = parseSlotStartMinutes(c.timeRange);
        if (isFirstSlot && sMin < slotMin + 30) return true;
        if (isLastSlot && sMin >= slotMin) return true;
        return sMin >= slotMin && sMin < slotMin + 30;
      }
      return c.slotId === slot.id;
    });
  };

  // Helper to check how many 30-min slots a cell spans
  const getCellSpanSlots = (cell: TimetableCell, fallbackSlotRange: string): number => {
    const slotStartMins = parseSlotStartMinutes(fallbackSlotRange);
    if (cell.timeRange && cell.timeRange.trim().length > 0) {
      const sMin = parseSlotStartMinutes(cell.timeRange);
      const eMin = parseSlotEndMinutes(cell.timeRange);
      const startMins = Math.max(slotStartMins, sMin);
      return Math.max(1, Math.ceil((eMin - startMins) / 30));
    }
    return cell.spanSlots || 1;
  };

  // Helper to check if a (day, slotIdx) is covered by a multi-slot cell that started at an earlier slot
  const isCoveredByEarlierSlot = (day: TimetableDay, slotIdx: number): boolean => {
    for (let i = 0; i < slotIdx; i++) {
      const earlierCell = getStartingCell(i, day);
      if (earlierCell) {
        const span = getCellSpanSlots(earlierCell, config.slots[i]?.timeRange || '');
        if (i + span > slotIdx) {
          return true;
        }
      }
    }
    return false;
  };

  // Helper to get coach name for a cell
  const getCellCoachName = (cell: TimetableCell): string => {
    if (cell.instructor && cell.instructor.trim().length > 0) {
      return cell.instructor.replace(/\s*\(Head Coach\)/i, '').trim();
    }
    if (cell.subtitle) {
      const match = cell.subtitle.match(/\(([^)]+)\)/);
      if (match && match[1]) return match[1].trim();
    }
    const matchingClass = classes.find(
      (c) => c.title.trim().toLowerCase() === cell.title.trim().toLowerCase()
    );
    if (matchingClass) {
      return (
        matchingClass.headCoachName ||
        matchingClass.coach.replace(/\s*\(Head Coach\)/i, '') ||
        gymSettings.defaultCoach ||
        'Coach'
      );
    }
    return gymSettings.defaultCoach || 'Coach';
  };

  // Silent no-op helper (removes noisy popup toasts from the UI)
  const showToast = (_msg?: string) => {};

  // State for dragging class (top resize, bottom resize, or moving entire class up/down in 5-min steps)
  const [activeDragOp, setActiveDragOp] = useState<{
    cellId: string;
    day: TimetableDay;
    slotIdx: number;
    mode: 'resize-start' | 'resize-end' | 'move';
    startY: number;
    initialStartMins: number;
    initialEndMins: number;
    currentStartMins: number;
    currentEndMins: number;
    cellTitle: string;
  } | null>(null);

  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragEndTimeRef = useRef(0);

  // Mouse move and up listeners for 5-minute top/bottom stretching & class moving
  React.useEffect(() => {
    if (!activeDragOp) return;

    const firstSlotStartMins = parseSlotStartMinutes(config.slots[0]?.timeRange || '6:00 AM');
    const lastSlot = config.slots[config.slots.length - 1];
    const lastSlotEndMins = parseSlotEndMinutes(lastSlot?.timeRange || '10:00 PM');

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - activeDragOp.startY;
      if (Math.abs(deltaY) > 3) {
        dragMovedRef.current = true;
      }
      // 58px per 30 minutes = ~1.933px per minute. Round to nearest 5-minute increment.
      const pxPerMinute = 58 / 30;
      const rawDeltaMins = deltaY / pxPerMinute;
      const stepMins = Math.round(rawDeltaMins / 5) * 5;

      if (activeDragOp.mode === 'resize-start') {
        // Dragging top handle: moving UP (negative deltaY) makes start time earlier, moving DOWN makes start time later
        let newStart = activeDragOp.initialStartMins + stepMins;
        newStart = Math.max(firstSlotStartMins, Math.min(activeDragOp.initialEndMins - 15, newStart));
        newStart = Math.round(newStart / 5) * 5;

        setActiveDragOp((prev) =>
          prev ? { ...prev, currentStartMins: newStart } : prev
        );
      } else if (activeDragOp.mode === 'resize-end') {
        // Dragging bottom handle: moving DOWN (positive deltaY) makes end time later, moving UP makes end time earlier
        let newEnd = activeDragOp.initialEndMins + stepMins;
        newEnd = Math.min(lastSlotEndMins, Math.max(activeDragOp.initialStartMins + 15, newEnd));
        newEnd = Math.round(newEnd / 5) * 5;

        setActiveDragOp((prev) =>
          prev ? { ...prev, currentEndMins: newEnd } : prev
        );
      } else if (activeDragOp.mode === 'move') {
        // Dragging entire class card: shift both start and end time together
        const duration = activeDragOp.initialEndMins - activeDragOp.initialStartMins;
        let newStart = activeDragOp.initialStartMins + stepMins;
        newStart = Math.max(firstSlotStartMins, Math.min(lastSlotEndMins - duration, newStart));
        newStart = Math.round(newStart / 5) * 5;
        const newEnd = newStart + duration;

        setActiveDragOp((prev) =>
          prev ? { ...prev, currentStartMins: newStart, currentEndMins: newEnd } : prev
        );
      }
    };

    const handleMouseUp = () => {
      if (!activeDragOp) return;
      const { cellId, currentStartMins, currentEndMins } = activeDragOp;
      const hasChanged =
        currentStartMins !== activeDragOp.initialStartMins ||
        currentEndMins !== activeDragOp.initialEndMins;

      dragEndTimeRef.current = Date.now();
      isDraggingRef.current = false;

      if (hasChanged && dragMovedRef.current) {
        const newStart = formatMinutesToTime(currentStartMins);
        const newEnd = formatMinutesToTime(currentEndMins);
        const newTimeRange = `${newStart} - ${newEnd}`;

        let targetSlot = config.slots.find((s) => {
          const sMin = parseSlotStartMinutes(s.timeRange);
          return currentStartMins >= sMin && currentStartMins < sMin + 30;
        });

        if (!targetSlot) {
          targetSlot = currentStartMins <= firstSlotStartMins
            ? config.slots[0]
            : config.slots[config.slots.length - 1];
        }

        const targetSlotStartMins = parseSlotStartMinutes(targetSlot.timeRange);
        const spanSlots = Math.max(1, Math.ceil((currentEndMins - targetSlotStartMins) / 30));

        const updatedCells = config.cells.map((c) => {
          if (c.id === cellId) {
            const baseSub = c.subtitle ? c.subtitle.split('\n')[0] : '';
            return {
              ...c,
              slotId: targetSlot.id,
              timeRange: newTimeRange,
              spanSlots,
              subtitle: baseSub ? `${baseSub}\n${newTimeRange}` : newTimeRange,
            };
          }
          return c;
        });

        onUpdateConfig({
          ...config,
          cells: updatedCells,
        });
      }

      setActiveDragOp(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragOp, config, onUpdateConfig]);

  // Start drag operation from Top handle, Bottom handle, or Card body
  const handleStartDrag = (
    e: React.MouseEvent,
    cell: TimetableCell,
    slotIdx: number,
    day: TimetableDay,
    mode: 'resize-start' | 'resize-end' | 'move'
  ) => {
    if (e.button !== 0) return; // only left click
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    dragMovedRef.current = false;

    const currentRange = cell.timeRange || config.slots[slotIdx]?.timeRange || '4:30 - 5:30 PM';
    const { start, end } = parseTimeRange(currentRange);
    const startMins = parseTimeToMinutes(start);
    const endMins = parseTimeToMinutes(end);

    setActiveDragOp({
      cellId: cell.id,
      day,
      slotIdx,
      mode,
      startY: e.clientY,
      initialStartMins: startMins,
      initialEndMins: endMins,
      currentStartMins: startMins,
      currentEndMins: endMins,
      cellTitle: cell.title,
    });
  };

  // Quick 5-minute incremental adjustments on Start (top) or End (bottom)
  const handleAdjustClassTime = (
    cell: TimetableCell,
    slotIdx: number,
    edge: 'start' | 'end',
    deltaMinutes: number
  ) => {
    const currentRange = cell.timeRange || config.slots[slotIdx]?.timeRange || '4:30 - 5:30 PM';
    const { start, end } = parseTimeRange(currentRange);
    let startMins = parseTimeToMinutes(start);
    let endMins = parseTimeToMinutes(end);

    if (edge === 'start') {
      // -5 mins = start earlier, +5 mins = start later
      startMins = Math.max(0, startMins + deltaMinutes);
      if (startMins >= endMins - 15) {
        startMins = endMins - 15; // minimum 15-minute class
      }
    } else {
      // +5 mins = end later, -5 mins = end earlier
      endMins = Math.min(1435, endMins + deltaMinutes);
      if (endMins <= startMins + 15) {
        endMins = startMins + 15; // minimum 15-minute class
      }
    }

    const newStart = formatMinutesToTime(startMins);
    const newEnd = formatMinutesToTime(endMins);
    const newTimeRange = `${newStart} - ${newEnd}`;
    const targetSlot = config.slots.find((s) => {
      const sMin = parseSlotStartMinutes(s.timeRange);
      return startMins >= sMin && startMins < sMin + 30;
    }) || config.slots[0];

    const targetSlotStartMins = parseSlotStartMinutes(targetSlot.timeRange);
    const spanSlots = Math.max(1, Math.ceil((endMins - targetSlotStartMins) / 30));

    const updatedCells = config.cells.map((c) => {
      if (c.id === cell.id) {
        const baseSub = c.subtitle ? c.subtitle.split('\n')[0] : '';
        return {
          ...c,
          slotId: targetSlot.id,
          timeRange: newTimeRange,
          spanSlots,
          subtitle: baseSub ? `${baseSub}\n${newTimeRange}` : newTimeRange,
        };
      }
      return c;
    });

    onUpdateConfig({ ...config, cells: updatedCells });
  };

  // Reset stretched class back to standard 1-hour slot
  const handleResetStretch = (cell: TimetableCell, slotIdx: number) => {
    const slot = config.slots[slotIdx];
    const defaultRange = slot?.timeRange || '7:00 - 8:00 AM';
    const updatedCells = config.cells.map((c) => {
      if (c.id === cell.id) {
        const baseSub = c.subtitle ? c.subtitle.split('\n')[0] : '';
        return {
          ...c,
          timeRange: defaultRange,
          spanSlots: 1,
          subtitle: baseSub ? `${baseSub}\n${defaultRange}` : defaultRange,
        };
      }
      return c;
    });

    onUpdateConfig({ ...config, cells: updatedCells });
  };

  // Enforce fixed 6:00 AM - 10:00 PM (16 fixed slots)
  const handleEnforceFixed6to10 = () => {
    const remapped = config.cells.map((cell) => {
      const existingSlot = config.slots.find((s) => s.id === cell.slotId);
      const timeToExamine = cell.timeRange || cell.subtitle || existingSlot?.timeRange || '12:00';
      const minutes = parseSlotStartMinutes(timeToExamine);

      let targetSlot = FIXED_6AM_10PM_SLOTS.find((s) => {
        const slotMin = parseSlotStartMinutes(s.timeRange);
        return minutes >= slotMin && minutes < slotMin + 30;
      });

      if (!targetSlot) {
        targetSlot = minutes < 360 ? FIXED_6AM_10PM_SLOTS[0] : FIXED_6AM_10PM_SLOTS[FIXED_6AM_10PM_SLOTS.length - 1];
      }

      return {
        ...cell,
        slotId: targetSlot.id,
        timeRange: cell.timeRange || existingSlot?.timeRange || targetSlot.timeRange,
      };
    });

    onUpdateConfig({
      ...config,
      slots: FIXED_6AM_10PM_SLOTS,
      cells: remapped,
    });
    showToast('Enforced fixed 6:00 AM – 10:00 PM time slots');
  };

  // Helper to detect if there is a midday unoccupied blank gap between slots (e.g. 9 AM - 4 PM)
  const getMiddayGap = (prevRange?: string, currRange?: string) => {
    if (!prevRange || !currRange) return null;
    const { end: prevEnd } = parseTimeRange(prevRange);
    const { start: currStart } = parseTimeRange(currRange);
    const prevEndMins = parseTimeToMinutes(prevEnd);
    const currStartMins = parseTimeToMinutes(currStart);

    // If previous slot ends before or around noon (<= 12:30 PM) and next slot starts at/after 3:30 PM with gap >= 120 mins
    if (prevEndMins <= 750 && currStartMins >= 960 && currStartMins - prevEndMins >= 120) {
      return {
        gapLabel: `Gym Unoccupied / Blank Midday (${prevEnd} - ${currStart})`,
        start: prevEnd,
        end: currStart,
      };
    }
    return null;
  };

  // Count scheduled classes for a specific day
  const getDayClassesCount = (day: TimetableDay): number => {
    return config.cells.filter((c) => c.day === day && c.title.trim().length > 0).length;
  };

  // Open the Assign Class Dropdown Picker for a slot & day
  const handleOpenAssignDropdown = (slotId: string, day: TimetableDay) => {
    setAssignDropdownCell({ slotId, day });
    setAssignSearchQuery('');
    setAssignCategoryFilter('ALL');
  };

  // Close the Assign Class Dropdown Picker
  const handleCloseAssignDropdown = () => {
    setAssignDropdownCell(null);
    setAssignSearchQuery('');
    setAssignCategoryFilter('ALL');
  };

  // Instantly assign an existing class or preset to the selected timeslot cell
  const handleAssignDirect = (assigned: {
    title: string;
    subtitle?: string;
    instructor?: string;
    category?: ClassCategory;
    matId?: string;
    durationMinutes?: number;
  }) => {
    if (!assignDropdownCell) return;
    const { slotId, day } = assignDropdownCell;
    const slot = getSlot(slotId);
    const targetMatId = assigned.matId || slot?.matId || config.mats[0]?.id || 'mat-1';

    const startMins = parseSlotStartMinutes(slot?.timeRange || '6:00 AM');
    const duration = assigned.durationMinutes || 60;
    const endMins = startMins + duration;
    const computedTimeRange = `${formatMinutesToTime(startMins)} - ${formatMinutesToTime(endMins)}`;
    const spanSlots = Math.max(1, Math.ceil(duration / 30));

    let newCells: TimetableCell[] = [];
    const existing = getCell(slotId, day);

    if (existing) {
      newCells = config.cells.map((c) =>
        c.slotId === slotId && c.day === day
          ? {
              ...c,
              title: assigned.title,
              subtitle: assigned.subtitle,
              instructor: assigned.instructor || c.instructor || gymSettings.defaultCoach,
              matId: targetMatId,
              category: assigned.category || 'Adults',
              timeRange: computedTimeRange,
              spanSlots,
            }
          : c
      );
    } else {
      const newCell: TimetableCell = {
        id: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        slotId,
        day,
        title: assigned.title,
        subtitle: assigned.subtitle,
        instructor: assigned.instructor || gymSettings.defaultCoach || 'Professor Lucas Silva',
        matId: targetMatId,
        category: assigned.category || 'Adults',
        timeRange: computedTimeRange,
        spanSlots,
      };
      newCells = [...config.cells, newCell];
    }

    onUpdateConfig({
      ...config,
      cells: newCells,
    });

    handleCloseAssignDropdown();
    showToast(`Assigned "${assigned.title}" to ${day} slot`);
  };

  // Clear Slot (Unassign / Empty Mat)
  const handleClearCell = () => {
    if (!assignDropdownCell) return;
    const { slotId, day } = assignDropdownCell;
    const newCells = config.cells.filter(
      (c) => !(c.slotId === slotId && c.day === day)
    );
    onUpdateConfig({
      ...config,
      cells: newCells,
    });
    handleCloseAssignDropdown();
    showToast(`Slot cleared on ${day}`);
  };

  // Open Time Slot Modal for Add or Edit
  const handleOpenAddSlot = (defaultTime?: string) => {
    setEditingSlot(null);
    setSlotTimeRange(defaultTime || '04:00 PM - 05:15 PM');
    setSlotMatId(config.mats[0]?.id || 'mat-1');
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotTimeRange(slot.timeRange);
    setSlotMatId(slot.matId);
    setIsSlotModalOpen(true);
  };

  // Save Time Slot (Add or Update)
  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTimeRange.trim()) return;

    if (editingSlot) {
      // Update existing slot
      const newSlots = config.slots.map((s) =>
        s.id === editingSlot.id
          ? { ...s, timeRange: slotTimeRange.trim(), matId: slotMatId }
          : s
      );
      onUpdateConfig({
        ...config,
        slots: newSlots,
      });
      showToast('Time slot updated');
    } else {
      // Create new slot
      const newSlot: TimetableSlot = {
        id: `slot-${Date.now()}`,
        timeRange: slotTimeRange.trim(),
        matId: slotMatId,
      };
      onUpdateConfig({
        ...config,
        slots: [...config.slots, newSlot],
      });
      showToast('New time slot added');
    }

    setIsSlotModalOpen(false);
  };

  // Delete Time Slot Trigger
  const handleDeleteSlot = (slotId: string) => {
    const slot = getSlot(slotId);
    if (slot) {
      setSlotToDelete(slot);
    }
  };

  // Perform Slot Deletion
  const confirmDeleteSlot = () => {
    if (!slotToDelete) return;
    const slotId = slotToDelete.id;
    const newSlots = config.slots.filter((s) => s.id !== slotId);
    const newCells = config.cells.filter((c) => c.slotId !== slotId);

    onUpdateConfig({
      ...config,
      slots: newSlots,
      cells: newCells,
    });
    setSlotToDelete(null);
    setIsSlotModalOpen(false);
    showToast('Time slot removed');
  };

  // Apply Timetable Preset Layout (e.g. Morning & Evening Split, Gym Closed 9am - 4pm)
  const handleApplyTimetablePreset = (presetKey: string) => {
    const preset = ACADEMY_TIMETABLE_PRESETS.find((p) => p.id === presetKey);
    if (!preset) return;

    // Build new slots
    const newSlots: TimetableSlot[] = preset.slots.map((s, idx) => ({
      id: `slot-preset-${idx + 1}-${Date.now()}`,
      timeRange: s.timeRange,
      matId: config.mats[0]?.id || 'mat-1',
    }));

    onUpdateConfig({
      ...config,
      slots: newSlots,
    });
    setIsPresetsModalOpen(false);
    showToast(`Applied "${preset.name}" schedule layout!`);
  };

  // Quick remove empty unoccupied slots
  const handleClearEmptySlots = () => {
    const occupiedSlotIds = new Set(
      config.cells.filter((c) => c.title && c.title.trim().length > 0).map((c) => c.slotId)
    );
    const newSlots = config.slots.filter((s) => occupiedSlotIds.has(s.id));
    if (newSlots.length === 0) {
      showToast('Cannot clear: all slots would be deleted');
      return;
    }
    onUpdateConfig({
      ...config,
      slots: newSlots,
    });
    showToast(`Removed unoccupied empty rows (${config.slots.length - newSlots.length} removed)`);
  };

  // Toggle Friday in timetable days
  const handleToggleFriday = () => {
    const hasFriday = config.days.includes('FRI');
    let newDays: TimetableDay[];
    if (hasFriday) {
      newDays = config.days.filter((d) => d !== 'FRI');
      showToast('Friday removed from matboard');
    } else {
      newDays = [...config.days, 'FRI'];
      showToast('Friday included in matboard');
    }
    onUpdateConfig({
      ...config,
      days: newDays,
    });
  };

  // Save Mat Colors & Names
  const handleSaveMats = () => {
    onUpdateConfig({
      ...config,
      mats: matsList,
    });
    setIsMatModalOpen(false);
    showToast('Mat settings updated');
  };

  // Reset to default sample timetable trigger
  const handleResetToDefaults = () => {
    setIsConfirmingReset(true);
  };

  // Perform Reset to defaults
  const confirmResetDefaults = () => {
    onUpdateConfig(DEFAULT_TIMETABLE_CONFIG);
    setMatsList(DEFAULT_TIMETABLE_CONFIG.mats);
    setIsConfirmingReset(false);
    showToast('Matboard reset to default schedule');
  };

  // Extract as PNG
  const handleExtractPNG = async () => {
    if (!gridContainerRef.current) return;
    setIsExportingPng(true);

    try {
      const element = gridContainerRef.current;
      const dataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: theme === 'light' ? '#ffffff' : '#0c0a09',
        filter: (node) => {
          if (node instanceof HTMLElement && node.getAttribute('data-export-ignore') === 'true') {
            return false;
          }
          return true;
        },
      });

      const downloadLink = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadLink.download = `matboard-${selectedDayView.toLowerCase()}-${dateStr}.png`;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Could not export PNG image. Please try again.');
    } finally {
      setIsExportingPng(false);
    }
  };

  // Extract as PDF
  const handleExtractPDF = async () => {
    if (!gridContainerRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = gridContainerRef.current;
      const dataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: theme === 'light' ? '#ffffff' : '#0c0a09',
        filter: (node) => {
          if (node instanceof HTMLElement && node.getAttribute('data-export-ignore') === 'true') {
            return false;
          }
          return true;
        },
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      const isLandscape = imgWidth >= imgHeight;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const scaleRatio = Math.min(
        availableWidth / (imgWidth / 2),
        availableHeight / (imgHeight / 2)
      );

      const renderWidth = (imgWidth / 2) * scaleRatio;
      const renderHeight = (imgHeight / 2) * scaleRatio;

      const xOffset = margin + (availableWidth - renderWidth) / 2;
      const yOffset = margin + (availableHeight - renderHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, renderWidth, renderHeight);

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`matboard-${selectedDayView.toLowerCase()}-${dateStr}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Could not export PDF document. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Category Badge Helper with vivid styling
  const renderCategoryBadge = (category?: ClassCategory) => {
    switch (category) {
      case 'Kids':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-600/70 shadow-xs">
            Kids
          </span>
        );
      case 'Teens':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-600/70 shadow-xs">
            Teens
          </span>
        );
      case 'Adults':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-stone-900 text-stone-200 border border-stone-700 shadow-xs">
            Adults
          </span>
        );
    }
  };

  // Filtered live classes for the assign dropdown - ONLY registered academy classes
  const filteredLiveClasses = classes.filter((c) => {
    if (assignCategoryFilter !== 'ALL' && c.category !== assignCategoryFilter) return false;
    if (!assignSearchQuery) return true;
    const q = assignSearchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.coach && c.coach.toLowerCase().includes(q)) ||
      (c.headCoachName && c.headCoachName.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.type && c.type.toLowerCase().includes(q)) ||
      (c.room && c.room.toLowerCase().includes(q)) ||
      (c.daysOfWeek && c.daysOfWeek.some((d) => d.toLowerCase().includes(q)))
    );
  });

  // Calculate day index navigation in single day view
  const currentDayIndex = config.days.indexOf(selectedDayView as TimetableDay);
  const prevDay = currentDayIndex > 0 ? config.days[currentDayIndex - 1] : null;
  const nextDay =
    currentDayIndex >= 0 && currentDayIndex < config.days.length - 1
      ? config.days[currentDayIndex + 1]
      : null;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar: Day Tabs, Export Options & Actions */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4">
        {/* Row 1: Header Title & Export Tools */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Matboard</span>
                </h2>
                <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
                  Interactive schedule of training mats and day sessions. Click any day to focus or select any slot to assign a class.
                </p>
              </div>
            </div>
          </div>

          {/* Export Actions & Row Management */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Consolidated Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={isExportingPng || isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 hover:border-stone-600 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                title="Export schedule as PNG image or printable PDF"
              >
                {isExportingPng || isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExtractPNG();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-stone-200 hover:text-white hover:bg-stone-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-red-400" />
                    <span>Download PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExtractPDF();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-stone-200 hover:text-white hover:bg-stone-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-red-400" />
                    <span>Download PDF</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleOpenAddSlot('04:00 PM - 05:15 PM')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer"
              title="Add a new time slot row"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Slot</span>
            </button>

            <div className="flex items-center gap-1 border-l border-stone-800 pl-2">
              <button
                onClick={() => setIsMatModalOpen(true)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                title="Configure Mat Names & Colors"
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleFriday}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                  config.days.includes('FRI')
                    ? 'bg-red-950/40 text-red-300 border-red-500/40'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                }`}
                title="Toggle Friday column on/off"
              >
                Fri {config.days.includes('FRI') ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={handleResetToDefaults}
                className="p-2 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                title="Reset to default academy mat schedule"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Weekly Grid Summary Bar */}
        <div className="border-t border-stone-800 pt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-500" />
              <span className="text-xs font-black text-stone-200">
                Weekly Matboard Grid ({config.cells.filter(c => c.title.trim()).length} Active Sessions)
              </span>
            </div>
          </div>
          <div className="text-[11px] text-stone-400 font-medium">
            Showing full weekly timetable schedule for all mats and training days
          </div>
        </div>
      </div>

      {/* FULL MULTI-DAY TIME GRID (30-Minute Blocks with Multi-Slot Spanning) */}
      <div className="overflow-x-auto rounded-2xl shadow-2xl border border-stone-800">
        <div
          ref={gridContainerRef}
          className="min-w-[980px] bg-stone-900 select-none"
        >
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="border-b border-stone-800 text-center">
                {/* TOP-LEFT CORNER BOX: TIME / DAY */}
                <th className={`w-[140px] p-3.5 border-r text-center transition-colors ${
                  theme === 'light'
                    ? 'bg-stone-200 border-stone-300 text-stone-900 font-black'
                    : 'bg-stone-950 border-stone-800 text-white'
                }`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-stone-700' : 'text-stone-400'}`} />
                    <span className={`font-extrabold text-xs sm:text-sm tracking-wider ${
                      theme === 'light' ? 'text-stone-900' : 'text-white'
                    }`}>
                      TIME
                    </span>
                    <span className={theme === 'light' ? 'text-stone-500 font-bold text-xs' : 'text-stone-500 font-bold text-xs'}>/</span>
                    <span className={`font-black text-xs sm:text-sm tracking-wider ${
                      theme === 'light' ? 'text-stone-900' : 'text-white'
                    }`}>
                      DAY
                    </span>
                  </div>
                </th>

                {/* Day Column Headers */}
                {config.days.map((day) => (
                  <th
                    key={day}
                    className="py-3 px-2 bg-stone-900 border-r border-stone-800 text-center font-normal"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-sm font-black text-white tracking-widest">
                        {day}
                      </span>
                      <span className="text-[10px] text-stone-400 font-semibold tracking-wide">
                        {DAY_LABELS[day].full}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-800/80">
              {config.slots.map((slot, slotIdx) => {
                return (
                  <tr key={slot.id} className="min-h-[58px]">
                    {/* Time Slot Column Header (Clean, Pure & Static Time) */}
                    <td
                      className="w-[140px] px-3 py-2 bg-stone-950 border-r border-stone-800 text-center align-middle select-none"
                    >
                      <span className="font-mono-digits font-extrabold text-xs text-stone-200 tracking-tight">
                        {slot.timeRange}
                      </span>
                    </td>

                    {/* Day Cells in this 30-minute time slot */}
                    {config.days.map((day) => {
                      if (isCoveredByEarlierSlot(day, slotIdx)) {
                        return null; // Spanned across from earlier slot via rowSpan
                      }

                      const cell = getStartingCell(slotIdx, day);
                      const hasClass = cell && cell.title.trim().length > 0;
                      const isLight = theme === 'light';

                      if (hasClass && cell) {
                        const cellMat = cell.matId ? getMat(cell.matId) : config.mats[0];
                        const isDraggingThisCell =
                          activeDragOp !== null &&
                          activeDragOp.cellId === cell.id;

                        // Slot Start Minutes (from the grid slot row)
                        const slotStartMins = parseSlotStartMinutes(slot.timeRange);

                        // Parse time range
                        const parsedStartMins = parseSlotStartMinutes(cell.timeRange || slot.timeRange);
                        const parsedEndMins = parseSlotEndMinutes(cell.timeRange || slot.timeRange);

                        // If currently dragging / resizing, use live minutes
                        const effectiveStartMins = isDraggingThisCell && activeDragOp
                          ? activeDragOp.currentStartMins
                          : parsedStartMins;
                        const effectiveEndMins = isDraggingThisCell && activeDragOp
                          ? activeDragOp.currentEndMins
                          : parsedEndMins;
                        const effectiveDuration = Math.max(15, effectiveEndMins - effectiveStartMins);

                        // Fixed table row span based on committed cell duration
                        const spanSlots = getCellSpanSlots(cell, slot.timeRange);

                        // Pixel-precise positioning (58px per 30 minutes)
                        const pxPerMin = 58 / 30;
                        const topPx = (effectiveStartMins - slotStartMins) * pxPerMin;
                        const heightPx = Math.max(40, effectiveDuration * pxPerMin - 4);

                        const slotBg = isLight
                          ? '#ffffff'
                          : (cellMat?.bgColor || '#242838');

                        const matAccentColor = cellMat?.bgColor || '#d97706';
                        const coachName = getCellCoachName(cell);
                        const formattedStart = formatMinutesToTime(effectiveStartMins);
                        const formattedEnd = formatMinutesToTime(effectiveEndMins);

                        return (
                          <td
                            key={`${slot.id}-${day}`}
                            rowSpan={spanSlots}
                            onClick={(e) => {
                              // If user was just dragging or active drag is in progress, never open edit modal
                              if (
                                isDraggingRef.current ||
                                activeDragOp !== null ||
                                Date.now() - dragEndTimeRef.current < 400
                              ) {
                                return;
                              }
                              // Only open assign dropdown if clicking directly on background area
                              if (e.target === e.currentTarget) {
                                handleOpenAssignDropdown(slot.id, day);
                              }
                            }}
                            className={`p-1.5 border-r border-b border-stone-800/80 align-top transition-all relative select-none overflow-visible ${
                              isLight
                                ? 'bg-stone-100/40'
                                : 'bg-stone-950/40'
                            }`}
                            style={{
                              height: `${spanSlots * 58}px`,
                              minHeight: `${spanSlots * 58}px`,
                            }}
                          >
                            {/* Full Spanned Grid Area Container */}
                            <div className="relative w-full h-full overflow-visible">
                              
                              {/* EXACT PROPORTIONALLY POSITIONED CLASS CARD */}
                              <div
                                className={`absolute inset-x-0 rounded-xl transition-[border,box-shadow,background-color] flex flex-col justify-between overflow-visible group select-none ${
                                  isDraggingThisCell
                                    ? 'ring-2 ring-red-500 bg-red-500/30 border-2 border-red-500 z-40 shadow-2xl cursor-grabbing'
                                    : isLight
                                    ? 'matboard-cell-occupied border border-stone-300 hover:border-red-500/80 hover:shadow-md shadow-xs'
                                    : 'text-white hover:brightness-110 shadow-lg border border-white/10 hover:border-red-500/50'
                                }`}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                  backgroundColor: slotBg,
                                  borderLeft: isLight ? `4px solid ${matAccentColor}` : `3px solid ${matAccentColor}`,
                                }}
                                onClick={(e) => {
                                  // Prevent clicks on card from opening edit modal (use edit button instead)
                                  e.stopPropagation();
                                }}
                              >
                                {/* TOP SECTION: TOP RESIZE HANDLE & START TIME (Draggable from top to stretch time) */}
                                <div
                                  className="w-full pt-1 px-1.5 flex flex-col items-center justify-start z-30 cursor-ns-resize group/tophandle select-none shrink-0"
                                  onMouseDown={(e) => handleStartDrag(e, cell, slotIdx, day, 'resize-start')}
                                  title="Drag UP/DOWN to stretch start time"
                                >
                                  {/* Top Resize Grip Handle Pill */}
                                  <div
                                    className={`px-2.5 py-0.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-[9px] cursor-ns-resize shadow-md flex items-center justify-center gap-0.5 border border-stone-900 select-none transition-all hover:scale-105 ${
                                      isDraggingThisCell && activeDragOp?.mode === 'resize-start'
                                        ? 'opacity-100 scale-105 ring-2 ring-red-400'
                                        : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                    data-export-ignore="true"
                                  >
                                    <ChevronUp className="w-2.5 h-2.5" />
                                    <span className="font-mono text-[9px] font-black uppercase tracking-wider">Start</span>
                                    <ChevronDown className="w-2.5 h-2.5" />
                                  </div>

                                  {/* START TIME DISPLAY AT TOP OF CLASS */}
                                  <div className="mt-0.5 flex items-center justify-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/80 text-stone-200 border border-stone-800 text-[10px] font-mono font-black tracking-tight shadow-xs select-none pointer-events-none">
                                    <Clock className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                                    <span>Start: {formattedStart}</span>
                                  </div>
                                </div>

                                {/* Floating Live Feedback Badge - dynamically positioned near active drag edge */}
                                {isDraggingThisCell && activeDragOp && (
                                  <div
                                    className={`absolute left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-xs shadow-2xl flex items-center gap-1.5 whitespace-nowrap pointer-events-none border-2 border-stone-950 ${
                                      activeDragOp.mode === 'resize-end' ? '-bottom-10' : '-top-10'
                                    }`}
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                      {activeDragOp.mode === 'resize-start'
                                        ? '▲ Start: '
                                        : activeDragOp.mode === 'resize-end'
                                        ? '▼ End: '
                                        : '⇕ Move: '}
                                      <strong>{formatMinutesToTime(activeDragOp.currentStartMins)}</strong> – <strong>{formatMinutesToTime(activeDragOp.currentEndMins)}</strong> ({activeDragOp.currentEndMins - activeDragOp.currentStartMins}m)
                                    </span>
                                  </div>
                                )}

                                {/* MIDDLE BODY: CLASS TITLE & COACH (Drag here to move entire class) */}
                                <div
                                  className="flex-1 flex flex-col justify-center items-center text-center px-2 py-1 min-h-0 w-full cursor-grab active:cursor-grabbing select-none"
                                  onMouseDown={(e) => {
                                    // Dragging middle shifts whole class time
                                    handleStartDrag(e, cell, slotIdx, day, 'move');
                                  }}
                                >
                                  {/* Class Title */}
                                  <h4 className={`text-xs sm:text-[13px] font-black leading-snug tracking-tight text-center ${
                                    isLight ? 'matboard-cell-title text-stone-950' : 'text-white drop-shadow-xs'
                                  }`}>
                                    {cell.title}
                                  </h4>

                                  {/* Coach Name Only */}
                                  <div className={`flex items-center justify-center gap-1 text-[11px] font-bold tracking-tight mt-0.5 ${
                                    isLight ? 'text-stone-700' : 'text-stone-300'
                                  }`}>
                                    <User className="w-3 h-3 shrink-0 opacity-80" />
                                    <span className="truncate max-w-[140px]">{coachName}</span>
                                  </div>
                                </div>

                                {/* BOTTOM SECTION: END TIME & BOTTOM RESIZE HANDLE */}
                                <div
                                  className="w-full pb-1 px-1.5 flex flex-col items-center justify-end z-30 cursor-ns-resize group/bothandle select-none shrink-0"
                                  onMouseDown={(e) => handleStartDrag(e, cell, slotIdx, day, 'resize-end')}
                                  title="Drag UP/DOWN to stretch end time"
                                >
                                  {/* END TIME DISPLAY AT BOTTOM OF CLASS */}
                                  <div className="mb-0.5 flex items-center justify-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/80 text-stone-200 border border-stone-800 text-[10px] font-mono font-black tracking-tight shadow-xs select-none pointer-events-none">
                                    <Clock className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                                    <span>End: {formattedEnd} ({effectiveDuration}m)</span>
                                  </div>

                                  {/* Bottom Resize Grip Handle Pill */}
                                  <div
                                    className={`px-2.5 py-0.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-[9px] cursor-ns-resize shadow-md flex items-center justify-center gap-0.5 border border-stone-900 select-none transition-all hover:scale-105 ${
                                      isDraggingThisCell && activeDragOp?.mode === 'resize-end'
                                        ? 'opacity-100 scale-105 ring-2 ring-red-400'
                                        : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                    data-export-ignore="true"
                                  >
                                    <ChevronUp className="w-2.5 h-2.5" />
                                    <span className="font-mono text-[9px] font-black uppercase tracking-wider">End</span>
                                    <ChevronDown className="w-2.5 h-2.5" />
                                  </div>
                                </div>

                                {/* Dedicated Edit / Reassign button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleOpenAssignDropdown(slot.id, day);
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 hover:bg-red-600 hover:text-white p-1.5 rounded-lg text-stone-200 border border-white/10 shadow-md cursor-pointer z-40"
                                  title="Edit or change class assignment"
                                  data-export-ignore="true"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>

                            </div>
                          </td>
                        );
                      }

                      // Empty unoccupied 30-min slot
                      return (
                        <td
                          key={`${slot.id}-${day}`}
                          onClick={() => handleOpenAssignDropdown(slot.id, day)}
                          className="p-1.5 h-[58px] border-r border-stone-800 bg-stone-900/40 hover:bg-stone-800/50 cursor-pointer align-middle text-center group"
                        >
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-red-400 bg-stone-950/80 px-2 py-1 rounded-md border border-stone-800">
                              <Plus className="w-3 h-3" />
                              <span>Assign</span>
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DROPDOWN / ASSIGN CLASS POPUP MODAL */}
      {/* DROPDOWN / ASSIGN CLASS POPUP MODAL - STRICTLY ASSIGN FROM REGISTERED CLASSES ONLY */}
      {assignDropdownCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Assign Class to Timeslot</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/40 text-red-300 border border-red-500/30">
                      Official Gym Classes Only
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    {DAY_LABELS[assignDropdownCell.day].full} •{' '}
                    {getSlot(assignDropdownCell.slotId)?.timeRange || 'Selected Slot'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAssignDropdown}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions Bar: Manage Classes & Clear Slot */}
            <div className="p-3 sm:p-4 border-b border-stone-800 bg-stone-900 flex items-center justify-end gap-2">
              {onSaveClass && (
                <button
                  type="button"
                  onClick={() => setIsManageClassesOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 hover:border-red-500/50 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="Open classes directory to edit classes or add a new class"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Manage Classes</span>
                </button>
              )}

              {getCell(assignDropdownCell.slotId, assignDropdownCell.day) && (
                <button
                  type="button"
                  onClick={handleClearCell}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Remove class from this slot"
                >
                  Clear Slot
                </button>
              )}
            </div>

            {/* Modal Body: ONLY Registered Gym Classes */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Academy Classes Registry ({filteredLiveClasses.length})</span>
                </span>
                <span className="text-[11px] text-stone-400">Click any class to assign to this timeslot</span>
              </div>

              {filteredLiveClasses.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-xl bg-stone-950/60 border border-dashed border-stone-800 space-y-2">
                  <BookOpen className="w-8 h-8 text-stone-600 mx-auto" />
                  <h4 className="text-xs font-bold text-white">No matching classes found</h4>
                  <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                    {assignSearchQuery
                      ? 'No registered academy classes match your search query.'
                      : 'No classes found in the registry. Use the Manage Classes button to add new classes.'}
                  </p>
                  {onSaveClass && (
                    <button
                      type="button"
                      onClick={() => setIsManageClassesOpen(true)}
                      className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Class</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredLiveClasses.map((cls) => {
                    const daysStr = cls.daysOfWeek ? cls.daysOfWeek.join(', ') : '';

                    return (
                      <div
                        key={cls.id}
                        onClick={() =>
                          handleAssignDirect({
                            title: cls.title,
                            subtitle: `${cls.type || 'Gi'}${cls.room ? ` • ${cls.room}` : ''}`,
                            instructor: cls.headCoachName || cls.coach.replace(' (Head Coach)', '') || gymSettings.defaultCoach,
                            category: cls.category,
                            durationMinutes: cls.durationMinutes,
                          })
                        }
                        className="p-3.5 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 hover:border-red-500/60 cursor-pointer transition-all group shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-red-300 transition-colors">
                              {cls.title}
                            </h4>
                            {renderCategoryBadge(cls.category)}
                          </div>

                          <div className="space-y-0.5 text-[11px] text-stone-400">
                            <p>
                              Coach: <strong className="text-stone-300">{cls.headCoachName || cls.coach.replace(' (Head Coach)', '')}</strong>
                            </p>
                            <p>
                              Style: <span className="text-stone-300 font-medium">{cls.type}</span>
                              {cls.room && <span> • {cls.room}</span>}
                            </p>
                            {daysStr && (
                              <p className="text-[10px] text-stone-500 font-mono-digits">
                                Scheduled: {daysStr}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-stone-500 text-[10px]">
                            {cls.durationMinutes || 75} min session
                          </span>
                          <span className="font-extrabold text-red-400 group-hover:text-red-300 inline-flex items-center gap-1 text-[11px]">
                            <span>Select & Assign</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-xs">
              <span className="text-stone-400 text-[11px]">
                Only official registered gym classes are assignable to Matboard slots.
              </span>
              <button
                type="button"
                onClick={handleCloseAssignDropdown}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Academy Classes Modal from Matboard */}
      {isManageClassesOpen && onSaveClass && (
        <EditClassModal
          isOpen={isManageClassesOpen}
          onClose={() => setIsManageClassesOpen(false)}
          classes={classes}
          classSession={null}
          coaches={coaches}
          onSaveClass={(saved) => {
            onSaveClass(saved);
            showToast(`Saved "${saved.title}" to gym registry!`);
          }}
          onDeleteClass={onDeleteClass}
        />
      )}

      {/* EDIT TIME SLOT MODAL (Row Time Range & Mat) */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingSlot ? 'Edit Time Slot Row' : 'Add Time Slot Row'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Select start and end time with mouse clicks
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              {/* Mouse-Only Time Range Picker */}
              <div className="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800">
                <MouseTimeRangePicker
                  value={slotTimeRange || '04:00 PM - 05:15 PM'}
                  onChange={(newRange) => setSlotTimeRange(newRange)}
                  label="Matboard Time Range (Mouse Select)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Assigned Mat Area
                </label>
                <select
                  value={slotMatId}
                  onChange={(e) => setSlotMatId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-400 cursor-pointer"
                >
                  {config.mats.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                {editingSlot ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteSlot(editingSlot.id);
                      setIsSlotModalOpen(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Row</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSlotModalOpen(false)}
                    className="px-3 py-1.5 bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs shadow-md cursor-pointer"
                  >
                    {editingSlot ? 'Save Time Slot' : 'Add Time Slot'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRESETS & FLEXIBLE SCHEDULE LAYOUTS MODAL */}
      {isPresetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Matboard Schedule Layouts & Operating Hours
                  </h3>
                  <p className="text-xs text-stone-400">
                    Quickly adapt your timetable to your academy's real operating schedule
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPresetsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets List */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {ACADEMY_TIMETABLE_PRESETS.map((preset) => {
                  const isCurrentSplit = preset.id === 'split-morning-evening';
                  return (
                    <div
                      key={preset.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrentSplit
                          ? 'bg-red-950/20 border-red-500/50 hover:border-red-400'
                          : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                            <span>{preset.name}</span>
                            {isCurrentSplit && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/40 text-red-300 border border-red-500/40">
                                Recommended
                              </span>
                            )}
                          </h4>
                        </div>
                        <p className="text-xs text-stone-400">{preset.description}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {preset.slots.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-900 border border-stone-700/80 text-stone-300"
                            >
                              {s.timeRange}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyTimetablePreset(preset.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs shrink-0 self-start sm:self-center shadow-md cursor-pointer transition-transform active:scale-95"
                      >
                        Apply Layout
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Maintenance / Clean Actions */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-stone-400">
                  Clean up table by removing empty unoccupied rows:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleClearEmptySlots();
                    setIsPresetsModalOpen(false);
                  }}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white rounded-xl text-xs font-bold border border-stone-700 cursor-pointer"
                >
                  Remove Unoccupied Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAT CONFIGURATION MODAL */}
      {isMatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <h3 className="text-base font-black text-white">Configure Mat Rooms</h3>
              <button
                type="button"
                onClick={() => setIsMatModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {matsList.map((m, idx) => (
                <div key={m.id} className="p-3 bg-stone-800/80 rounded-xl border border-stone-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Mat #{idx + 1}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-xs"
                      style={{ backgroundColor: m.bgColor }}
                    >
                      {m.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => {
                          const updated = [...matsList];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setMatsList(updated);
                        }}
                        className="w-full px-2 py-1 bg-stone-700 border border-stone-600 rounded text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Theme Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={m.bgColor}
                          onChange={(e) => {
                            const updated = [...matsList];
                            updated[idx] = { ...updated[idx], bgColor: e.target.value };
                            setMatsList(updated);
                          }}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono text-stone-300">{m.bgColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMatModalOpen(false)}
                  className="px-3 py-1.5 bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMats}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Save Mat Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP TIME SLOT DELETE CONFIRMATION MODAL */}
      {slotToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Time Slot Row?</h3>
                <p className="text-xs text-stone-400">This will remove this time slot from the matboard.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-1 text-xs">
              <p className="font-mono-digits font-bold text-white text-sm">{slotToDelete.timeRange}</p>
              <p className="text-stone-400">
                All classes assigned to this time row across all days will be unassigned.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSlot}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP RESET TO DEFAULTS CONFIRMATION MODAL */}
      {isConfirmingReset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Reset Matboard to Defaults?</h3>
                <p className="text-xs text-stone-400">Restore factory time slots and demo timetable.</p>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              This will reset all matboard rows, assigned slots, and mat definitions back to the original standard template. Custom changes to this timetable will be replaced.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmingReset(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetDefaults}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
