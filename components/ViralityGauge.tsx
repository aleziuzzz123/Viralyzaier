import React from 'react';

interface ViralityGaugeProps {
    score: number;
    size?: 'sm' | 'lg';
}

const ViralityGauge: React.FC<ViralityGaugeProps> = ({ score, size = 'lg' }) => {
    const getScoreColor = (s: number) => {
        if (s >= 90) return 'text-green-400';
        if (s >= 75) return 'text-lime-400';
        if (s >= 50) return 'text-yellow-400';
        if (s >= 25) return 'text-orange-400';
        return 'text-red-400';
    };

    const config = {
        lg: {
            wrapper: 'w-40 h-40',
            viewBox: '0 0 120 120',
            radius: 54,
            stroke: 10,
            cx: 60,
            cy: 60,
            textMain: 'text-4xl',
            textSub: 'text-xl',
        },
        sm: {
            wrapper: 'w-24 h-24',
            viewBox: '0 0 60 60',
            radius: 26,
            stroke: 6,
            cx: 30,
            cy: 30,
            textMain: 'text-2xl',
            textSub: 'text-lg',
        },
    };

    const { wrapper, viewBox, radius, stroke, cx, cy, textMain, textSub } = config[size];
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className={`relative ${wrapper}`}>
            <svg className="w-full h-full" viewBox={viewBox}>
                <circle className="text-gray-700" strokeWidth={stroke} stroke="currentColor" fill="transparent" r={radius} cx={cx} cy={cy} />
                <circle
                    className={`${getScoreColor(score)} transition-all duration-1000 ease-in-out`}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={cx}
                    cy={cy}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`${textMain} font-black ${getScoreColor(score)}`}>{Math.round(score)}</span>
                <span className={`${textSub} font-bold ${getScoreColor(score)}`}>%</span>
            </div>
        </div>
    );
};

export default ViralityGauge;