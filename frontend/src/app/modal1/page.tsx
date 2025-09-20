'use client';

import { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw } from 'lucide-react';

export default function BreathingModal() {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [breathPhase, setBreathPhase] = useState<'in' | 'out' | 'hold' | 'pause' | 'complete'>('in');
  const [cycleCount, setCycleCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  // Breathing cycle timing (in seconds) - 2 iterations in 15 seconds
  const BREATH_IN_DURATION = 3;
  const HOLD_DURATION = 1.5;
  const BREATH_OUT_DURATION = 3;
  const PAUSE_DURATION = 1.5;

  const totalCycleDuration = BREATH_IN_DURATION + HOLD_DURATION + BREATH_OUT_DURATION + PAUSE_DURATION;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Exercise completed - start smooth reset
            setIsActive(false);
            setBreathPhase('complete');
            setIsResetting(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, isPaused, timeLeft]);

  // Breathing phase logic
  useEffect(() => {
    if (!isActive || isResetting) return;

    const elapsedTime = 15 - timeLeft;
    const cycleTime = elapsedTime % totalCycleDuration;
    
    if (cycleTime < BREATH_IN_DURATION) {
      setBreathPhase('in');
    } else if (cycleTime < BREATH_IN_DURATION + HOLD_DURATION) {
      setBreathPhase('hold');
    } else if (cycleTime < BREATH_IN_DURATION + HOLD_DURATION + BREATH_OUT_DURATION) {
      setBreathPhase('out');
    } else {
      setBreathPhase('pause');
    }

    // Count completed cycles
    const completedCycles = Math.floor(elapsedTime / totalCycleDuration);
    setCycleCount(completedCycles);
  }, [timeLeft, isActive, isResetting]);

  // Smooth reset effect
  useEffect(() => {
    if (isResetting) {
      const resetTimeout = setTimeout(() => {
        setBreathPhase('in');
        setIsResetting(false);
      }, 2000); // 2 second smooth transition back to start

      return () => clearTimeout(resetTimeout);
    }
  }, [isResetting]);

  const startExercise = () => {
    setIsActive(true);
    setIsPaused(false);
    setTimeLeft(15);
    setCycleCount(0);
    setBreathPhase('in');
    setIsResetting(false);
  };

  const pauseExercise = () => {
    setIsPaused(!isPaused);
  };

  const resetExercise = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(15);
    setCycleCount(0);
    setBreathPhase('in');
    setIsResetting(false);
  };

  const getBreathText = () => {
    switch (breathPhase) {
      case 'in':
        return 'Breathe In';
      case 'hold':
        return 'Hold';
      case 'out':
        return 'Breathe Out';
      case 'pause':
        return 'Rest';
      case 'complete':
        return 'Complete!';
      default:
        return 'Ready';
    }
  };

  const getBreathColor = () => {
    switch (breathPhase) {
      case 'in':
        return 'from-yellow-100 to-yellow-200';
      case 'hold':
        return 'from-yellow-200 to-yellow-300';
      case 'out':
        return 'from-yellow-300 to-yellow-400';
      case 'pause':
        return 'from-yellow-50 to-yellow-100';
      case 'complete':
        return 'from-yellow-400 to-yellow-500';
      default:
        return 'from-yellow-100 to-yellow-200';
    }
  };

  const getCircleSize = () => {
    if (!isActive && !isResetting) return 'w-32 h-32';
    
    switch (breathPhase) {
      case 'in':
        return 'w-48 h-48';
      case 'hold':
        return 'w-48 h-48';
      case 'out':
        return 'w-24 h-24';
      case 'pause':
        return 'w-32 h-32';
      case 'complete':
        return 'w-40 h-40';
      default:
        return 'w-32 h-32';
    }
  };

  const getAnimationDuration = () => {
    switch (breathPhase) {
      case 'in':
        return 'duration-[3000ms]';
      case 'hold':
        return 'duration-[1500ms]';
      case 'out':
        return 'duration-[3000ms]';
      case 'pause':
        return 'duration-[1500ms]';
      case 'complete':
        return 'duration-[2000ms]';
      default:
        return 'duration-[1000ms]';
    }
  };

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[95vh] overflow-y-auto shadow-xl border border-yellow-200/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200/50 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-normal text-gray-800">Breathing Exercise</h2>
              <p className="text-gray-600 mt-0.5 text-xs font-normal">15 seconds of mindful breathing</p>
            </div>
            <button 
              onClick={() => window.history.back()}
              className="p-1.5 hover:bg-yellow-100 rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 text-center bg-white">
          {/* Timer */}
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="text-4xl font-normal text-gray-800 mb-2">
                {timeLeft}s
              </div>
              {/* Subtle timer effect */}
              {isActive && (
                <div className="absolute inset-0 text-4xl font-normal text-yellow-300/30 animate-pulse">
                  {timeLeft}s
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 font-normal">
              {cycleCount > 0 && `${cycleCount} cycle${cycleCount > 1 ? 's' : ''} completed`}
            </div>
          </div>

          {/* Breathing Circle */}
          <div className="flex justify-center items-center mb-6">
            <div className="relative">
              {/* Minimal outer rings */}
              {isActive && (
                <>
                  <div className="absolute inset-0 rounded-full border border-yellow-200/40 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full border border-yellow-300/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                </>
              )}
              
              {/* Main breathing circle */}
              <div 
                className={`
                  ${getCircleSize()} 
                  bg-gradient-to-br ${getBreathColor()} 
                  rounded-full flex items-center justify-center 
                  transition-all ease-in-out ${getAnimationDuration()}
                  shadow-lg
                  ${isActive ? 'animate-pulse' : ''}
                  hover:scale-105
                  border border-yellow-200/30
                `}
                style={{
                  boxShadow: breathPhase === 'in' ? '0 0 20px rgba(251, 191, 36, 0.3)' :
                             breathPhase === 'hold' ? '0 0 20px rgba(245, 158, 11, 0.3)' :
                             breathPhase === 'out' ? '0 0 20px rgba(217, 119, 6, 0.3)' :
                             breathPhase === 'pause' ? '0 0 20px rgba(180, 83, 9, 0.3)' :
                             breathPhase === 'complete' ? '0 0 20px rgba(146, 64, 14, 0.3)' : '0 0 10px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="text-gray-800 text-center">
                  <div className="text-sm font-normal mb-0.5">
                    {getBreathText()}
                  </div>
                  <div className="text-xs opacity-70 font-normal">
                    {breathPhase === 'in' && 'Slowly...'}
                    {breathPhase === 'hold' && 'Hold it...'}
                    {breathPhase === 'out' && 'Gently...'}
                    {breathPhase === 'pause' && 'Relax...'}
                    {breathPhase === 'complete' && 'Well done!'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200/50 shadow-sm">
              <h3 className="font-normal text-gray-800 mb-3 text-center text-base">
                Instructions
              </h3>
              <div className="text-xs text-gray-600 space-y-2 font-normal">
                <div className="flex items-center">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full mr-2"></div>
                  Breathe in for 3 seconds
                </div>
                <div className="flex items-center">
                  <div className="w-1 h-1 bg-yellow-500 rounded-full mr-2"></div>
                  Hold for 1.5 seconds
                </div>
                <div className="flex items-center">
                  <div className="w-1 h-1 bg-yellow-600 rounded-full mr-2"></div>
                  Breathe out for 3 seconds
                </div>
                <div className="flex items-center">
                  <div className="w-1 h-1 bg-yellow-300 rounded-full mr-2"></div>
                  Rest for 1.5 seconds
                </div>
                <div className="mt-3 p-2 bg-yellow-100 rounded border border-yellow-200">
                  <div className="text-gray-700 font-normal text-center text-xs">Complete 2 cycles in 15 seconds</div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-3 mb-6">
            {!isActive && !isResetting ? (
              <button
                onClick={startExercise}
                className="flex items-center gap-1.5 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-gray-800 rounded-lg font-normal transition-all duration-200 border border-yellow-300/50 shadow-sm hover:shadow-md text-sm"
              >
                <Play size={16} />
                Start Exercise
              </button>
            ) : isResetting ? (
              <div className="flex items-center gap-1.5 px-4 py-2 bg-yellow-200 text-gray-800 rounded-lg font-normal shadow-sm text-sm">
                <div className="w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                Exercise Complete!
              </div>
            ) : (
              <>
                <button
                  onClick={pauseExercise}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-gray-700 rounded-lg font-normal transition-all duration-200 border border-yellow-200/50 shadow-sm hover:shadow-md text-sm"
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={resetExercise}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-normal transition-all duration-200 border border-gray-200 shadow-sm hover:shadow-md text-sm"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {isActive && (
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-1.5 border border-gray-200">
                <div 
                  className="bg-gradient-to-r from-yellow-200 to-yellow-400 h-1.5 rounded-full transition-all duration-1000 shadow-sm"
                  style={{ width: `${((15 - timeLeft) / 15) * 100}%` }}
                >
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center font-normal">
                {Math.round(((15 - timeLeft) / 15) * 100)}% Complete
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
