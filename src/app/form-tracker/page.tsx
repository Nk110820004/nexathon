'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { 
  Camera, 
  VideoOff, 
  Upload, 
  Activity, 
  Award, 
  Timer, 
  CheckCircle,
  HelpCircle,
  X,
  Loader2
} from 'lucide-react';

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

// Bones connections to render skeletal projection
const SKELETON_CONNECTIONS = [
  [11, 12], // Shoulders
  [11, 13], [13, 15], // Left Arm
  [12, 14], [14, 16], // Right Arm
  [11, 23], [12, 24], // Shoulders to Hips
  [23, 24], // Hips
  [23, 25], [25, 27], // Left Leg
  [24, 26], [26, 28]  // Right Leg
];

export default function FormTracker() {
  const { user, refreshUser, updatePoints } = useUser();
  const router = useRouter();

  const [exercise, setExercise] = useState<'curls' | 'squats'>('curls');
  const [cameraActive, setCameraActive] = useState(false);
  const [connectingWS, setConnectingWS] = useState(false);
  const [reps, setReps] = useState(0);
  const [formAlert, setFormAlert] = useState('Stand in frame to begin...');
  const [isAlertCritical, setIsAlertCritical] = useState(false);
  const [avgAccuracy, setAvgAccuracy] = useState(100);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      closeWebSocket();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Timer logic for workout session duration
  useEffect(() => {
    if (cameraActive) {
      setWorkoutDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setWorkoutDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [cameraActive]);

  // Establish WebSocket connection to Python ML server
  const initWebSocket = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      setConnectingWS(true);
      closeWebSocket();

      const wsUrl = `ws://${window.location.hostname}:3001/pose`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[ML Server WebSocket] Connection established.');
        setConnectingWS(false);
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.error) {
            console.error('[ML Server Error]', data.error);
            return;
          }

          // Update metrics
          if (data.reps !== undefined) setReps(data.reps);
          if (data.formAlert) setFormAlert(data.formAlert);
          if (data.isAlertCritical !== undefined) setIsAlertCritical(data.isAlertCritical);
          if (data.accuracy !== undefined) setAvgAccuracy(data.accuracy);

          // Draw coordinates on canvas
          if (canvasRef.current && videoRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const width = canvasRef.current.width;
              const height = canvasRef.current.height;
              
              // 1. Draw current camera video frame onto canvas
              ctx.drawImage(videoRef.current, 0, 0, width, height);

              // 2. Draw skeleton if detected
              if (data.detected && data.landmarks) {
                drawSkeleton(ctx, data.landmarks, width, height);
              }
            }
          }
        } catch (err) {
          console.error('[ML Server WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[ML Server WebSocket] Error:', err);
        setConnectingWS(false);
        reject(err);
      };

      ws.onclose = () => {
        console.log('[ML Server WebSocket] Connection closed.');
        setConnectingWS(false);
      };
    });
  };

  // Close WebSocket
  const closeWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Simple skeleton drawing function
  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: Landmark[], width: number, height: number) => {
    // 1. Draw connections
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.lineWidth = 3;
    
    SKELETON_CONNECTIONS.forEach(([a, b]) => {
      const p1 = landmarks[a];
      const p2 = landmarks[b];

      if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });

    // 2. Draw joints
    ctx.fillStyle = '#22d3ee';
    landmarks.forEach((lm) => {
      if (lm.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  // Start video streaming loop
  const startCamera = async () => {
    setSavedSuccess(false);

    try {
      // 1. Resolve camera video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      activeStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 2. Connect to WebSocket
      const ws = await initWebSocket();

      setCameraActive(true);
      setReps(0);
      setAvgAccuracy(100);
      setFormAlert('Standing in frame... Calibrating joints.');

      // 3. Set frame grab interval at 15 FPS
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 640;
      tempCanvas.height = 480;
      const tempCtx = tempCanvas.getContext('2d');

      frameIntervalRef.current = setInterval(() => {
        if (videoRef.current && ws.readyState === WebSocket.OPEN && tempCtx) {
          // Draw video to temporary canvas
          tempCtx.drawImage(videoRef.current, 0, 0, 640, 480);
          
          // Compress frame to JPEG base64
          const base64Img = tempCanvas.toDataURL('image/jpeg', 0.6);
          
          // Stream payload to Python server
          const payload = {
            exercise,
            image: base64Img,
          };
          ws.send(JSON.stringify(payload));
        }
      }, 70); // ~14-15 frames per second

    } catch (error) {
      console.error('Failed to boot camera or socket:', error);
      alert('Failed to boot camera or connect to ML Server. Ensure python server runs on port 3001.');
      stopCamera();
    }
  };

  // Stop video streaming loop
  const stopCamera = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    closeWebSocket();
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Save workout session metrics directly via port 3001 database connection
  const handleSaveWorkout = async () => {
    if (reps === 0) {
      alert('Execute at least 1 rep to save this workout session.');
      return;
    }
    setSavingWorkout(true);

    try {
      const res = await fetch('http://localhost:3001/save_workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          exercise_name: exercise === 'curls' ? 'Bicep Curls' : 'Squats',
          reps,
          duration_seconds: workoutDuration,
          accuracy_score: avgAccuracy,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPointsAwarded(data.points_awarded || 15);
        setSavedSuccess(true);
        if (data.updated_points) {
          updatePoints(data.updated_points);
        } else {
          await refreshUser();
        }
        stopCamera();
      } else {
        alert(data.error || 'Failed to save workout metrics.');
      }
    } catch (err) {
      console.error('Error saving workout:', err);
      alert('Could not establish connection to Python ML server database router.');
    } finally {
      setSavingWorkout(false);
    }
  };

  // File Upload pose tracking using static image check
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConnectingWS(true);
    setSavedSuccess(false);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      if (!canvasRef.current) return;
      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      canvasRef.current.width = img.width;
      canvasRef.current.height = img.height;

      // Draw the uploaded image
      canvasCtx.drawImage(img, 0, 0, img.width, img.height);

      // Create a temporary canvas to get base64
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0, img.width, img.height);
        const base64Img = tempCanvas.toDataURL('image/jpeg', 0.8);

        // Open temporary WebSocket for static evaluation
        try {
          const wsUrl = `ws://${window.location.hostname}:3001/pose`;
          const ws = new WebSocket(wsUrl);
          
          ws.onopen = () => {
            const payload = {
              exercise,
              image: base64Img,
            };
            ws.send(JSON.stringify(payload));
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.detected && data.landmarks) {
              drawSkeleton(canvasCtx, data.landmarks, img.width, img.height);
            }
            if (data.formAlert) {
              setFormAlert(`Static Evaluation: ${data.formAlert}`);
            }
            setConnectingWS(false);
            ws.close();
          };

          ws.onerror = () => {
            setConnectingWS(false);
            alert('Failed to connect to ML Server. Make sure python server is running.');
          };
        } catch (e) {
          setConnectingWS(false);
        }
      }
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-display flex items-center gap-3">
            <Activity className="w-8 h-8 text-brand-cyan animate-pulse" />
            Know Your Form (Python Coached)
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time pose estimation powered by FastAPI ML server on port 3001.</p>
        </div>

        {/* Workout Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setExercise('curls');
              if (cameraActive) stopCamera();
            }}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${
              exercise === 'curls'
                ? 'bg-brand-cyan text-brand-dark-950 border-brand-cyan'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Bicep Curls
          </button>
          <button
            onClick={() => {
              setExercise('squats');
              if (cameraActive) stopCamera();
            }}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${
              exercise === 'squats'
                ? 'bg-brand-violet text-slate-950 border-brand-violet'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Squats
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 cols: Video Feed */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {/* Real Webcam Stream hidden from display */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute hidden w-full h-full object-cover"
            />
            
            {/* Canvas Output displayed to user */}
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-full object-contain"
            />

            {/* Offline overlay */}
            {!cameraActive && !savedSuccess && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm gap-4 text-center p-6">
                <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
                  <VideoOff className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-lg">AI Camera Offline</h3>
                  <p className="text-sm text-slate-500 max-w-sm mt-1">Boot up your webcam or upload a static image to evaluate your posture.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={startCamera}
                    className="px-6 py-2.5 rounded-xl bg-brand-cyan text-brand-dark-950 font-bold hover:bg-brand-cyan-light transition-all flex items-center gap-2 cursor-pointer text-xs"
                  >
                    <Camera className="w-4 h-4" /> Start ML Trainer
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800 transition-all flex items-center gap-2 cursor-pointer text-xs"
                  >
                    <Upload className="w-4 h-4" /> Upload Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Loading / Connecting Indicator */}
            {connectingWS && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-3">
                <Loader2 className="w-8 h-8 text-brand-cyan animate-spin" />
                <span className="text-slate-400 text-sm">Connecting to Python Pose engine (port 3001)...</span>
              </div>
            )}

            {/* Workout Saved Popup */}
            {savedSuccess && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm gap-4 text-center p-6">
                <div className="p-4 rounded-full bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald animate-bounce">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-xl">Workout Logged!</h3>
                  <p className="text-sm text-slate-400 max-w-sm mt-1">
                    Your workout metrics were saved directly to PostgreSQL.
                  </p>
                  <span className="inline-block mt-3 px-4 py-1.5 rounded-full bg-brand-cyan/15 text-brand-cyan text-xs font-bold animate-pulse">
                    +{pointsAwarded} XP Points Awarded!
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSavedSuccess(false);
                    setReps(0);
                  }}
                  className="px-6 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-all text-xs"
                >
                  Start New Session
                </button>
              </div>
            )}
          </div>

          {/* Form instructions alerts footer bar */}
          {cameraActive && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
              isAlertCritical 
                ? 'bg-brand-red/10 border-brand-red/30 text-brand-red' 
                : 'bg-brand-cyan/5 border-brand-cyan/20 text-brand-cyan-light'
            }`}>
              <Activity className="w-5 h-5 flex-shrink-0 animate-pulse" />
              <span className="text-sm font-semibold tracking-wide uppercase">{formAlert}</span>
            </div>
          )}
        </div>

        {/* Right 1 col: Performance Metrics */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-slate-200 text-sm border-b border-slate-800/60 pb-3">Session Metrics</h3>

            {/* Rep Counter */}
            <div className="text-center p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Repetitions</span>
              <span className="block text-5xl font-black text-slate-100 tracking-tight mt-1">{reps}</span>
            </div>

            {/* Form Accuracy */}
            <div className="text-center p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Form Accuracy</span>
              <span className="block text-4xl font-black text-brand-cyan tracking-tight mt-1">{avgAccuracy}%</span>
            </div>

            {/* Session Timer */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Timer className="w-4 h-4 text-slate-500" /> Active Session
              </span>
              <span className="font-mono font-bold text-slate-200">
                {Math.floor(workoutDuration / 60).toString().padStart(2, '0')}:
                {(workoutDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Session Control Buttons */}
            {cameraActive && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSaveWorkout}
                  disabled={savingWorkout || reps === 0}
                  className="w-full py-3 rounded-xl bg-brand-emerald text-brand-dark-950 font-bold hover:bg-brand-emerald-light transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 text-sm"
                >
                  {savingWorkout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Session...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Save Workout
                    </>
                  )}
                </button>
                <button
                  onClick={stopCamera}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-rose-500 border border-slate-800 hover:bg-rose-950/20 hover:border-rose-950 transition-all font-semibold text-xs cursor-pointer"
                >
                  Cancel Workout
                </button>
              </div>
            )}
          </div>

          {/* Form Guide Advice */}
          <div className="glass-panel rounded-2xl p-5 text-xs text-slate-400 space-y-3">
            <h4 className="font-bold text-slate-300 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-brand-cyan" /> Form Coaching Guide
            </h4>
            {exercise === 'curls' ? (
              <ul className="list-disc list-inside space-y-2 font-light">
                <li>Make sure your wrist, elbow, and shoulder are fully visible.</li>
                <li>Stand sideways to let the camera capture your profile.</li>
                <li>Extend your elbow down completely to 180° before curling back up.</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-2 font-light">
                <li>Stand facing 45 degrees relative to the camera frame.</li>
                <li>Keep your heels firmly on the ground.</li>
                <li>Drop your thighs until they are parallel to the ground.</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
