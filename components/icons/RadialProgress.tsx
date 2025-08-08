
import React from 'react';

interface RadialProgressProps {
    progress: number;
    size?: number;
    strokeWidth?: number;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({ progress, size = 80, strokeWidth = 8 }) => {
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    const getStrokeColor = (p: number) => {
        if (p < 50) return '#f87171'; // red
        if (p < 80) return '#fbbf24'; // amber
        return '#34d399';
    }

    const strokeColor = getStrokeColor(progress);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#4A3F7A"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-gray-700"
                />
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s ease-in-out, stroke 0.3s ease-in-out' }}
                />
            </svg>
            <div
                className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                style={{ color: strokeColor, transition: 'color 0.3s ease-in-out' }}
            >
                {progress}
            </div>
        </div>
    );
};
