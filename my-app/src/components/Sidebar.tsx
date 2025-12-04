import React from 'react';
import { Settings, Search, ChevronDown, Video, Box } from 'lucide-react';

const Sidebar = () => {
    return (
        <aside className="w-64 h-screen bg-sidebar-bg border-r border-border flex flex-col fixed left-0 top-0 z-50">
            {/* Header / Logo Area */}
            <div className="h-16 flex items-center px-4 gap-3">
                <button className="p-2 hover:bg-white/5 rounded-md transition-colors text-foreground-secondary hover:text-foreground">
                    <div className="space-y-1">
                        <div className="w-4 h-0.5 bg-current"></div>
                        <div className="w-4 h-0.5 bg-current"></div>
                        <div className="w-4 h-0.5 bg-current"></div>
                    </div>
                </button>

                <div className="flex-1 relative">
                    <div className="flex items-center gap-2 bg-surface hover:bg-surface-hover transition-colors px-3 py-1.5 rounded-full border border-border cursor-pointer group">
                        <Search size={14} className="text-foreground-secondary group-hover:text-foreground transition-colors" />
                        <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">Search projects...</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">

                {/* Assigned to You */}
                <div className="space-y-2">
                    <div className="px-2 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">
                        Assigned to You
                    </div>
                    <div className="space-y-0.5">
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-white/5 transition-colors bg-white/5">
                            <Video size={16} className="text-accent-primary" />
                            <span>Crawford vs. Canelo</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors">
                            <Video size={16} />
                            <span>Joshua vs. Ngannou</span>
                        </button>
                    </div>
                </div>

                {/* Pending */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 group cursor-pointer">
                        <div className="flex items-center gap-2 text-foreground-secondary group-hover:text-foreground transition-colors">
                            <ChevronDown size={16} />
                            <span className="text-sm font-medium">Pending</span>
                        </div>
                    </div>
                    <div className="space-y-0.5 pl-2">
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors">
                            <Box size={16} />
                            <span>Canelo vs. Munguia</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors">
                            <Box size={16} />
                            <span>Tank vs. Martin</span>
                        </button>
                    </div>
                </div>

                {/* Completed */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 group cursor-pointer">
                        <div className="flex items-center gap-2 text-foreground-secondary group-hover:text-foreground transition-colors">
                            <ChevronDown size={16} className="-rotate-90" />
                            <span className="text-sm font-medium">Completed</span>
                        </div>
                    </div>
                </div>

            </nav>

            {/* Footer Settings */}
            <div className="p-4 space-y-1 border-t border-transparent">
                <button className="w-full flex items-center justify-between px-2 py-2 text-xs text-foreground-secondary hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
                    <span>Settings</span>
                    <Settings size={14} />
                </button>

                <div className="pt-4 mt-2 border-t border-border/40">
                    <div className="w-full flex items-center justify-center px-2 py-1 text-xs text-foreground-tertiary font-medium tracking-wider uppercase">
                        Box RAW Labs
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
