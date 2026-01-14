import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Preset {
    id: string;
    name: string;
    description: string;
    [key: string]: any;
}

interface PresetSelectorProps {
    presets: Preset[];
    selectedPresetId: string;
    onSelect: (presetId: string) => void;
    onApply: () => void;
    isValid: boolean;
    isLoading?: boolean;
    onManage?: () => void;
    compact?: boolean;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
    presets,
    selectedPresetId,
    onSelect,
    onApply,
    isValid,
    isLoading = false,
    onManage,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
    const selectedPreset = presets.find(p => p.id === selectedPresetId);

    // Calculate dropdown positions
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Basic positioning: place below the trigger, aligned left
            setDropdownStyles({
                position: 'fixed',
                top: `${rect.bottom + 8}px`,
                left: `${rect.left}px`,
                // Ensure it doesn't go offscreen (basic check, can be improved)
                minWidth: compact ? '200px' : `${rect.width}px`,
                maxWidth: '90vw'
            });
        }
    }, [isOpen, compact]);

    // Close on scroll to avoid detached dropdowns (simple solution)
    useEffect(() => {
        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);

    return (
        <div className={`relative ${compact ? 'flex items-center gap-2' : 'w-full max-w-sm'}`}>
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`text-left bg-white dark:bg-[#1e1e2d] border transition-all duration-200 rounded-xl flex items-center justify-between group ${compact
                    ? 'h-10 px-3 min-w-[200px] gap-2 border-gray-200 dark:border-[#2d2d3b] hover:border-violet-300 dark:hover:border-violet-700'
                    : `w-full p-3 ${isOpen ? 'border-violet-500 ring-4 ring-violet-500/10 shadow-lg' : 'border-gray-200 dark:border-[#2d2d3b] hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md'}`
                    }`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* Icon - Smaller in compact mode */}
                    <div className={`${compact ? 'size-6 text-sm rounded bg-gray-50 dark:bg-gray-800' : 'size-10 rounded-lg'} flex items-center justify-center flex-shrink-0 transition-colors ${selectedPreset
                        ? (compact ? 'text-violet-600 dark:text-violet-400' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400')
                        : (compact ? 'text-gray-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400')
                        }`}>
                        <span className={`material-symbols-outlined ${compact ? 'text-base' : 'text-xl'}`}>
                            {selectedPreset ? 'tune' : 'auto_awesome'}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className={`font-bold text-gray-900 dark:text-white truncate ${compact ? 'text-sm' : 'text-sm'}`}>
                            {selectedPreset ? selectedPreset.name : 'Select a Preset'}
                        </div>
                        {!compact && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {selectedPreset ? selectedPreset.description : 'Choose configuration...'}
                            </div>
                        )}
                    </div>
                </div>
                <span className={`material-symbols-outlined text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-violet-500' : ''}`}>
                    expand_more
                </span>
            </button>

            {/* Dropdown Menu via Portal */}
            {isOpen && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className="fixed z-[9999] bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left"
                        style={dropdownStyles}
                    >
                        <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#252535]">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-2 uppercase tracking-wider">
                                Available Presets
                            </span>
                        </div>
                        <div className="overflow-y-auto p-1.5 custom-scrollbar max-h-[300px]">
                            {presets.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        onSelect(preset.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left p-3 rounded-lg mb-1 last:mb-0 transition-all duration-150 group flex items-start gap-3 ${selectedPresetId === preset.id
                                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-900 dark:text-violet-100'
                                        : 'hover:bg-gray-50 dark:hover:bg-[#252535] text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-lg mt-0.5 ${selectedPresetId === preset.id ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                        {selectedPresetId === preset.id ? 'radio_button_checked' : 'radio_button_unchecked'}
                                    </span>
                                    <div>
                                        <div className="font-semibold text-sm">{preset.name}</div>
                                        <div className={`text-xs mt-0.5 line-clamp-2 ${selectedPresetId === preset.id ? 'text-violet-700/80 dark:text-violet-300/80' : 'text-gray-500'}`}>
                                            {preset.description}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Apply Button & Actions */}
            <div className={`${compact ? 'flex items-center gap-2' : 'mt-3 flex gap-2'}`}>
                <button
                    onClick={onApply}
                    disabled={!isValid || !selectedPresetId || isLoading}
                    className={`rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${compact ? 'h-10 px-4' : 'flex-1 py-2.5'} ${isValid && selectedPresetId && !isLoading
                        ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                            {!compact && 'Processing...'}
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-lg">auto_awesome</span>
                            {!compact && 'Apply Preset'}
                            {compact && 'Apply'}
                        </>
                    )}
                </button>

                {onManage && (
                    <button
                        onClick={onManage}
                        className={`rounded-xl border border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#252535] transition-colors ${compact ? 'h-10 w-10 flex items-center justify-center p-0' : 'p-2.5'}`}
                        title="Manage Presets"
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                )}
            </div>
        </div>
    );
};
