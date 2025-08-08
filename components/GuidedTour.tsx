import React, { useState, useEffect } from 'react';

const tourSteps = [
    {
        element: '[data-tour="video-preview"]',
        title: "The Main Stage",
        content: "This is your video preview. What you see here is what you get! You can directly move and resize overlays like stickers on this canvas."
    },
    {
        element: '[data-tour="timeline"]',
        title: "The Interactive Timeline",
        content: "This is where you'll build your video. Drag clips to move them, or drag their edges to trim them. Use the razor tool to split clips."
    },
    {
        element: '[data-tour="add-media"]',
        title: "Add Your Content",
        content: "This is your creative hub! Generate AI assets, search for stock media, or upload your own files right here."
    },
    {
        element: '[data-tour="inspector"]',
        title: "The Inspector",
        content: "When you select a clip on the timeline, all its editing options (like effects, color, and layout) will appear here."
    }
];

const GuidedTour: React.FC = () => {
    const [stepIndex, setStepIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('viralyzer-editor-tour-v2');
        if (!hasSeenTour) {
            setIsOpen(true);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const currentStep = tourSteps[stepIndex];
        const targetElement = document.querySelector(currentStep.element);
        
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            setPopoverPosition({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
             targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [stepIndex, isOpen]);

    const handleNext = () => {
        if (stepIndex < tourSteps.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('viralyzer-editor-tour-v2', 'true');
    };

    if (!isOpen) return null;

    const currentStep = tourSteps[stepIndex];

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                style={{
                    clipPath: `path('M0,0H${window.innerWidth}V${window.innerHeight}H0V0ZM${popoverPosition.left},${popoverPosition.top}H${popoverPosition.left + popoverPosition.width}V${popoverPosition.top + popoverPosition.height}H${popoverPosition.left}V${popoverPosition.top}Z')`
                }}
            />
            {/* Popover */}
            <div
                className="absolute bg-gray-800 text-white p-6 rounded-lg shadow-2xl w-80 border-2 border-indigo-500 animate-fade-in-up"
                style={{
                    top: popoverPosition.top + popoverPosition.height + 10,
                    left: Math.min(
                        popoverPosition.left,
                        window.innerWidth - 320 - 20 // 320 is popover width, 20 is padding
                    ),
                    animationDuration: '0.3s'
                }}
            >
                <h3 className="text-lg font-bold text-indigo-400 mb-2">{currentStep.title}</h3>
                <p className="text-sm text-gray-300 mb-4">{currentStep.content}</p>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{stepIndex + 1} / {tourSteps.length}</span>
                    <div>
                        <button onClick={handleClose} className="text-xs font-semibold text-gray-400 hover:text-white mr-4">Skip Tour</button>
                        <button onClick={handleNext} className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-md">
                            {stepIndex === tourSteps.length - 1 ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuidedTour;