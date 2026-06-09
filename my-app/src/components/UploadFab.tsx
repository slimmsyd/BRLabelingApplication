'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

/**
 * UploadFab — floating "+" action shown only on mobile (< lg).
 * On desktop the rail "Upload Video" button is already visible, so this is hidden.
 */
const UploadFab = () => {
    return (
        <Link
            href="/upload"
            aria-label="Upload video"
            className="lg:hidden fixed right-5 bottom-6 z-30 w-14 h-14 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-lg shadow-accent-primary/40 border border-white/15 active:scale-95 transition-transform cursor-pointer"
        >
            <Plus size={26} />
        </Link>
    );
};

export default UploadFab;
