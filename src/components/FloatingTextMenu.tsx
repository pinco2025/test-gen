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
                 const menuHeight = 40;
                 let top = e.clientY - menuHeight - 10;
                 let left = e.clientX;

                 // Keep within viewport
                 if (top < 0) top = e.clientY + 20;
                 if (left < 0) left = 10;
                 if (left > window.innerWidth - 150) left = window.innerWidth - 150;

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
        if (activeElement === targetInput) {
             // Verify selection still exists
             const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
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

  return (
      <div
        className="fixed z-[9999] flex items-center bg-gray-800 text-white rounded-lg shadow-xl px-2 py-1.5 gap-2 animate-in fade-in zoom-in duration-100"
        style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
        onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on input
      >
          <button onClick={() => wrapSelection('$', '$')} className="px-2 py-1 hover:bg-gray-700 rounded text-sm font-mono font-bold" title="Wrap in $...$">$</button>
          <div className="w-[1px] h-4 bg-gray-600"></div>
          <button onClick={() => wrapSelection('$$', '$$')} className="px-2 py-1 hover:bg-gray-700 rounded text-sm font-mono font-bold" title="Wrap in $$...$$">$$</button>
          <div className="w-[1px] h-4 bg-gray-600"></div>
          <button onClick={cleanAndWrap} className="px-2 py-1 hover:bg-gray-700 rounded text-sm font-mono font-bold flex items-center" title="Clean & Wrap in $...$">
            <span className="material-symbols-outlined text-[16px]">cleaning_services</span>$
          </button>
          <button onClick={() => {
              if (!targetInput) return;
              const start = targetInput.selectionStart || 0;
              const end = targetInput.selectionEnd || 0;
              const text = targetInput.value;
              const selectedText = text.substring(start, end);

              const cleanedText = selectedText.replace(/\$/g, '');
              const newText = text.substring(0, start) + cleanedText + text.substring(end);

              triggerChange(targetInput, newText);
              setPosition(null);
          }} className="px-2 py-1 hover:bg-gray-700 rounded text-sm font-mono font-bold flex items-center text-red-400" title="Remove all $">
            <span className="material-symbols-outlined text-[16px]">backspace</span>$
          </button>
          <div className="w-[1px] h-4 bg-gray-600"></div>
          <button onClick={() => wrapBold(false)} className="px-2 py-1 hover:bg-gray-700 rounded text-sm font-mono font-bold" title="Bold \textbf{}">B</button>
          <button onClick={() => wrapBold(true)} className="px-2 py-1 hover:bg-gray-700 rounded text-sm font-mono font-bold" title="Bold $\textbf{}$">$B$</button>
          <div className="w-[1px] h-4 bg-gray-600"></div>
          <button onClick={fixSlashes} className="px-2 py-1 hover:bg-gray-700 rounded text-sm font-mono font-bold" title="Replace \\ with \">\</button>
      </div>
  );
};
