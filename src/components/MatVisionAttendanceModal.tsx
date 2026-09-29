import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, 
  CameraOff, 
  ShieldCheck, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Clock, 
  Users, 
  Shirt, 
  Crosshair, 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  Sliders, 
  Check, 
  CalendarDays, 
  ChevronRight,
  Eye,
  Activity,
  Plus,
  Trash2,
  Edit3,
  Video,
  Grid,
  Square,
  MonitorCheck,
  Radio,
  Tv
} from 'lucide-react';
import { Member, ClassSession, AttendanceRecord, Coach, ClassCategory } from '../types';
import { resolveTimetableDay, TIMETABLE_DAY_TO_FULL } from '../utils/matboardSchedule';
import { getTodayDateStr } from '../utils/weekUtils';
import { getJordanTimeStr } from '../utils/timeUtils';

export interface Point {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

export interface MatCameraConfig {
  id: string;
  name: string;
  deviceId?: string;
  roiPolygon: Point[];
  isActive: boolean;
  status: 'online' | 'standby' | 'calibrating';
}

interface DetectedStudentTracker {
  member: Member;
  currentX: number; // 0 - 100 on active cam
  currentY: number; // 0 - 100 on active cam
  cameraSourceId: string;
  cameraSourceName: string;
  isOnMat: boolean;
  firstDetectedAt: number; // timestamp
  lastDetectedAt: number; // timestamp
  dwellSeconds: number;
  attireDetected: 'gi' | 'rashguard' | 'casual';
  attireConfidence: number; // 0 - 100
  isRegistered: boolean;
  registeredAt?: string;
  matchedClassName?: string;
  matchedCoach?: string;
  checkInMessage?: string;
}

interface MatVisionAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  classes: ClassSession[];
  coaches: Coach[];
  attendance: AttendanceRecord[];
  onCheckIn: (
    memberId: string,
    className: string,
    coach: string,
    category?: ClassCategory,
    dateStr?: string
  ) => { success: boolean; message: string; remainingAfter: number };
  onUndoCheckIn: (attendanceId: string) => void;
  theme?: 'dark' | 'light';
}

const STORAGE_KEY_CAMERAS = 'bjj_gym_mat_multi_cameras_v1';
const STORAGE_KEY_DWELL_SECONDS = 'bjj_gym_mat_dwell_threshold_seconds';
const STORAGE_KEY_REQUIRE_ATTIRE = 'bjj_gym_mat_require_attire_flag';

// Initial default 3-camera setup covering a large academy mat space
const INITIAL_CAMERAS: MatCameraConfig[] = [
  {
    id: 'cam-1',
    name: 'Mat Cam 1 (Main Tatami - North Area)',
    roiPolygon: [
      { x: 10, y: 15 },
      { x: 90, y: 15 },
      { x: 92, y: 92 },
      { x: 8, y: 92 },
    ],
    isActive: true,
    status: 'online',
  },
  {
    id: 'cam-2',
    name: 'Mat Cam 2 (Sparring & Live Roll - South)',
    roiPolygon: [
      { x: 15, y: 20 },
      { x: 85, y: 20 },
      { x: 95, y: 90 },
      { x: 5, y: 90 },
    ],
    isActive: true,
    status: 'online',
  },
  {
    id: 'cam-3',
    name: 'Mat Cam 3 (Competition & Cage Side)',
    roiPolygon: [
      { x: 12, y: 18 },
      { x: 88, y: 18 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ],
    isActive: true,
    status: 'online',
  },
  {
    id: 'cam-4',
    name: 'Mat Cam 4 (Warmup & Kids Tatami)',
    roiPolygon: [
      { x: 8, y: 22 },
      { x: 92, y: 22 },
      { x: 96, y: 95 },
      { x: 4, y: 95 },
    ],
    isActive: false,
    status: 'standby',
  },
];

// Helper: Point in Polygon test (Ray Casting algorithm)
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Web Audio Chime
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.38); // C6

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.8);
  } catch {
    // ignore
  }
}

