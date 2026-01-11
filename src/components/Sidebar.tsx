import React, { useState, useRef, useEffect } from 'react';
import { ExamTableStatus } from '../global.d';

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    darkMode: boolean;
    onToggleDarkMode: () => void;
    onAddQuestion: () => void;
    onHomeClick: () => void;
    appMode: 'landing' | 'test-generation' | 'database-cleaning';
    // Database connection
    dbConnected: boolean;
    dbPath: string | null;
    examTablesStatus: ExamTableStatus[];
    chaptersConnected: boolean;
    chaptersPath: string | null;
    onDatabaseSelect: () => void;
    onChaptersSelect: () => void;
    // Save status
    currentProjectId: string | null;
    saveStatus: 'saved' | 'saving' | 'unsaved';
}

const Sidebar: React.FC<SidebarProps> = ({
    isCollapsed,
    onToggle,
    darkMode,
    onToggleDarkMode,
    onAddQuestion,
    onHomeClick,
    appMode,
    dbConnected,
    dbPath,
    examTablesStatus,
    chaptersConnected,
    chaptersPath,
    onDatabaseSelect,
    onChaptersSelect,
    currentProjectId,
    saveStatus,
}) => {
    const [showConnectionsDropdown, setShowConnectionsDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowConnectionsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getFileName = (path: string | null): string => {
        if (!path) return 'Unknown';
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1];
    };

    const saveStatusConfig = {
        saved: { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-500/10' },
        saving: { icon: 'sync', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        unsaved: { icon: 'pending', color: 'text-red-500', bg: 'bg-red-500/10' },
    };

    return (
        <aside
            className={`
        relative flex flex-col h-full z-40
        bg-white/80 dark:bg-[#1a1a2e]/90
        backdrop-blur-xl
        border-r border-gray-200/50 dark:border-[#2d2d3b]/50
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-56'}
      `}
        >
            {/* Sidebar Header with Logo */}
            <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-200/50 dark:border-[#2d2d3b]/50 ${isCollapsed ? 'justify-center' : ''}`}>
                <img
                    src="https://drive.google.com/thumbnail?id=1yLtX3YxubbDBsKYDj82qiaGbSkSX7aLv&sz=w1000"
                    alt="Logo"
                    className="h-8 w-8 cursor-pointer hover:scale-105 transition-transform"
                    onClick={onHomeClick}
                    title="Go to Dashboard"
                />
                {!isCollapsed && (
                    <span className="font-bold text-gray-900 dark:text-white text-sm whitespace-nowrap overflow-hidden">
                        Test Gen
                    </span>
                )}
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col gap-1 p-2">
                {/* Home */}
                {appMode !== 'landing' && (
                    <SidebarItem
                        icon="home"
                        label="Home"
                        onClick={onHomeClick}
                        isCollapsed={isCollapsed}
                        tooltip="Go Home"
                    />
                )}

                {/* Add Question */}
                <SidebarItem
                    icon="add_circle"
                    label="Add Question"
                    onClick={onAddQuestion}
                    isCollapsed={isCollapsed}
                    tooltip="Add New Question"
                />

                {/* Divider */}
                <div className="my-2 border-t border-gray-200/50 dark:border-[#2d2d3b]/50" />

                {/* Connections */}
                <div className="relative" ref={dropdownRef}>
                    <SidebarItem
                        icon="database"
                        label="Connections"
                        onClick={() => setShowConnectionsDropdown(!showConnectionsDropdown)}
                        isCollapsed={isCollapsed}
                        tooltip="Database & Chapters"
                        badge={dbConnected && chaptersConnected ? 'check' : 'warning'}
                        badgeColor={dbConnected && chaptersConnected ? 'text-green-500' : 'text-yellow-500'}
                    />

                    {/* Connections Dropdown */}
                    {showConnectionsDropdown && (
                        <div
                            className={`
                absolute z-50 mt-1 bg-white dark:bg-[#1e1e2d] 
                border border-gray-200 dark:border-[#2d2d3b] 
                rounded-xl shadow-xl animate-fade-in
                ${isCollapsed ? 'left-full ml-2 top-0' : 'left-0 w-full'}
                ${isCollapsed ? 'w-72' : 'w-full'}
              `}
                        >
                            <div className="p-3 font-semibold border-b border-gray-200 dark:border-[#2d2d3b] text-gray-900 dark:text-white text-sm">
                                Connections
                            </div>

                            {/* Database */}
                            <div className="p-3 border-b border-gray-200/50 dark:border-[#2d2d3b]/50">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-500">Database</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${dbConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {dbConnected ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-700 dark:text-gray-300 truncate mb-1" title={dbPath || ''}>
                                    {dbPath ? getFileName(dbPath) : 'No database'}
                                </div>
                                <button
                                    onClick={() => { setShowConnectionsDropdown(false); onDatabaseSelect(); }}
                                    className="text-xs text-primary hover:underline"
                                >
                                    {dbConnected ? 'Change' : 'Select'}
                                </button>
                            </div>

                            {/* Exam Tables Status */}
                            {dbConnected && examTablesStatus.length > 0 && (
                                <div className="p-3 border-b border-gray-200/50 dark:border-[#2d2d3b]/50">
                                    <div className="text-xs font-medium text-gray-500 mb-2">Exam Tables</div>
                                    <div className="space-y-1.5">
                                        {examTablesStatus.map(status => (
                                            <div key={status.exam} className="flex items-center justify-between text-xs">
                                                <span className="text-gray-700 dark:text-gray-300 font-medium">{status.exam}</span>
                                                <div className="flex items-center gap-1">
                                                    {status.isComplete ? (
                                                        <>
                                                            <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                                                            <span className="text-[10px] text-green-600 dark:text-green-400">Ready</span>
                                                        </>
                                                    ) : status.hasQuestionsTable || status.hasSolutionsTable ? (
                                                        <>
                                                            <span className="material-symbols-outlined text-sm text-yellow-500">warning</span>
                                                            <span className="text-[10px] text-yellow-600 dark:text-yellow-400">
                                                                {status.hasQuestionsTable ? 'No solutions' : 'No questions'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-sm text-red-500">cancel</span>
                                                            <span className="text-[10px] text-red-600 dark:text-red-400">Not found</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Chapters */}
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-500">Chapters</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${chaptersConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {chaptersConnected ? 'Loaded' : 'Not Loaded'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-700 dark:text-gray-300 truncate mb-1" title={chaptersPath || ''}>
                                    {chaptersPath ? getFileName(chaptersPath) : 'No file'}
                                </div>
                                <button
                                    onClick={() => { setShowConnectionsDropdown(false); onChaptersSelect(); }}
                                    className="text-xs text-primary hover:underline"
                                >
                                    {chaptersConnected ? 'Change' : 'Select'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Save Status (only when project is open) */}
                {currentProjectId && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${saveStatusConfig[saveStatus].bg} ${isCollapsed ? 'justify-center' : ''}`}>
                        <span className={`material-symbols-outlined text-lg ${saveStatusConfig[saveStatus].color} ${saveStatus === 'saving' ? 'animate-spin' : ''}`}>
                            {saveStatusConfig[saveStatus].icon}
                        </span>
                        {!isCollapsed && (
                            <span className={`text-xs font-medium ${saveStatusConfig[saveStatus].color}`}>
                                {saveStatus.charAt(0).toUpperCase() + saveStatus.slice(1)}
                            </span>
                        )}
                    </div>
                )}
            </nav>

            {/* Bottom Section */}
            <div className="flex flex-col gap-1 p-2 border-t border-gray-200/50 dark:border-[#2d2d3b]/50">
                {/* Theme Toggle */}
                <SidebarItem
                    icon={darkMode ? 'light_mode' : 'dark_mode'}
                    label={darkMode ? 'Light Mode' : 'Dark Mode'}
                    onClick={onToggleDarkMode}
                    isCollapsed={isCollapsed}
                    tooltip={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                />

                {/* Collapse Toggle */}
                <button
                    onClick={onToggle}
                    className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-gray-600 dark:text-gray-400
            hover:bg-gray-100 dark:hover:bg-[#252535]
            transition-all duration-200
            ${isCollapsed ? 'justify-center' : ''}
          `}
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                        chevron_left
                    </span>
                    {!isCollapsed && (
                        <span className="text-sm font-medium">Collapse</span>
                    )}
                </button>
            </div>
        </aside>
    );
};

// Reusable sidebar item component
interface SidebarItemProps {
    icon: string;
    label: string;
    onClick: () => void;
    isCollapsed: boolean;
    tooltip?: string;
    isActive?: boolean;
    badge?: string;
    badgeColor?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
    icon,
    label,
    onClick,
    isCollapsed,
    tooltip,
    isActive = false,
    badge,
    badgeColor = 'text-gray-400',
}) => {
    return (
        <button
            onClick={onClick}
            className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-lg w-full
        text-gray-700 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-[#252535]
        hover:text-primary dark:hover:text-primary
        transition-all duration-200
        ${isActive ? 'bg-primary/10 text-primary' : ''}
        ${isCollapsed ? 'justify-center' : ''}
      `}
            title={isCollapsed ? tooltip || label : undefined}
        >
            <span className="material-symbols-outlined text-xl relative">
                {icon}
                {badge && isCollapsed && (
                    <span className={`absolute -top-1 -right-1 material-symbols-outlined text-xs ${badgeColor}`}>
                        {badge}
                    </span>
                )}
            </span>

            {!isCollapsed && (
                <>
                    <span className="text-sm font-medium flex-1 text-left">{label}</span>
                    {badge && (
                        <span className={`material-symbols-outlined text-sm ${badgeColor}`}>
                            {badge}
                        </span>
                    )}
                </>
            )}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div className="
          absolute left-full ml-2 px-2 py-1 
          bg-gray-900 dark:bg-gray-700 text-white text-xs rounded 
          opacity-0 group-hover:opacity-100 
          pointer-events-none transition-opacity duration-200
          whitespace-nowrap z-50
        ">
                    {tooltip || label}
                </div>
            )}
        </button>
    );
};

export default Sidebar;
