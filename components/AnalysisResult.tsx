import React from 'react';
import { Analysis } from '../types';
import {
  CheckCircleIcon,
  LightBulbIcon,
  RefreshIcon,
  ThumbsUpIcon,
  HookIcon,
  PacingIcon,
  AudioIcon,
  CtaIcon,
  GoldenNuggetIcon,
  InfoIcon,
  RocketLaunchIcon,
  PhotoIcon
} from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface AnalysisResultProps {
  result: Analysis | null;
  onReset: () => void;
  videoPreviewUrl: string | null;
  onProceedToLaunchpad: () => void;
}

interface ScoreGaugeProps {
  score: number;
  t: (key: string) => string;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, t }) => {
    const getScoreColor = (s: number) => {
        if (s >= 85) return '#22c55e'; // green-500
        if (s >= 70) return '#84cc16'; // lime-500
        if (s >= 50) return '#facc15'; // yellow-400
        if (s >= 25) return '#f97316'; // orange-500
        return '#ef4444'; // red-500
    };

    const getScoreLabel = (s: number) => {
        if (s >= 85) return t('analysis_result.score_viral_contender');
        if (s >= 70) return t('analysis_result.score_excellent');
        if (s >= 50) return t('analysis_result.score_good_potential');
        if (s >= 25) return t('analysis_result.score_needs_work');
        return t('analysis_result.score_needs_rework');
    };

    const rotation = -120 + (score / 100) * 240;
    const color = getScoreColor(score);
    const label = getScoreLabel(score);

    return (
        <div className="w-full max-w-sm mx-auto p-4 flex flex-col items-center">
            <div className="relative w-64 h-40">
                <svg viewBox="0 0 200 120" className="w-full h-full">
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="25%" stopColor="#f97316" />
                            <stop offset="50%" stopColor="#facc15" />
                             <stop offset="75%" stopColor="#84cc16" />
                            <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                    </defs>
                    {/* Gauge track */}
                     <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        stroke="#374151" // gray-700
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                    />
                    {/* Gauge progress */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="251.32" // Circumference of semi-circle
                        strokeDashoffset={251.32 * (1 - (score / 100) * (240/180))} // Adjust for 240 degree arc
                        style={{
                           transform: 'rotate(120deg)',
                           transformOrigin: '100px 100px',
                           transition: 'stroke-dashoffset 1s ease-out'
                        }}
                    />
                </svg>
                {/* Needle */}
                <div
                    className="absolute bottom-5 left-1/2 w-1 h-20 bg-gray-200 origin-bottom transition-transform duration-1000 ease-out delay-500"
                    style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                >
                    <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-white border-4" style={{borderColor: color}}></div>
                </div>
            </div>
            <div className="text-center -mt-8">
                <span className="text-6xl font-black" style={{ color }}>{score}</span>
                <p className="font-bold text-lg mt-1" style={{ color }}>{label}</p>
            </div>
        </div>
    );
};

interface DetailGaugeProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  t: (key: string) => string;
}

const DetailGauge: React.FC<DetailGaugeProps> = ({ icon, label, score, t }) => {
    const displayScore = score;
    
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'bg-green-500';
        if (s >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    
    const getScoreDescriptor = (s: number) => {
        if (s >= 90) return t("analysis_result.score_descriptor_exceptional");
        if (s >= 70) return t("analysis_result.score_descriptor_strong");
        if (s >= 50) return t("analysis_result.score_descriptor_average");
        if (s >= 30) return t("analysis_result.score_descriptor_weak");
        return t("analysis_result.score_descriptor_rework");
    };

    const widthPercentage = displayScore;

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center space-x-2">
                     <div className="text-gray-400">{icon}</div>
                     <span className="text-sm font-medium text-gray-300">{label}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: getScoreColor(displayScore), color: 'white' }}>{getScoreDescriptor(displayScore)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className={`${getScoreColor(displayScore)} h-2.5 rounded-full transition-all duration-500 ease-out`} style={{ width: `0%`, animation: `fill-bar 1s ease-out 0.5s forwards` }} key={widthPercentage}>
                    <style>{`
                        @keyframes fill-bar {
                            to { width: ${widthPercentage}%; }
                        }
                    `}</style>
                </div>
            </div>
        </div>
    );
};

interface ImprovementItemProps {
  suggestion: string;
  reason: string;
  t: (key: string) => string;
}

const ImprovementItem: React.FC<ImprovementItemProps> = ({ suggestion, reason, t }) => (
  <li className="flex items-start group p-3 rounded-lg hover:bg-gray-900/50 transition-colors duration-200">
      <LightBulbIcon className="w-5 h-5 mr-4 mt-1 text-yellow-300 flex-shrink-0" />
      <div className="flex-1">
          <p className="text-gray-200">{suggestion}</p>
          <div className="relative">
              <p className="text-indigo-400 text-xs font-semibold mt-1 inline-flex items-center cursor-pointer">
                  {t('analysis_result.improvements_tooltip')} <InfoIcon className="w-3 h-3 ml-1.5" />
              </p>
              <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-950 border border-indigo-500 text-gray-300 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 transform group-hover:translate-y-0 translate-y-2">
                  {reason}
                   <div className="absolute left-4 -bottom-1 w-2 h-2 bg-indigo-500 transform rotate-45"></div>
              </div>
          </div>
      </div>
  </li>
);

