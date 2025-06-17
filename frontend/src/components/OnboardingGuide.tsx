import React from 'react';

const OnboardingGuide: React.FC = () => {
    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center animate-fade-in-smooth border border-blue-200">
            <span className="text-3xl sm:text-4xl mb-4 block">👋</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Witaj w Food Tracker!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
                Aby dodać swój pierwszy produkt, po prostu
                <span className="font-semibold text-teal-600"> kliknij w dzień na kalendarzu</span>,
                w którym upływa jego termin ważności.
            </p>
        </div>
    );
};

export default OnboardingGuide;
