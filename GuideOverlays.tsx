import React from 'react';

interface GuideOverlaysProps {
    aspectRatio: '16/9' | '9/16' | '1/1';
}

const GuideOverlays: React.FC<GuideOverlaysProps> = ({ aspectRatio }) => {
    const safeZoneStyle: React.CSSProperties = {
        position: 'absolute',
        border: '1px dashed rgba(255, 255, 0, 0.7)',
        boxSizing: 'border-box',
    };
    
    let safeZones = null;

    if (aspectRatio === '9/16') {
        safeZones = (
            <>
                {/* TikTok/Shorts UI Zones (approximations) */}
                <div style={{ ...safeZoneStyle, top: 0, left: 0, right: 0, height: '15%', background: 'rgba(255,0,0,0.1)' }}></div>
                <div style={{ ...safeZoneStyle, bottom: 0, left: 0, right: 0, height: '20%', background: 'rgba(255,0,0,0.1)' }}></div>
                <div style={{ ...safeZoneStyle, bottom: '20%', right: 0, width: '20%', height: '30%', background: 'rgba(255,0,0,0.1)' }}></div>
            </>
        )
    }

    return (
        <div className="absolute inset-0 pointer-events-none z-30">
            {/* Rule of Thirds Grid */}
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20"></div>
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20"></div>
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20"></div>
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20"></div>

            {/* Title Safe Area (90% box) */}
            <div style={{ ...safeZoneStyle, top: '5%', left: '5%', width: '90%', height: '90%' }}></div>
            
            {safeZones}
        </div>
    );
};

export default GuideOverlays;