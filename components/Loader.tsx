import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

const Loader: React.FC = () => {
  const { t } = useAppContext();
  const loadingSteps = [
    t('loader.preparing'),
    t('loader.extracting'),
    t('loader.analyzing_hook'),
    t('loader.evaluating_flow'),
    t('loader.cross_referencing'),
    t('loader.compiling'),
    t('loader.finalizing'),
    t('loader.almost_there'),
  ];
  
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prevStep => {
        if (prevStep < loadingSteps.length - 1) {
          return prevStep + 1;
        }
        clearInterval(interval);
        return prevStep;
      });
    }, 2000); // Change step every 2 seconds

    return () => clearInterval(interval);
  }, [loadingSteps.length]);

  useEffect(() => {
    // Smoothly update progress
    const newProgress = Math.min(((currentStep + 1) / loadingSteps.length) * 100, 99);
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < newProgress) {
          return prev + 1;
        }
        clearInterval(progressInterval);
        return prev;
      });
    }, 20); // Animate progress update
    
    return () => clearInterval(progressInterval);
  }, [currentStep, loadingSteps.length]);
  
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-md">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle
            className="text-gray-700"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
          />
          <circle
            className="text-indigo-500"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' , transition: 'stroke-dashoffset 0.3s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{Math.round(progress)}%</span>
        </div>
      </div>
      <div className="h-10 flex items-center justify-center">
        <p key={currentStep} className="text-lg text-gray-200 font-semibold animate-fade-in">
          {loadingSteps[currentStep]}
        </p>
      </div>
      <p className="text-sm text-gray-500">{t('loader.hand_off')}</p>
    </div>
  );
};

export default Loader;