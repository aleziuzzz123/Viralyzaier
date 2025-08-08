
import React from 'react';

interface TestimonialCardProps {
    image: string;
    alt: string;
    quote: string;
    name: string;
    location: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ image, alt, quote, name, location }) => {
    return (
        <div className="bg-[#2A1A5E] p-6 rounded-xl border border-[#4A3F7A]/50 shadow-lg flex flex-col h-full">
            <div className="flex items-center mb-4">
                <img src={image} alt={alt} className="w-14 h-14 rounded-full object-cover border-2 border-[#DAFF00]" />
                <div className="ml-4">
                    <p className="font-bold text-white text-lg">{name}</p>
                    <p className="text-purple-300 text-sm">{location}</p>
                </div>
            </div>
            <div className="flex-grow">
                <p className="text-purple-200/90 leading-relaxed italic">"{quote}"</p>
            </div>
            <div className="mt-4 text-yellow-400">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
            </div>
        </div>
    );
};
