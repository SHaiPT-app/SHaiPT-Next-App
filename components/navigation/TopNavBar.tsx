'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Home,
    Dumbbell,
    BarChart3,
    User,
    Bell,
    Menu,
    Play,
} from 'lucide-react';
import { useState } from 'react';
import { useWorkoutStore } from '@/stores/workoutStore';

interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
}

const navItems: NavItem[] = [
    { id: 'home', label: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell, href: '/workouts' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
];

interface TopNavBarProps {
    userName?: string;
    avatarUrl?: string;
    notificationCount?: number;
}

export function TopNavBar({ userName, avatarUrl, notificationCount = 0 }: TopNavBarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { workout } = useWorkoutStore();

    const isActive = (item: NavItem) => {
        if (item.href === '/dashboard') {
            return pathname === '/dashboard' || pathname === '/';
        }
        return pathname.startsWith(item.href);
    };

    return (
        <header className="hidden md:block fixed top-0 left-0 right-0 z-50">
            <div className="bg-gray-900/90 backdrop-blur-lg border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="flex items-center gap-2"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                                    <Dumbbell className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                    SHaiPT
                                </span>
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item);

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => router.push(item.href)}
                                        className={`
                                            relative px-4 py-2 rounded-lg flex items-center gap-2
                                            transition-colors
                                            ${active
                                                ? 'text-cyan-400'
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm font-medium">{item.label}</span>
                                        {active && (
                                            <motion.div
                                                layoutId="activeNavItem"
                                                className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 rounded-full"
                                                initial={false}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* CTA Button + Actions */}
                        <div className="flex items-center gap-4">
                            {/* Start Workout CTA */}
                            {workout.isActive ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push(`/workout/${workout.sessionId}`)}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500
                                             text-white font-medium flex items-center gap-2 shadow-lg shadow-green-500/20"
                                >
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    Continue Workout
                                </motion.button>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/workout/start')}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500
                                             text-white font-medium flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                                >
                                    <Play className="w-4 h-4" />
                                    Start Workout
                                </motion.button>
                            )}

                            {/* Notifications */}
                            <button
                                onClick={() => router.push('/notifications')}
                                className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                            >
                                <Bell className="w-5 h-5" />
                                {notificationCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full
                                                   text-xs text-white flex items-center justify-center">
                                        {notificationCount > 9 ? '9+' : notificationCount}
                                    </span>
                                )}
                            </button>

                            {/* Profile Avatar */}
                            <button
                                onClick={() => router.push('/profile')}
                                className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-700 hover:border-cyan-500 transition-colors"
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={userName || 'Profile'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                                        <span className="text-sm font-bold text-white">
                                            {userName?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active workout banner - shows when on other pages */}
            {workout.isActive && !pathname.startsWith('/workout/') && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/20"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                        <button
                            onClick={() => router.push(`/workout/${workout.sessionId}`)}
                            className="w-full flex items-center justify-between text-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-green-400 font-medium">
                                    Workout in progress: {workout.sessionName}
                                </span>
                            </div>
                            <span className="text-green-400/80 text-xs">Click to continue</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </header>
    );
}

export default TopNavBar;
