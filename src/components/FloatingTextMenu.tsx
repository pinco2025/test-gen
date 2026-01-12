import React, { useState, useEffect } from 'react';

export const FloatingTextMenu: React.FC = () => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [targetInput, setTargetInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

    useEffect(() => {
        const handleMouseUp = (e: MouseEvent) => {
            const activeElement = document.activeElement;

            // Only trigger for inputs and textareas
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
                const start = input.selectionStart;
                const end = input.selectionEnd;

                if (start !== null && end !== null && start !== end) {
                    // Show menu above mouse cursor
                    const menuHeight = 80; // Increased height estimation for potential two rows
                    let top = e.clientY - menuHeight - 10;
                    let left = e.clientX;

                    // Keep within viewport
                    if (top < 0) top = e.clientY + 20;
                    if (left < 0) left = 10;
                    if (left > window.innerWidth - 320) left = window.innerWidth - 320; // Adjusted for wider menu

                    setPosition({ top, left });
                    setTargetInput(input);
                    return;
                }
            }
            setPosition(null);
            setTargetInput(null);
        };

        // Listen for selection changes to hide menu if selection is lost
        const handleSelectionChange = () => {
            const activeElement = document.activeElement;
            // Check if we have a valid menu shown and the active element is an input
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
                // Only hide if selection is collapsed (no text selected)
                if (input.selectionStart === input.selectionEnd) {
                    setPosition(null);
                    setTargetInput(null);
                }
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [targetInput]);

    const triggerChange = (input: HTMLInputElement | HTMLTextAreaElement, newValue: string) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
        )?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value"
        )?.set;

        if (input.tagName === 'INPUT' && nativeInputValueSetter) {
            nativeInputValueSetter.call(input, newValue);
        } else if (input.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
            nativeTextAreaValueSetter.call(input, newValue);
        } else {
            input.value = newValue;
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const wrapSelection = (prefix: string, suffix: string) => {
        if (!targetInput) return;
        const start = targetInput.selectionStart || 0;
        const end = targetInput.selectionEnd || 0;
        const text = targetInput.value;
        const selectedText = text.substring(start, end);

        const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);

        triggerChange(targetInput, newText);
        setPosition(null);
    };

    const fixSlashes = () => {
        if (!targetInput) return;
        const start = targetInput.selectionStart || 0;
        const end = targetInput.selectionEnd || 0;
        const text = targetInput.value;
        const selectedText = text.substring(start, end);

        const fixedSelection = selectedText.replace(/\\\\/g, '\\');
        const newText = text.substring(0, start) + fixedSelection + text.substring(end);

        triggerChange(targetInput, newText);
        setPosition(null);
    };

    const cleanAndWrap = () => {
        if (!targetInput) return;
        const start = targetInput.selectionStart || 0;
        const end = targetInput.selectionEnd || 0;
        const text = targetInput.value;
        const selectedText = text.substring(start, end);

        // Remove all $
        const cleanedText = selectedText.replace(/\$/g, '');
        // Wrap in $...$
        const newText = text.substring(0, start) + '$' + cleanedText + '$' + text.substring(end);

        triggerChange(targetInput, newText);
        setPosition(null);
    };

    const cleanAndBold = () => {
        if (!targetInput) return;
        const start = targetInput.selectionStart || 0;
        const end = targetInput.selectionEnd || 0;
        const text = targetInput.value;
        const selectedText = text.substring(start, end);

        // Remove all *
        const cleanedText = selectedText.replace(/\*/g, '');
        // Wrap in $\textbf{...}$
        const newText = text.substring(0, start) + '$\\textbf{' + cleanedText + '}$' + text.substring(end);

        triggerChange(targetInput, newText);
        setPosition(null);
    };

    const fixDoubleDollars = () => {
        if (!targetInput) return;
        const start = targetInput.selectionStart || 0;
        const end = targetInput.selectionEnd || 0;
        const text = targetInput.value;
        const selectedText = text.substring(start, end);

        // Replace $$ with $
        const fixedText = selectedText.replace(/\$\$/g, '$');
        const newText = text.substring(0, start) + fixedText + text.substring(end);

        triggerChange(targetInput, newText);
        setPosition(null);
    };

    const wrapBold = (withDelimiters: boolean) => {
        if (!targetInput) return;
        const start = targetInput.selectionStart || 0;
        const end = targetInput.selectionEnd || 0;
        const text = targetInput.value;
        const selectedText = text.substring(start, end);

        let replacement = '';
        if (withDelimiters) {
            replacement = `$\\textbf{${selectedText}}$`;
        } else {
            replacement = `\\textbf{${selectedText}}`;
        }

        const newText = text.substring(0, start) + replacement + text.substring(end);

        triggerChange(targetInput, newText);
        setPosition(null);
    }

    if (!position) return null;

    const Button = ({ onClick, children, title, className = "", colorClass = "hover:bg-gray-700 text-gray-200" }: any) => (
        <button
            onClick={onClick}
            className={`h-8 px-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${colorClass} ${className}`}
            title={title}
        >
            {children}
        </button>
    );

    const Separator = () => <div className="w-[1px] h-5 bg-gray-600/50 mx-1"></div>;

    return (
        <div
            className="fixed z-[9999] flex flex-col bg-[#1e1e2d] border border-gray-700 text-white rounded-xl shadow-2xl p-2 gap-2 animate-in fade-in zoom-in duration-100 max-w-[400px]"
            style={{ top: position.top, left: position.left }}
            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on input
        >
            {/* Row 1: LaTeX Wrappers */}
            <div className="flex items-center flex-wrap gap-1">
                <Button onClick={() => wrapSelection('$', '$')} title="Wrap in $...$" colorClass="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20">
                    <span className="font-mono">$</span>
                </Button>
                <Button onClick={() => wrapSelection('$$', '$$')} title="Wrap in $$...$$" colorClass="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20">
                    <span className="font-mono">$$</span>
                </Button>
                <Separator />
                <Button onClick={() => wrapBold(false)} title="Bold \textbf{}" colorClass="hover:bg-gray-700">
                    <span className="font-serif font-bold">B</span>
                </Button>
                <Button onClick={() => wrapBold(true)} title="Math Bold $\textbf{}$" colorClass="hover:bg-gray-700">
                    <span className="font-mono text-xs">$</span><span className="font-serif font-bold">B</span><span className="font-mono text-xs">$</span>
                </Button>
                <Button onClick={cleanAndBold} title="Clean * & Bold $\textbf{}$" colorClass="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20">
                    <span className="material-symbols-outlined text-[16px]">format_bold</span>
                    <span className="text-[10px] leading-none opacity-60">Clean</span>
                </Button>
            </div>

            {/* Row 2: Fixers & Utilities */}
            <div className="flex items-center flex-wrap gap-1 border-t border-gray-700 pt-2">
                <Button onClick={cleanAndWrap} title="Clean & Wrap in $...$" colorClass="hover:bg-green-900/30 text-green-400">
                    <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                    <span className="font-mono text-xs">$</span>
                </Button>
                <Button onClick={fixDoubleDollars} title="Replace $$ with $" colorClass="hover:bg-orange-900/30 text-orange-400">
                    <span className="font-mono text-xs line-through opacity-70">$$</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                    <span className="font-mono text-xs">$</span>
                </Button>
                <Button onClick={fixSlashes} title="Replace \\ with \" colorClass="hover:bg-yellow-900/30 text-yellow-500">
                    <span className="font-mono text-xs">\\</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                    <span className="font-mono text-xs">\</span>
                </Button>
                <Separator />
                <Button onClick={() => {
                    if (!targetInput) return;
                    const start = targetInput.selectionStart || 0;
                    const end = targetInput.selectionEnd || 0;
                    const text = targetInput.value;
                    const selectedText = text.substring(start, end);

                    const cleanedText = selectedText.replace(/\$/g, '');
                    const newText = text.substring(0, start) + cleanedText + text.substring(end);

                    triggerChange(targetInput, newText);
                    setPosition(null);
                }} title="Remove all $" colorClass="hover:bg-red-900/30 text-red-400">
                    <span className="material-symbols-outlined text-[16px]">backspace</span>
                    <span className="font-mono text-xs">$</span>
                </Button>
            </div>
        </div>
    );
};
