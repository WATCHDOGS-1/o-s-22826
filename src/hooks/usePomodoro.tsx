import { useState, useEffect, useCallback } from 'react';
import { showEncouragement, showInfo } from '@/lib/toast';

type PomodoroPhase = 'Focus' | 'Short Break' | 'Long Break';

interface PomodoroSettings {
  focusDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  cyclesBeforeLongBreak: number;
}

const defaultSettings: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4,
};

export const usePomodoro = (onTimerEnd: (durationSeconds: number) => void) => {
  const [settings] = useState(defaultSettings);
  const [phase, setPhase] = useState<PomodoroPhase>('Focus');
  const [cycle, setCycle] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(settings.focusDuration * 60);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const getPhaseDuration = useCallback((currentPhase: PomodoroPhase) => {
    switch (currentPhase) {
      case 'Focus':
        return settings.focusDuration * 60;
      case 'Short Break':
        return settings.shortBreakDuration * 60;
      case 'Long Break':
        return settings.longBreakDuration * 60;
    }
  }, [settings]);

  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      setSessionStartTime(Date.now());
      showInfo(`Starting ${phase} phase.`);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    showInfo(`${phase} paused.`);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPhase('Focus');
    setCycle(1);
    setTimeRemaining(settings.focusDuration * 60);
    setSessionStartTime(null);
    showInfo("Pomodoro timer reset.");
  };

  const skipPhase = useCallback(() => {
    const duration = getPhaseDuration(phase);
    if (phase === 'Focus' && isRunning) {
      // If skipping a focus session, report the time spent
      const elapsedSeconds = duration - timeRemaining;
      onTimerEnd(elapsedSeconds);
    }
    
    let nextPhase: PomodoroPhase;
    let nextCycle = cycle;

    if (phase === 'Focus') {
      if (cycle < settings.cyclesBeforeLongBreak) {
        nextPhase = 'Short Break';
        nextCycle = cycle;
      } else {
        nextPhase = 'Long Break';
        nextCycle = 1; // Reset cycle count after long break
      }
    } else if (phase === 'Short Break') {
      nextPhase = 'Focus';
      nextCycle = cycle + 1;
    } else { // Long Break
      nextPhase = 'Focus';
      nextCycle = 1;
    }

    setPhase(nextPhase);
    setCycle(nextCycle);
    setTimeRemaining(getPhaseDuration(nextPhase));
    setIsRunning(false); // Pause after phase transition
    showEncouragement(`Transitioning to ${nextPhase}.`);
  }, [phase, cycle, settings, timeRemaining, isRunning, getPhaseDuration, onTimerEnd]);

  useEffect(() => {
    setTimeRemaining(getPhaseDuration(phase));
  }, [phase, getPhaseDuration]);

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isRunning && timeRemaining === 0) {
      // Timer finished
      clearInterval(interval);
      skipPhase();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, skipPhase]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return {
    timeRemaining,
    minutes,
    seconds,
    phase,
    cycle,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
    settings,
  };
};