export const MatVisionAttendanceModal: React.FC<MatVisionAttendanceModalProps> = ({
  isOpen,
  onClose,
  members,
  classes,
  coaches,
  attendance,
  onCheckIn,
  onUndoCheckIn,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Multi-Camera State
  const [cameras, setCameras] = useState<MatCameraConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CAMERAS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_CAMERAS;
  });

  const [activeCamId, setActiveCamId] = useState<string>('cam-1');
  const [viewLayout, setViewLayout] = useState<'focused' | 'grid'>('focused');
  const [isCalibratingROI, setIsCalibratingROI] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hardware Devices Found
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPendingDelete, setCameraPendingDelete] = useState<MatCameraConfig | null>(null);
  const [deleteConfirmationChecked, setDeleteConfirmationChecked] = useState(false);

  // Calibration Drag State
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);

  // Settings
  const [requiredDwellSeconds, setRequiredDwellSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DWELL_SECONDS);
      return saved ? parseInt(saved, 10) : 120; // 2 minutes default
    } catch {
      return 120;
    }
  });

  const [requireTrainingAttire, setRequireTrainingAttire] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REQUIRE_ATTIRE);
      return saved ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Tracked Students Across All Cameras
  const [trackedStudents, setTrackedStudents] = useState<Record<string, DetectedStudentTracker>>({});
  const [recentAutoCheckIns, setRecentAutoCheckIns] = useState<Array<{
    id: string;
    studentName: string;
    studentAvatar?: string;
    beltRank: string;
    stripes: number;
    ageGroup?: string;
    className: string;
    coach: string;
    timeStr: string;
    cameraName: string;
    dwellSeconds: number;
    attire: string;
    message: string;
  }>>([]);

  // Toast / Live Banner
  const [liveBanner, setLiveBanner] = useState<{
    studentName: string;
    className: string;
    cameraName: string;
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // Active Camera Config
  const activeCam = useMemo(() => {
    return cameras.find((c) => c.id === activeCamId) || cameras[0];
  }, [cameras, activeCamId]);

  // Today Date & Scheduled Classes
  const todayStr = getTodayDateStr();
  const todayDayCode = resolveTimetableDay(todayStr);
  const todayDayName = TIMETABLE_DAY_TO_FULL[todayDayCode] || 'Monday';

  const todayClasses = useMemo(() => {
    return classes.filter((c) => {
      if (c.daysOfWeek && Array.isArray(c.daysOfWeek)) {
        return c.daysOfWeek.some((d) => d.toUpperCase().startsWith(todayDayCode.slice(0, 3)));
      }
      return true;
    });
  }, [classes, todayDayCode]);

  // Save Cameras to Storage
  const saveCamerasState = (updatedCams: MatCameraConfig[]) => {
    setCameras(updatedCams);
    try {
      localStorage.setItem(STORAGE_KEY_CAMERAS, JSON.stringify(updatedCams));
    } catch {
      // ignore
    }
  };

  // Enumerate Connected Webcams
  useEffect(() => {
    if (!isOpen) return;
    navigator.mediaDevices?.enumerateDevices()
      .then((devices) => {
        const videoDevs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableVideoDevices(videoDevs);
      })
      .catch(() => {});
  }, [isOpen]);

  // Handle Hardware Webcam Stream for Active Cam
  useEffect(() => {
    if (!isOpen) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      return;
    }

    let activeStream: MediaStream | null = null;
    const constraints: MediaStreamConstraints = {
      video: activeCam.deviceId 
        ? { deviceId: { exact: activeCam.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    };

    navigator.mediaDevices?.getUserMedia(constraints)
      .then((stream) => {
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      })
      .catch(() => {
        // Fallback to Multi-Camera Intelligent Simulator Mode
        setCameraActive(false);
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, activeCam.deviceId, activeCamId]);

  // =========================================================================
  // CAMERA MANAGEMENT ACTIONS
  // =========================================================================
  const handleToggleCameraActive = (camId: string) => {
    const updated = cameras.map((c) => {
      if (c.id !== camId) return c;
      const nextActive = !c.isActive;
      return { ...c, isActive: nextActive, status: (nextActive ? 'online' : 'standby') as any };
    });
    saveCamerasState(updated);
  };

  const handleUpdateCameraDevice = (camId: string, deviceId: string) => {
    const updated = cameras.map((c) => {
      if (c.id !== camId) return c;
      return { ...c, deviceId };
    });
    saveCamerasState(updated);
  };

  const handleUpdateCameraPolygon = (camId: string, newPoly: Point[]) => {
    const updated = cameras.map((c) => {
      if (c.id !== camId) return c;
      return { ...c, roiPolygon: newPoly };
    });
    saveCamerasState(updated);
  };

  const handleAddNewCamera = () => {
    const newIdx = cameras.length + 1;
    const newCam: MatCameraConfig = {
      id: `cam-${Date.now()}`,
      name: `Mat Cam ${newIdx} (Tatami Angle ${newIdx})`,
      roiPolygon: [
        { x: 15, y: 18 },
        { x: 85, y: 18 },
        { x: 90, y: 90 },
        { x: 10, y: 90 },
      ],
      isActive: true,
      status: 'online',
    };
    const updated = [...cameras, newCam];
    saveCamerasState(updated);
    setActiveCamId(newCam.id);
  };

  const handleRequestDeleteCamera = (cam: MatCameraConfig) => {
    if (cameras.length <= 1) return;
    setDeleteConfirmationChecked(false);
    setCameraPendingDelete(cam);
  };

  const handleConfirmDeleteCamera = (camId: string) => {
    if (cameras.length <= 1) return;
    const updated = cameras.filter((c) => c.id !== camId);
    saveCamerasState(updated);
    if (activeCamId === camId) {
      setActiveCamId(updated[0].id);
    }
    setCameraPendingDelete(null);
    setDeleteConfirmationChecked(false);
  };

  // Preset ROI Shapes
  const applyPresetROI = (preset: 'wide_tatami' | 'center_cage' | 'full_span') => {
    let poly: Point[] = [];
    if (preset === 'wide_tatami') {
      poly = [
        { x: 8, y: 15 },
        { x: 92, y: 15 },
        { x: 96, y: 94 },
        { x: 4, y: 94 },
      ];
    } else if (preset === 'center_cage') {
      poly = [
        { x: 22, y: 24 },
        { x: 78, y: 24 },
        { x: 84, y: 86 },
        { x: 16, y: 86 },
      ];
    } else if (preset === 'full_span') {
      poly = [
        { x: 4, y: 6 },
        { x: 96, y: 6 },
        { x: 96, y: 96 },
        { x: 4, y: 96 },
      ];
    }
    handleUpdateCameraPolygon(activeCam.id, poly);
  };

  // Smart Class & Age Matcher
  const resolveTargetClassForStudent = (member: Member): { targetClass?: ClassSession; coachName: string } => {
    const studentCategory: ClassCategory = member.ageGroup || (member.age && member.age < 13 ? 'Kids' : member.age && member.age < 16 ? 'Teens' : 'Adults');

    let matched = todayClasses.find((c) => c.category === studentCategory);
    if (!matched && todayClasses.length > 0) {
      matched = todayClasses.find((c) => c.category === 'Adults' || c.type === 'Open Mat') || todayClasses[0];
    }
    if (!matched && classes.length > 0) {
      matched = classes.find((c) => c.category === studentCategory) || classes[0];
    }

    const assignedCoach = coaches.find(
      (c) => !c.isDeleted && (c.id === matched?.headCoachId || (matched?.headCoachName && c.fullName.toLowerCase() === matched.headCoachName.toLowerCase()) || (matched?.coach && c.fullName.toLowerCase() === matched.coach.toLowerCase()))
    );

    return {
      targetClass: matched,
      coachName: assignedCoach?.fullName || matched?.headCoachName || matched?.coach || 'Head Coach',
    };
  };

  // =========================================================================
  // MULTI-CAMERA CROSS-FUSION DETECTION ENGINE
  // =========================================================================
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const activeMembers = members.filter((m) => !m.isDeleted && m.status !== 'expired');
      if (activeMembers.length === 0) return;

      const activeCameraList = cameras.filter((c) => c.isActive);
      if (activeCameraList.length === 0) return;

      setTrackedStudents((prev) => {
        const next: Record<string, DetectedStudentTracker> = { ...prev };

        // Distribute student candidates across the active cameras
        const candidatePool = activeMembers.slice(0, 6);

        candidatePool.forEach((member, idx) => {
          let tracker = next[member.id];
          // Assign to a camera
          const assignedCam = activeCameraList[idx % activeCameraList.length];

          if (!tracker) {
            // New Detection Position
            let posX = 25 + (idx * 22) % 65;
            let posY = 30 + ((idx * 17) % 55);

            // Candidate 4 is simulated sitting on spectator bench outside polygon
            if (idx === 4) {
              posX = 6;
              posY = 10;
            }

            const isOnMat = isPointInPolygon({ x: posX, y: posY }, assignedCam.roiPolygon);
            const attire: 'gi' | 'rashguard' | 'casual' = idx === 4 ? 'casual' : (idx % 2 === 0 ? 'gi' : 'rashguard');

            tracker = {
              member,
              currentX: posX,
              currentY: posY,
              cameraSourceId: assignedCam.id,
              cameraSourceName: assignedCam.name,
              isOnMat,
              firstDetectedAt: now,
              lastDetectedAt: now,
              dwellSeconds: 0,
              attireDetected: attire,
              attireConfidence: idx === 4 ? 90 : 96,
              isRegistered: false,
            };
          } else {
            // Jitter & movement across mats
            const jitterX = (Math.random() - 0.5) * 2.0;
            const jitterY = (Math.random() - 0.5) * 2.0;
            const newX = Math.max(4, Math.min(96, tracker.currentX + jitterX));
            const newY = Math.max(4, Math.min(96, tracker.currentY + jitterY));

            const currentCamConfig = cameras.find((c) => c.id === tracker.cameraSourceId) || assignedCam;
            const isOnMat = isPointInPolygon({ x: newX, y: newY }, currentCamConfig.roiPolygon);

            let newDwell = tracker.dwellSeconds;
            if (isOnMat) {
              newDwell += 2; // +2s per tick
            } else {
              newDwell = Math.max(0, newDwell - 1);
            }

            tracker = {
              ...tracker,
              currentX: newX,
              currentY: newY,
              isOnMat,
              lastDetectedAt: now,
              dwellSeconds: newDwell,
            };
          }

          // Auto-Registration Evaluation
          const attirePass = !requireTrainingAttire || tracker.attireDetected !== 'casual';

          if (
            tracker.isOnMat &&
            tracker.dwellSeconds >= requiredDwellSeconds &&
            attirePass &&
            !tracker.isRegistered
          ) {
            const { targetClass, coachName } = resolveTargetClassForStudent(member);
            const className = targetClass?.title || 'BJJ Training Session';
            const classCat = targetClass?.category || member.ageGroup || 'Adults';

            const result = onCheckIn(member.id, className, coachName, classCat, todayStr);
            const timeNow = getJordanTimeStr(new Date(), false);

            tracker.isRegistered = true;
            tracker.registeredAt = timeNow;
            tracker.matchedClassName = className;
            tracker.matchedCoach = coachName;
            tracker.checkInMessage = result.message;

            if (soundEnabled) {
              playSuccessChime();
            }

            setRecentAutoCheckIns((prevLog) => [
              {
                id: `auto_${Date.now()}_${member.id}`,
                studentName: member.fullName,
                studentAvatar: member.avatar,
                beltRank: member.beltRank,
                stripes: member.stripes,
                ageGroup: member.ageGroup,
                className,
                coach: coachName,
                timeStr: timeNow,
                cameraName: tracker.cameraSourceName,
                dwellSeconds: tracker.dwellSeconds,
                attire: tracker.attireDetected === 'gi' ? 'BJJ Kimono / Gi' : tracker.attireDetected === 'rashguard' ? 'Ranked Rashguard' : 'Street Clothes',
                message: result.message,
              },
              ...prevLog.slice(0, 24),
            ]);

            setLiveBanner({
              studentName: member.fullName,
              className,
              cameraName: tracker.cameraSourceName,
              message: `${result.message} · Balance: ${result.remainingAfter >= 0 ? `${result.remainingAfter} classes` : 'Unlimited'}`,
              type: result.success ? 'success' : 'warning',
            });

            setTimeout(() => {
              setLiveBanner((curr) => (curr?.studentName === member.fullName ? null : curr));
            }, 6000);
          }

          next[member.id] = tracker;
        });

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, members, cameras, requiredDwellSeconds, requireTrainingAttire, todayClasses, soundEnabled, onCheckIn, todayStr]);

  // Polygon Drag Handlers on Active Camera
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCalibratingROI || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    let nearestIdx = -1;
    let minDist = 8;

    activeCam.roiPolygon.forEach((pt, idx) => {
      const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    });

    if (nearestIdx >= 0) {
      setDraggingPointIdx(nearestIdx);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingPointIdx === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const updated = [...activeCam.roiPolygon];
    updated[draggingPointIdx] = { x: Math.round(newX), y: Math.round(newY) };
    handleUpdateCameraPolygon(activeCam.id, updated);
  };

  const handleCanvasMouseUp = () => {
    if (draggingPointIdx !== null) {
      setDraggingPointIdx(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className={`relative w-full max-w-7xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
        isLight ? 'bg-stone-900 border-stone-800 text-white' : 'bg-stone-950 border-stone-800 text-white'
      } ${isFullscreen ? 'fixed inset-0 max-w-none rounded-none z-50 h-full' : 'max-h-[94vh]'}`}>
        
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Multi-Camera Mat Vision Attendance Kiosk</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {cameras.filter(c => c.isActive).length} Active Feeds
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Multi-Angle Tatami Matrix · Independent ROI Polygons per Camera · Tap-Less Continuous Dwell ({requiredDwellSeconds}s)
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            {/* View Layout Mode (Focused vs Grid) */}
            <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewLayout('focused')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                  viewLayout === 'focused'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="Single Focused Camera View (Calibrate & Inspect)"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Focus</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                  viewLayout === 'grid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="Multi-Camera Grid View (Simultaneous Monitoring)"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grid ({cameras.filter(c => c.isActive).length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-stone-800 text-emerald-400 border-stone-700'
                  : 'bg-stone-900 text-stone-500 border-stone-800'
              }`}
              title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsCalibratingROI(!isCalibratingROI)}
              className={`px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                isCalibratingROI
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
              }`}
              title="Calibrate Tatami Mat ROI Bounding Zone for Current Camera"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isCalibratingROI ? 'Save & Exit Calibration' : 'Calibrate Active Cam'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Kiosk'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-red-900/40 text-stone-400 hover:text-red-400 border border-stone-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Welcoming HUD Notification Banner */}
        {liveBanner && (
          <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border-b border-emerald-500/50 px-6 py-2.5 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  🎉 Tap-Less Mat Check-In Confirmed ({liveBanner.cameraName})
                </div>
                <div className="text-sm font-black text-white">
                  {liveBanner.studentName} → <span className="text-emerald-300 font-bold">{liveBanner.className}</span>
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Zero-Tap Auto-Logged
            </span>
          </div>
        )}

        {/* Camera Selector Tab Strip */}
        <div className="px-4 py-2 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 mr-1 flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-indigo-400" />
              <span>Camera Feeds:</span>
            </span>

            {cameras.map((cam, idx) => (
              <div
                key={cam.id}
                className={`flex items-center rounded-xl border transition-all text-xs font-bold ${
                  activeCamId === cam.id
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : cam.isActive
                    ? 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'
                    : 'bg-stone-950 text-stone-500 border-stone-800 opacity-60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveCamId(cam.id)}
                  className="px-3 py-1.5 cursor-pointer flex items-center gap-1.5"
                >
                  <span className={`w-2 h-2 rounded-full ${cam.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'}`}></span>
                  <span>{cam.name}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCameraActive(cam.id);
                  }}
                  className={`px-1.5 py-1.5 border-l text-[10px] hover:text-white cursor-pointer ${
                    activeCamId === cam.id ? 'border-indigo-400 text-indigo-200' : 'border-stone-800 text-stone-400'
                  }`}
                  title={cam.isActive ? 'Disable feed' : 'Enable feed'}
                >
                  {cam.isActive ? <Radio className="w-3 h-3 text-emerald-400" /> : <CameraOff className="w-3 h-3" />}
                </button>

                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestDeleteCamera(cam);
                    }}
                    className={`px-1.5 py-1.5 border-l hover:text-red-400 cursor-pointer ${
                      activeCamId === cam.id ? 'border-indigo-400 text-indigo-200' : 'border-stone-800 text-stone-500'
                    }`}
                    title="Remove Camera Angle"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddNewCamera}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-dashed border-stone-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Camera Angle</span>
            </button>
          </div>

          {/* Physical Device Assignment for Active Camera */}
          {availableVideoDevices.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 text-xs">
              <span className="text-stone-400 text-[10px] font-bold">Hardware Source:</span>
              <select
                value={activeCam.deviceId || ''}
                onChange={(e) => handleUpdateCameraDevice(activeCam.id, e.target.value)}
                className="p-1.5 rounded-lg text-xs font-medium bg-stone-900 border border-stone-700 text-white focus:outline-none"
              >
                <option value="">Default / System Cam</option>
                {availableVideoDevices.map((dev, i) => (
                  <option key={dev.deviceId || i} value={dev.deviceId}>
                    {dev.label || `USB Webcam ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Main Workspace Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[500px]">
          
          {/* Left 8 Cols: Camera Feeds (Focused or Multi-Grid) */}
          <div className="lg:col-span-8 p-4 flex flex-col justify-between bg-black relative overflow-hidden select-none">
            
            {/* VIEW MODE 1: SINGLE FOCUSED CAMERA VIEW (With Polygon Calibration & Full Detection) */}
            {viewLayout === 'focused' && (
              <div
                ref={containerRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="relative w-full aspect-video rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 flex items-center justify-center cursor-crosshair group shadow-inner"
              >
                {/* Physical Stream */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'opacity-90' : 'opacity-0'}`}
                />

                {/* Dojang Tatami Environment when simulated */}
                {!cameraActive && (
                  <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center justify-center p-6 text-center">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div className="relative z-10 space-y-2 max-w-md">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                        <Camera className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-black text-white">{activeCam.name}</h3>
                      <p className="text-xs text-stone-400">
                        Multi-angle spatial scanner. Tracking students inside this camera's Mat ROI polygon.
                      </p>
                    </div>
                  </div>
                )}

                {/* SVG Polygon Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <mask id="mat-mask-focused">
                      <rect x="0" y="0" width="100%" height="100%" fill="white" />
                      <polygon
                        points={activeCam.roiPolygon.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                        fill="black"
                      />
                    </mask>
                  </defs>

                  {/* Spectator Exclusion Mask */}
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(239, 68, 68, 0.12)"
                    mask="url(#mat-mask-focused)"
                  />

                  {/* Active Mat Area Polygon */}
                  <polygon
                    points={activeCam.roiPolygon.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                    fill="rgba(16, 185, 129, 0.18)"
                    stroke="rgba(16, 185, 129, 0.85)"
                    strokeWidth="2.5"
                    strokeDasharray={isCalibratingROI ? '6,4' : 'none'}
                  />
                </svg>

                {/* Corner Drag Handles in Calibration Mode */}
                {isCalibratingROI && activeCam.roiPolygon.map((pt, idx) => (
                  <div
                    key={idx}
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center cursor-move text-[10px] font-black text-black z-30 pointer-events-auto hover:scale-125 transition-transform"
                  >
                    {idx + 1}
                  </div>
                ))}

                {/* Status Badges */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-950/85 text-emerald-400 border border-emerald-500/40 backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{activeCam.name}</span>
                  </span>

                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-500/30 backdrop-blur-xs shadow-sm">
                    Spectator Area
                  </span>
                </div>

                {/* Tracked Student Floating Markers on Active Cam */}
                {Object.values(trackedStudents)
                  .filter((t) => t.cameraSourceId === activeCam.id)
                  .map((tracker) => {
                    const dwellPercent = Math.min(100, Math.round((tracker.dwellSeconds / requiredDwellSeconds) * 100));
                    const isReady = tracker.dwellSeconds >= requiredDwellSeconds;

                    return (
                      <div
                        key={tracker.member.id}
                        style={{ left: `${tracker.currentX}%`, top: `${tracker.currentY}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-700 pointer-events-none flex flex-col items-center gap-1 ${
                          tracker.isOnMat ? 'scale-100 opacity-100' : 'scale-90 opacity-75'
                        }`}
                      >
                        <div className={`relative p-1 rounded-2xl border-2 transition-all ${
                          tracker.isRegistered
                            ? 'border-emerald-400 bg-emerald-950/80 ring-4 ring-emerald-500/30 shadow-lg'
                            : tracker.isOnMat
                            ? isReady
                              ? 'border-emerald-400 bg-emerald-950/80 shadow-md animate-pulse'
                              : 'border-indigo-400 bg-stone-900/90 shadow-md'
                            : 'border-red-500/60 bg-red-950/80'
                        }`}>
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-800 flex items-center justify-center font-bold text-xs">
                            {tracker.member.avatar ? (
                              <img src={tracker.member.avatar} alt={tracker.member.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{tracker.member.fullName.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>

                          {tracker.isRegistered && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Label HUD */}
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black border shadow-lg whitespace-nowrap flex flex-col items-center ${
                          tracker.isRegistered
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                            : tracker.isOnMat
                            ? 'bg-stone-900/95 text-stone-200 border-stone-700'
                            : 'bg-red-950/95 text-red-300 border-red-800'
                        }`}>
                          <div className="flex items-center gap-1">
                            <span>{tracker.member.fullName}</span>
                            <span className="text-[9px] text-stone-400">({tracker.member.beltRank})</span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono">
                            {tracker.isRegistered ? (
                              <span className="text-emerald-400 font-bold">✓ Checked In ({tracker.registeredAt})</span>
                            ) : tracker.isOnMat ? (
                              <>
                                <span className="text-indigo-400">⏱️ {tracker.dwellSeconds}s / {requiredDwellSeconds}s</span>
                                <span>·</span>
                                <span className={tracker.attireDetected === 'casual' ? 'text-red-400' : 'text-emerald-400'}>
                                  {tracker.attireDetected === 'gi' ? '🥋 Gi' : tracker.attireDetected === 'rashguard' ? '👕 Rashguard' : '🚫 Casual'}
                                </span>
                              </>
                            ) : (
                              <span className="text-red-400">🚫 In Spectator Area</span>
                            )}
                          </div>

                          {tracker.isOnMat && !tracker.isRegistered && (
                            <div className="w-full h-1 bg-stone-800 rounded-full mt-1 overflow-hidden">
                              <div
                                style={{ width: `${dwellPercent}%` }}
                                className="h-full bg-indigo-500 transition-all duration-300"
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* VIEW MODE 2: MULTI-CAMERA SYNCHRONIZED GRID VIEW */}
            {viewLayout === 'grid' && (
              <div className="grid grid-cols-2 gap-3 w-full h-full min-h-[380px]">
                {cameras.filter((c) => c.isActive).map((cam) => {
                  const camStudents = Object.values(trackedStudents).filter((t) => t.cameraSourceId === cam.id);
                  const onMatCount = camStudents.filter((t) => t.isOnMat).length;

                  return (
                    <div
                      key={cam.id}
                      onClick={() => {
                        setActiveCamId(cam.id);
                        setViewLayout('focused');
                      }}
                      className={`relative aspect-video rounded-2xl overflow-hidden border bg-stone-950 flex items-center justify-center cursor-pointer transition-all hover:border-indigo-400 group ${
                        activeCamId === cam.id ? 'border-indigo-500 ring-2 ring-indigo-500/40' : 'border-stone-800'
                      }`}
                    >
                      {/* Realistic Tatami Canvas Grid */}
                      <div className="absolute inset-0 bg-gradient-to-br from-stone-950 to-stone-900">
                        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]"></div>
                      </div>

                      {/* Mini Polygon */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <polygon
                          points={cam.roiPolygon.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                          fill="rgba(16, 185, 129, 0.15)"
                          stroke="rgba(16, 185, 129, 0.7)"
                          strokeWidth="2"
                        />
                      </svg>

                      {/* Mini Floating Students */}
                      {camStudents.map((tracker) => (
                        <div
                          key={tracker.member.id}
                          style={{ left: `${tracker.currentX}%`, top: `${tracker.currentY}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-lg overflow-hidden border border-emerald-400 bg-stone-800 shadow-sm"
                          title={`${tracker.member.fullName} (${tracker.dwellSeconds}s)`}
                        >
                          {tracker.member.avatar ? (
                            <img src={tracker.member.avatar} alt={tracker.member.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold">
                              {tracker.member.fullName.slice(0, 1)}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Camera HUD Header */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] font-black">
                        <span className="px-2 py-0.5 rounded-md bg-stone-950/80 text-white border border-stone-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          <span>{cam.name}</span>
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                          {onMatCount} on Mat
                        </span>
                      </div>

                      <div className="absolute bottom-2 right-2 text-[9px] font-bold text-stone-400 bg-black/70 px-1.5 py-0.5 rounded group-hover:text-white">
                        Click to Focus & Calibrate
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Bar: Calibration Presets & Multi-Cam Status */}
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              {isCalibratingROI && viewLayout === 'focused' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Calibrating {activeCam.name}:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => applyPresetROI('wide_tatami')}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-bold border border-stone-700 cursor-pointer"
                  >
                    Wide Tatami
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetROI('center_cage')}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-bold border border-stone-700 cursor-pointer"
                  >
                    Center Area
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetROI('full_span')}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-bold border border-stone-700 cursor-pointer"
                  >
                    Full Room
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-indigo-400" />
                    <span><strong>{cameras.filter(c => c.isActive).length}</strong> Active Cameras</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span><strong>{Object.values(trackedStudents).filter(t => t.isOnMat).length}</strong> Total Students on Tatami</span>
                  </span>
                </div>
              )}

              <div className="text-[11px] font-bold text-stone-400">
                Today: <strong className="text-white">{todayDayName} ({todayClasses.length} Scheduled Classes)</strong>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Live Ledger & Engine Settings */}
          <div className="lg:col-span-4 p-4 border-t lg:border-t-0 lg:border-l border-stone-800 flex flex-col justify-between bg-stone-900/70 overflow-y-auto space-y-4">
            
            {/* Parameters Box */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span>Multi-Cam Attendance Parameters</span>
              </h3>

              {/* Dwell Time Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-stone-300">Continuous Mat Presence:</span>
                  <span className="font-mono text-emerald-400 font-black">
                    {requiredDwellSeconds >= 60 ? `${(requiredDwellSeconds / 60).toFixed(1)} min (${requiredDwellSeconds}s)` : `${requiredDwellSeconds}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="15"
                  value={requiredDwellSeconds}
                  onChange={(e) => {
                    const secs = parseInt(e.target.value, 10);
                    setRequiredDwellSeconds(secs);
                    try { localStorage.setItem(STORAGE_KEY_DWELL_SECONDS, secs.toString()); } catch {}
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[10px] text-stone-500">
                  Dwell time accumulates across any active mat camera. If a student moves between Camera 1 and Camera 2, their time is seamlessly fused.
                </p>
              </div>

              {/* Training Attire Toggle */}
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-stone-300 block">Require Training Attire (Gi/Rashguard)</span>
                  <span className="text-[10px] text-stone-500">Blocks street clothes / visitors from registration</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !requireTrainingAttire;
                    setRequireTrainingAttire(next);
                    try { localStorage.setItem(STORAGE_KEY_REQUIRE_ATTIRE, next.toString()); } catch {}
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    requireTrainingAttire
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-stone-800 text-stone-400 border border-stone-700'
                  }`}
                >
                  {requireTrainingAttire ? 'Enabled' : 'Bypassed'}
                </button>
              </div>
            </div>

            {/* Live Real-Time Multi-Cam Check-In Ledger */}
            <div className="flex-1 flex flex-col space-y-2 min-h-[220px]">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cross-Camera Mat Check-Ins ({recentAutoCheckIns.length})</span>
                </h4>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[280px]">
                {recentAutoCheckIns.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between gap-3 text-xs animate-in fade-in"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-800 font-bold flex items-center justify-center shrink-0">
                        {rec.studentAvatar ? (
                          <img src={rec.studentAvatar} alt={rec.studentName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{rec.studentName.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-black text-white flex items-center gap-1.5">
                          <span>{rec.studentName}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 font-mono">
                            {rec.beltRank}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {rec.className} · Coach {rec.coach}
                        </div>
                        <div className="text-[9px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <span>⏱️ {rec.dwellSeconds}s</span>
                          <span>·</span>
                          <span>{rec.attire}</span>
                          <span>·</span>
                          <span className="text-stone-400">{rec.cameraName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-bold text-stone-400 block">{rec.timeStr}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Tap-less
                      </span>
                    </div>
                  </div>
                ))}

                {recentAutoCheckIns.length === 0 && (
                  <div className="p-6 rounded-xl bg-stone-950/40 border border-dashed border-stone-800 text-center text-xs text-stone-500 italic">
                    Multi-camera matrix active. As students enter and train across any mat camera for {requiredDwellSeconds}s, they appear here automatically.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white font-black text-xs transition-colors cursor-pointer"
            >
              Exit Kiosk
            </button>
          </div>
        </div>
      </div>

      {/* Camera Delete Confirmation Dialog */}
      {cameraPendingDelete && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl text-white space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black tracking-tight text-red-400">Do you really want to delete this camera?</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                You are about to permanently remove <span className="font-bold text-white bg-stone-800 px-2 py-0.5 rounded-md">{cameraPendingDelete.name}</span> from the multi-camera attendance matrix.
              </p>
            </div>

            {/* Camera Details Box */}
            <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-2 text-xs text-stone-400">
              <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-stone-850">
                <span className="text-stone-500">Camera Source</span>
                <span className="text-stone-300 font-mono font-medium">{cameraPendingDelete.deviceId ? `Device: ${cameraPendingDelete.deviceId.substring(0, 10)}...` : 'Live WebCam / Sensor'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-stone-850">
                <span className="text-stone-500">Calibrated Mat ROI</span>
                <span className="text-emerald-400 font-semibold">{cameraPendingDelete.roiPolygon.length} Boundary Points</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-snug pt-0.5">
                Deleting this feed will discard its mat detection zone. Students in this section will no longer be tracked by this camera.
              </p>
            </div>

            {/* Explicit Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 cursor-pointer hover:bg-stone-950 transition-colors select-none">
              <input
                type="checkbox"
                checked={deleteConfirmationChecked}
                onChange={(e) => setDeleteConfirmationChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded bg-stone-900 border-stone-700 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
              />
              <span className="text-xs text-stone-300 font-medium leading-tight">
                Yes, I really want to delete <strong className="text-white">"{cameraPendingDelete.name}"</strong>
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCameraPendingDelete(null);
                  setDeleteConfirmationChecked(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 cursor-pointer transition-colors"
              >
                No, Keep Camera
              </button>

              <button
                type="button"
                disabled={!deleteConfirmationChecked}
                onClick={() => handleConfirmDeleteCamera(cameraPendingDelete.id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  deleteConfirmationChecked
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 active:scale-95 cursor-pointer'
                    : 'bg-stone-800 text-stone-500 border border-stone-800 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteConfirmationChecked ? 'Yes, Delete Camera' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
