'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Home,
    Dumbbell,
    Plus,
    BarChart3,
    User,
} from 'lucide-react';
import { useWorkoutStore } from '@/stores/workoutStore';

interface TabItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    isCenter?: boolean;
}

const tabs: TabItem[] = [
    { id: 'home', label: 'Home', icon: Home, href: '/dashboard' },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell, href: '/workouts' },
    { id: 'start', label: 'Start', icon: Plus, href: '/workout/start', isCenter: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
];

export function BottomTabBar() {
    const pathname = usePathname();
    const router = useRouter();
    const { workout } = useWorkoutStore();

    const isActive = (tab: TabItem) => {
        if (tab.href === '/dashboard') {
            return pathname === '/dashboard' || pathname === '/';
        }
        return pathname.startsWith(tab.href);
    };

    const handleTabClick = (tab: TabItem) => {
        if (tab.isCenter && workout.isActive) {
            // If workout is active, go to current workout
            router.push(`/workout/${workout.sessionId}`);
        } else {
            router.push(tab.href);
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Backdrop blur effect */}
            <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-lg border-t border-gray-800" />

            <div className="relative flex items-end justify-around px-2 pb-safe">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = isActive(tab);

                    if (tab.isCenter) {
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab)}
                                className="relative -mt-6 flex flex-col items-center"
                            >
                                <motion.div
                                    whileTap={{ scale: 0.95 }}
                                    className={`
                                        w-14 h-14 rounded-full flex items-center justify-center
                                        shadow-lg shadow-cyan-500/30
                                        ${workout.isActive
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                            : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                        }
                                    `}
                                >
                                    {workout.isActive ? (
                                        <Dumbbell className="w-6 h-6 text-white" />
                                    ) : (
                                        <Icon className="w-6 h-6 text-white" />
                                    )}
                                </motion.div>
                                <span className="text-xs mt-1 text-gray-400">
                                    {workout.isActive ? 'Continue' : tab.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab)}
                            className="flex flex-col items-center py-3 px-4 min-w-[64px]"
                        >
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                className="relative"
                            >
                                <Icon
                                    className={`w-6 h-6 transition-colors ${
                                        active ? 'text-cyan-400' : 'text-gray-500'
                                    }`}
                                />
                                {active && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </motion.div>
                            <span
                                className={`text-xs mt-1 transition-colors ${
                                    active ? 'text-cyan-400' : 'text-gray-500'
                                }`}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Active workout indicator */}
            {workout.isActive && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-12 left-4 right-4"
                >
                    <button
                        onClick={() => router.push(`/workout/${workout.sessionId}`)}
                        className="w-full py-2 px-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20
                                 border border-green-500/30 rounded-lg flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-sm text-green-400 font-medium">
                                {workout.sessionName}
                            </span>
                        </div>
                        <span className="text-xs text-green-400/80">Tap to continue</span>
                    </button>
                </motion.div>
            )}
        </nav>
    );
}

export default BottomTabBar;
