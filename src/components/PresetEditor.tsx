import React, { useState, useEffect } from 'react';

interface Preset {
    id: string;
    name: string;
    description: string;
    [key: string]: any;
}

interface PresetEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onRefreshPresets: () => void;
}

export function PresetEditor({ isOpen, onClose, onRefreshPresets }: PresetEditorProps) {
    const [presets, setPresets] = useState<Preset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [jsonContent, setJsonContent] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadPresets();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedPresetId && presets.length > 0) {
            loadPresetContent(selectedPresetId);
        } else {
            setJsonContent('');
        }
    }, [selectedPresetId]);

    const loadPresets = async () => {
        setIsLoading(true);
        try {
            const list = await window.electronAPI.presets.list();
            setPresets(list);
            if (list.length > 0 && !selectedPresetId) {
                setSelectedPresetId(list[0].id);
            }
        } catch (err) {
            setError('Failed to load presets');
        } finally {
            setIsLoading(false);
        }
    };

    const loadPresetContent = async (id: string) => {
        setIsLoading(true);
        try {
            const content = await window.electronAPI.presets.get(id);
            setJsonContent(JSON.stringify(content, null, 4));
            setError(null);
        } catch (err) {
            setError('Failed to load preset content');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setJsonContent(e.target.value);
        setSuccessMsg(null);
        try {
            JSON.parse(e.target.value);
            setError(null);
        } catch (e: any) {
            setError(`Invalid JSON: ${e.message}`);
        }
    };

    const handleSave = async () => {
        try {
            const preset = JSON.parse(jsonContent);
            if (!preset.id || !preset.name) {
                setError('Preset must have "id" and "name" fields');
                return;
            }

            const result = await window.electronAPI.presets.save(preset);
            if (result.success) {
                setSuccessMsg('Preset saved successfully');
                loadPresets();
                onRefreshPresets();
                // Determine the new ID after sanitization
                const safeId = preset.id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
                setSelectedPresetId(safeId);
            } else {
                setError(`Save failed: ${result.message}`);
            }
        } catch (e: any) {
            setError(`Invalid JSON: ${e.message}`);
        }
    };

    const handleImport = async () => {
        try {
            const result = await window.electronAPI.presets.import();
            if (result.success) {
                setSuccessMsg('Preset imported successfully');
                loadPresets();
                onRefreshPresets();
                setSelectedPresetId(result.id || null);
            } else if (result.message !== 'Cancelled') {
                setError(`Import failed: ${result.message}`);
            }
        } catch (e: any) {
            setError(`Import error: ${e.message}`);
        }
    };

    const handleCreateNew = () => {
        const template = {
            id: "new-preset",
            name: "New Preset",
            description: "Description of your new preset",
            Physics: {
                div1: {
                    tableDistribution: { jee: 70, neet: 20, bits: 10 },
                    classDistribution: { class2: 1, class1: 7, classNull: 12 }
                },
                div2: {
                    tableDistribution: { jee: 100, neet: 0, bits: 0 },
                    classDistribution: { class2: 0, class1: 0, classNull: 5 }
                }
            },
            Chemistry: {
                div1: {
                    tableDistribution: { jee: 70, neet: 20, bits: 10 },
                    classDistribution: { class2: 1, class1: 7, classNull: 12 }
                },
                div2: {
                    tableDistribution: { jee: 100, neet: 0, bits: 0 },
                    classDistribution: { class2: 0, class1: 0, classNull: 5 }
                }
            },
            Mathematics: {
                div1: {
                    tableDistribution: { jee: 70, neet: 20, bits: 10 },
                    classDistribution: { class2: 1, class1: 7, classNull: 12 }
                },
                div2: {
                    tableDistribution: { jee: 100, neet: 0, bits: 0 },
                    classDistribution: { class2: 0, class1: 0, classNull: 5 }
                }
            },
            globalRules: {
                prioritizeLowFrequency: true,
                incrementFrequencyOnSelect: true
            }
        };

        // Don't save yet, just show content
        setJsonContent(JSON.stringify(template, null, 4));
        setSelectedPresetId(null);
        setError(null);
        setSuccessMsg("Draft created. Click Save to persist.");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e1e2d] w-[90vw] h-[85vh] rounded-xl shadow-2xl flex overflow-hidden border border-gray-200 dark:border-[#2d2d3b]">

                {/* Sidebar */}
                <div className="w-64 bg-gray-50 dark:bg-[#181825] border-r border-gray-200 dark:border-[#2d2d3b] flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-[#2d2d3b]">
                        <h2 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100">Presets</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleImport}
                                className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-xs">upload</span>
                                Import
                            </button>
                            <button
                                onClick={handleCreateNew}
                                className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-xs">add</span>
                                New
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {isLoading && presets.length === 0 ? (
                            <div className="text-center p-4 text-gray-400 text-sm">Loading...</div>
                        ) : (
                            presets.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setSelectedPresetId(preset.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedPresetId === preset.id
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252535]'
                                        }`}
                                >
                                    <div className="font-medium truncate">{preset.name}</div>
                                    <div className="text-xs opacity-70 truncate">{preset.description}</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="p-4 border-b border-gray-200 dark:border-[#2d2d3b] flex items-center justify-between bg-white dark:bg-[#1e1e2d]">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                                {selectedPresetId ? `Editing: ${selectedPresetId}` : 'Creating New Preset'}
                            </h3>
                            {error ? (
                                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    {error}
                                </p>
                            ) : successMsg ? (
                                <p className="text-green-500 text-sm mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    {successMsg}
                                </p>
                            ) : (
                                <p className="text-gray-400 text-sm mt-1">
                                    Edit the JSON configuration below. ID and Name are required.
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={!!error && !jsonContent}
                                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${!!error
                                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm">save</span>
                                Save Preset
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-100 dark:bg-[#252535] text-gray-600 dark:text-gray-400 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-[#323245] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-0 relative">
                        <textarea
                            value={jsonContent}
                            onChange={handleJsonChange}
                            className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-[#0f0f15] text-gray-800 dark:text-[#a6accd] resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
                            spellCheck={false}
                            placeholder="{ ... }"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