const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, onReset, videoPreviewUrl, onProceedToLaunchpad }) => {
  const { t } = useAppContext();
  
  if (!result) {
    return (
        <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-3">Analysis Not Available</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">The virality analysis for this project has not been generated yet or could not be loaded.</p>
        </div>
    );
  }

  const { scores, summary, goldenNugget, strengths, improvements } = result;
  const overallScore = scores.overall;
  const isGoodScore = overallScore >= 70;
  const showProceedWarning = overallScore < 50;

  return (
    <div className="w-full max-w-6xl p-2">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 shadow-2xl border border-gray-700 animate-fade-in-up stagger-1">
            <h2 className="text-xl font-bold text-white mb-4 text-center">{t('analysis_result.virality_report')}</h2>
            <div className="w-full max-w-xs bg-black rounded-lg overflow-hidden shadow-lg mx-auto">
              {videoPreviewUrl ? (
                <video src={videoPreviewUrl} controls className="w-full h-full object-cover"></video>
              ) : (
                <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
                    <PhotoIcon className="w-16 h-16 text-gray-700"/>
                </div>
              )}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 shadow-2xl border border-gray-700 animate-fade-in-up stagger-2">
            <ScoreGauge score={overallScore} t={t as (key: string) => string} />
            <p className="mt-2 text-md italic text-gray-400 leading-relaxed text-center max-w-sm mx-auto">"{summary}"</p>
          </div>
        </div>
        
        <div className="lg:col-span-3 flex flex-col space-y-6">
          <div className="p-6 rounded-xl border border-yellow-400/30 shadow-lg bg-gradient-to-br from-yellow-400/20 via-gray-900/10 to-gray-900/10 animate-glow animate-fade-in-up stagger-3">
            <h3 className="flex items-center text-lg font-bold text-yellow-200 mb-2">
              <GoldenNuggetIcon className="w-6 h-6 mr-3"/>
              {t('analysis_result.golden_nugget_title')}
            </h3>
            <p className="text-yellow-100 text-md">{goldenNugget}</p>
            <p className="text-xs text-yellow-400/70 mt-2">{t('analysis_result.golden_nugget_subtitle')}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 shadow-2xl border border-gray-700 animate-fade-in-up stagger-4">
            <h3 className="text-xl font-bold text-white mb-4">{t('analysis_result.breakdown_title')}</h3>
            <div className="space-y-5">
                <DetailGauge icon={<HookIcon className="w-5 h-5"/>} label={t('analysis_result.hook_quality')} score={scores.hook} t={t as (key: string) => string} />
                <DetailGauge icon={<PacingIcon className="w-6 h-6 -ml-0.5"/>} label={t('analysis_result.pacing_editing')} score={scores.pacing} t={t as (key: string) => string} />
                <DetailGauge icon={<AudioIcon className="w-5 h-5"/>} label={t('analysis_result.audio_trends')} score={scores.audio} t={t as (key: string) => string} />
                <DetailGauge icon={<CtaIcon className="w-5 h-5"/>} label={t('analysis_result.cta')} score={scores.cta} t={t as (key: string) => string} />
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 shadow-2xl border border-gray-700 animate-fade-in-up stagger-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <h3 className="flex items-center text-xl font-bold text-white mb-3">
                  <ThumbsUpIcon className="w-6 h-6 mr-3 text-green-400"/>
                  {t('analysis_result.strengths_title')}
                </h3>
                <ul className="space-y-3">
                  {strengths.map((item: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="w-5 h-5 mr-3 mt-1 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="flex items-center text-xl font-bold text-white mb-3">
                  <LightBulbIcon className="w-6 h-6 mr-3 text-yellow-300"/>
                  {t('analysis_result.improvements_title')}
                </h3>
                <ul className="space-y-1 -m-3">
                  {improvements.map((item: { suggestion: string; reason: string; }, index: number) => (
                    <ImprovementItem key={index} suggestion={item.suggestion} reason={item.reason} t={t as (key: string) => string} />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center animate-fade-in-up flex flex-col items-center justify-center gap-4" style={{animationDelay: '0.6s'}}>
          <div className="flex flex-col items-center">
            <button
                onClick={onProceedToLaunchpad}
                className="w-full max-w-xs inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
            >
                <RocketLaunchIcon className="w-5 h-5 mr-2" />
                {showProceedWarning ? t('analysis_result.proceed_anyway_button') : t('analysis_result.proceed_button')}
            </button>
            {showProceedWarning && <p className="text-yellow-400 text-xs mt-2 max-w-xs">{t('analysis_result.proceed_warning')}</p>}
          </div>

         <button
            onClick={onReset}
            className={`w-full max-w-xs inline-flex items-center justify-center px-6 py-3 font-semibold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg ${
                isGoodScore 
                ? 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
        >
            <RefreshIcon className="w-5 h-5 mr-2" />
            {t('analysis_result.reanalyze_button')}
        </button>
      </div>
    </div>
  );
};

export default AnalysisResult;