import { useState, useEffect, useCallback } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';

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
    const [isLoadingPresets, setIsLoadingPresets] = useState(false);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Cached content for smooth transitions
    const [cachedContent, setCachedContent] = useState<string>('');

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
            setCachedContent('');
        }
    }, [selectedPresetId]);

    const loadPresets = async () => {
        setIsLoadingPresets(true);
        try {
            const list = await window.electronAPI.presets.list();
            setPresets(list);
            if (list.length > 0 && !selectedPresetId) {
                setSelectedPresetId(list[0].id);
            }
        } catch (err) {
            setError('Failed to load presets');
        } finally {
            setIsLoadingPresets(false);
        }
    };

    const loadPresetContent = async (id: string) => {
        // Cache current content for smooth transition
        if (jsonContent) {
            setCachedContent(jsonContent);
        }
        setIsTransitioning(true);
        setIsLoadingContent(true);

        try {
            const content = await window.electronAPI.presets.get(id);
            const formatted = JSON.stringify(content, null, 2);
            setJsonContent(formatted);
            setCachedContent(formatted);
            setError(null);
        } catch (err) {
            setError('Failed to load preset content');
        } finally {
            // Small delay for smooth transition
            setTimeout(() => {
                setIsLoadingContent(false);
                setIsTransitioning(false);
            }, 150);
        }
    };

    const handleJsonChange = useCallback((code: string) => {
        setJsonContent(code);
        setSuccessMsg(null);
        try {
            JSON.parse(code);
            setError(null);
        } catch (e: any) {
            setError(`Invalid JSON: ${e.message}`);
        }
    }, []);

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
        setJsonContent(JSON.stringify(template, null, 2));
        setSelectedPresetId(null);
        setError(null);
        setSuccessMsg("Draft created. Click Save to persist.");
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-[#1a1a2e] w-[92vw] max-w-6xl h-[88vh] rounded-2xl shadow-2xl flex overflow-hidden border border-gray-200/50 dark:border-[#2d2d3b]/50 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

                {/* Sidebar */}
                <div className="w-72 bg-gray-50/80 dark:bg-[#16162a] border-r border-gray-200 dark:border-[#2d2d3b] flex flex-col backdrop-blur-sm">
                    <div className="p-5 border-b border-gray-200 dark:border-[#2d2d3b]">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="size-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <span className="material-symbols-outlined text-white text-lg">tune</span>
                            </div>
                            <h2 className="font-bold text-xl text-gray-800 dark:text-gray-100">Presets</h2>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleImport}
                                className="flex-1 group bg-white dark:bg-[#252540] border border-gray-200 dark:border-[#3d3d5a] text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-xl text-sm font-medium hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md"
                            >
                                <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">upload</span>
                                Import
                            </button>
                            <button
                                onClick={handleCreateNew}
                                className="flex-1 group bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-2.5 rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                            >
                                <span className="material-symbols-outlined text-base group-hover:rotate-90 transition-transform duration-300">add</span>
                                New
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                        {isLoadingPresets ? (
                            // Skeleton loader
                            <div className="space-y-2 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-xl p-3 bg-gray-200 dark:bg-[#252540]">
                                        <div className="h-4 bg-gray-300 dark:bg-[#3d3d5a] rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-gray-300 dark:bg-[#3d3d5a] rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            presets.map((preset, index) => (
                                <button
                                    key={preset.id}
                                    onClick={() => setSelectedPresetId(preset.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 group ${selectedPresetId === preset.id
                                        ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 scale-[1.02]'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-[#252540] hover:text-gray-900 dark:hover:text-white hover:shadow-md'
                                        }`}
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        animation: 'fadeInUp 0.3s ease-out forwards'
                                    }}
                                >
                                    <div className="font-semibold truncate flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-base ${selectedPresetId === preset.id ? 'text-white/80' : 'text-gray-400'}`}>
                                            settings_suggest
                                        </span>
                                        {preset.name}
                                    </div>
                                    <div className={`text-xs truncate mt-0.5 pl-6 ${selectedPresetId === preset.id ? 'text-white/70' : 'opacity-60'}`}>
                                        {preset.description || 'No description'}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-[#121225]">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2d2d3b] flex items-center justify-between bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-sm">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-violet-500">code</span>
                                {selectedPresetId ? (
                                    <span className="truncate">
                                        {presets.find(p => p.id === selectedPresetId)?.name || selectedPresetId}
                                    </span>
                                ) : (
                                    <span className="text-emerald-500">New Preset</span>
                                )}
                            </h3>
                            <div className="h-5 mt-0.5">
                                {error ? (
                                    <p className="text-red-500 text-sm flex items-center gap-1.5 animate-in slide-in-from-left duration-200">
                                        <span className="material-symbols-outlined text-sm">error</span>
                                        {error}
                                    </p>
                                ) : successMsg ? (
                                    <p className="text-emerald-500 text-sm flex items-center gap-1.5 animate-in slide-in-from-left duration-200">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        {successMsg}
                                    </p>
                                ) : (
                                    <p className="text-gray-400 text-sm">
                                        Edit the JSON configuration • ID and Name are required
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 ml-4">
                            <button
                                onClick={handleSave}
                                disabled={!!error && !jsonContent}
                                className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 ${!!error
                                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-100'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">save</span>
                                Save
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 bg-gray-100 dark:bg-[#252540] text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-[#323255] transition-all duration-200 hover:scale-105 active:scale-100"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        {/* Loading overlay */}
                        {isLoadingContent && (
                            <div className="absolute inset-0 bg-gray-50/80 dark:bg-[#121225]/80 backdrop-blur-sm z-10 flex items-center justify-center animate-in fade-in duration-150">
                                <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-[#1a1a2e] rounded-xl shadow-xl border border-gray-200 dark:border-[#2d2d3b]">
                                    <span className="material-symbols-outlined text-xl text-violet-500 animate-spin">progress_activity</span>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading preset...</span>
                                </div>
                            </div>
                        )}

                        {/* Editor with syntax highlighting */}
                        <div className={`absolute inset-0 transition-opacity duration-200 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="h-full overflow-auto custom-scrollbar bg-[#1e1e2e] dark:bg-[#0d0d1a]">
                                <Editor
                                    value={jsonContent || cachedContent}
                                    onValueChange={handleJsonChange}
                                    highlight={code => highlight(code || '', languages.json, 'json')}
                                    padding={24}
                                    style={{
                                        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
                                        fontSize: 14,
                                        lineHeight: 1.6,
                                        minHeight: '100%',
                                        backgroundColor: 'transparent',
                                    }}
                                    className="min-h-full text-gray-200"
                                    textareaClassName="focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom keyframes for animations */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
