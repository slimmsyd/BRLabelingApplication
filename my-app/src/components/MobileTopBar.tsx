'use client';

import React from 'react';
import { Menu } from 'lucide-react';

/**
 * MobileTopBar — sticky top bar shown only below the `lg` breakpoint.
 * Holds the hamburger that opens the Sidebar drawer, plus the brand.
 * On desktop the real Sidebar is always visible, so this is `lg:hidden`.
 */
const MobileTopBar = ({ onMenu }: { onMenu: () => void }) => {
    return (
        <div className="lg:hidden sticky top-0 z-30 -mx-4 -mt-4 mb-2 px-4 h-14 flex items-center gap-3 bg-background/90 backdrop-blur-md border-b border-border w-[calc(100%+2rem)]">
            <button
                onClick={onMenu}
                aria-label="Open menu"
                className="w-10 h-10 -ml-1 flex items-center justify-center rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
            >
                <Menu size={22} />
            </button>
            <span className="text-sm font-semibold tracking-wider uppercase text-foreground-tertiary">
                Box RAW Labs
            </span>
        </div>
    );
};

export default MobileTopBar;
