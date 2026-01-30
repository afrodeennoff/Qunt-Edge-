'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    LayoutDashboard,
    ScrollText,
    Settings,
    CreditCard,
    Database,
    LifeBuoy,
    LogOut,
    Users,
    type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/store/user-store';
import { signOut } from '@/server/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { useI18n } from '@/locales/client';

// Types
type MenuItem = {
    label: string;
    icon: LucideIcon;
    href: string;
};

type MenuGroup = {
    title: string;
    items: MenuItem[];
};

import { useSidebarStore } from '@/store/sidebar-store';

export default function Sidebar() {
    const pathname = usePathname();
    const t = useI18n();
    const { isOpen: isSidebarOpen, setOpen: setIsSidebarOpen, toggle } = useSidebarStore();
    const [isMobile, setIsMobile] = useState(false);
    const user = useUserStore((state) => state.supabaseUser);

    // Responsive Check
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) setIsSidebarOpen(false); // Default to closed on mobile
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Menu Groups Data
    const menuGroups: MenuGroup[] = useMemo(() => [
        {
            title: 'Intelligence',
            items: [
                { label: t('landing.navbar.logo.dashboard'), icon: LayoutDashboard, href: '/dashboard' },
                { label: t('dashboard.data'), icon: Database, href: '/dashboard/data' }, // Using Data as Execution Log proxy or similar
                { label: t('dashboard.teams'), icon: Users, href: '/teams/dashboard' },
            ]
        },
        {
            title: 'System',
            items: [
                { label: t('dashboard.settings'), icon: Settings, href: '/dashboard/settings' },
                { label: t('dashboard.billing'), icon: CreditCard, href: '/dashboard/billing' },
                { label: t('dashboard.support'), icon: LifeBuoy, href: '/support' },
            ]
        }
    ], [t]);

    // Framer Motion Variants
    const sidebarVariants = {
        expanded: { width: 260 },
        collapsed: { width: 80 },
        mobileOpen: { x: 0, width: 280, position: 'fixed' as const, zIndex: 50 },
        mobileClosed: { x: '-100%', width: 280, position: 'fixed' as const, zIndex: 50 },
    };

    const getSidebarState = () => {
        if (isMobile) return isSidebarOpen ? 'mobileOpen' : 'mobileClosed';
        return isSidebarOpen ? 'expanded' : 'collapsed';
    };

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isMobile && isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/80 z-40"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={getSidebarState()}
                variants={sidebarVariants}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className={cn(
                    "h-screen bg-background border-r border-border flex flex-col justify-between overflow-hidden",
                    !isMobile && "sticky top-0 left-0 z-30"
                )}
            >
                {/* Rail Toggle (Desktop Only) */}
                {!isMobile && (
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="absolute -right-3 top-8 bg-background border border-border rounded-full p-1 shadow-sm hover:bg-accent transition-colors z-50"
                    >
                        <ChevronRight
                            className={cn(
                                "h-4 w-4 transition-transform duration-300",
                                isSidebarOpen ? "rotate-180" : "rotate-0"
                            )}
                        />
                    </button>
                )}

                {/* Header (Identity) */}
                <div className="p-6 flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    <Logo className="h-8 w-8 shrink-0" />
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex flex-col"
                            >
                                <span className="font-bold text-lg tracking-tight">Qunt Edge</span>
                                <span className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">Terminal v2.1</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 overflow-y-auto px-4 space-y-8 no-scrollbar">
                    {menuGroups.map((group, index) => (
                        <div key={index}>
                            <AnimatePresence>
                                {isSidebarOpen && (
                                    <motion.h3
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2"
                                    >
                                        {group.title}
                                    </motion.h3>
                                )}
                            </AnimatePresence>

                            <ul className="space-y-2">
                                {group.items.map((item, itemIndex) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={itemIndex} className="relative group">
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center h-10 px-3 rounded-lg transition-all duration-200",
                                                    isActive
                                                        ? "bg-gradient-to-r from-primary/10 to-transparent text-primary"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                                    !isSidebarOpen && "justify-center"
                                                )}
                                            >
                                                {/* Active Border Accent */}
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeTab"
                                                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_8px_rgba(20,184,166,0.6)]" // Assuming teal/primary color
                                                    />
                                                )}

                                                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />

                                                <AnimatePresence>
                                                    {isSidebarOpen && (
                                                        <motion.span
                                                            initial={{ opacity: 0, width: 0 }}
                                                            animate={{ opacity: 1, width: 'auto' }}
                                                            exit={{ opacity: 0, width: 0 }}
                                                            className="ml-3 truncate text-sm font-medium"
                                                        >
                                                            {item.label}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>

                                                {/* Collapsed Tooltip */}
                                                {!isSidebarOpen && (
                                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border shadow-md">
                                                        {item.label}
                                                    </div>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-border mt-auto">
                    <div className={cn(
                        "flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent/50 group cursor-pointer",
                        !isSidebarOpen && "justify-center"
                    )}>
                        <div className="relative shrink-0">
                            <Avatar className="h-9 w-9 border border-border">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                    {user?.email?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                        </div>

                        <AnimatePresence>
                            {isSidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="flex flex-col overflow-hidden"
                                >
                                    <span className="text-sm font-semibold truncate">
                                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono truncate">
                                        ID: {user?.id?.slice(0, 8) || 'Unknown'}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Logout Button (Only visible when expanded or via distinct action logic - adhering to design request) */}
                        <AnimatePresence>
                            {isSidebarOpen && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => {
                                        localStorage.removeItem('quntedge_user_data');
                                        signOut();
                                    }}
                                    className="ml-auto p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    title="Logout"
                                >
                                    <LogOut className="h-4 w-4" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
