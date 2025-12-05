import React from 'react';
import { Settings, Search, ChevronDown, Video, Box } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    toggle: () => void;
}

const Sidebar = ({ isOpen, toggle }: SidebarProps) => {
    return (
        <aside
            className={`${isOpen ? 'w-64' : 'w-20'} h-screen bg-sidebar-bg border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out`}
        >
            {/* Header / Logo Area */}
            <div className={`h-16 flex items-center px-4 gap-3 ${!isOpen && 'justify-center'}`}>
                <button
                    onClick={toggle}
                    className="p-2 hover:bg-white/5 rounded-md transition-colors text-foreground-secondary hover:text-foreground"
                >
                    <div className="space-y-1">
                        <div className="w-4 h-0.5 bg-current"></div>
                        <div className="w-4 h-0.5 bg-current"></div>
                        <div className="w-4 h-0.5 bg-current"></div>
                    </div>
                </button>

                <div className={`flex-1 relative transition-opacity duration-200 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2 bg-surface hover:bg-surface-hover transition-colors px-3 py-1.5 rounded-full border border-border cursor-pointer group">
                        <Search size={14} className="text-foreground-secondary group-hover:text-foreground transition-colors" />
                        <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors whitespace-nowrap">Search projects...</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto overflow-x-hidden">

                {/* Assigned to You */}
                <div className="space-y-2">
                    <div className={`px-2 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider transition-opacity duration-200 ${!isOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                        Assigned to You
                    </div>
                    <div className="space-y-0.5">
                        <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-white/5 transition-colors bg-white/5 ${!isOpen && 'justify-center px-0'}`}>
                            <Video size={16} className="text-accent-primary shrink-0" />
                            <span className={`transition-opacity duration-200 whitespace-nowrap ${!isOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Current Project</span>
                        </button>
                    </div>
                </div>

            </nav>

            {/* Footer Settings */}
            <div className="p-4 space-y-1 border-t border-transparent">
                <button className={`w-full flex items-center ${isOpen ? 'justify-between' : 'justify-center'} px-2 py-2 text-xs text-foreground-secondary hover:text-foreground transition-colors rounded-lg hover:bg-white/5`}>
                    <span className={`transition-opacity duration-200 ${!isOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Settings</span>
                    <Settings size={14} className="shrink-0" />
                </button>

                <div className={`pt-4 mt-2 border-t border-border/40 ${!isOpen && 'hidden'}`}>
                    <div className="w-full flex items-center justify-center px-2 py-1 text-xs text-foreground-tertiary font-medium tracking-wider uppercase whitespace-nowrap">
                        Box RAW Labs
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
