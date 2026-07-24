'use client';

import Image from 'next/image';
import LoginForm from '@/components/LoginForm';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';

export default function LoginPage() {
    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#15151F] p-4">
            {/* Ambient brand glow */}
            <div className="glow-orb -top-[15%] left-[15%] h-[45vw] w-[45vw]" />
            <div className="glow-orb glow-orb--pink -bottom-[15%] right-[10%] h-[35vw] w-[35vw]" />

            <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="relative z-[1] mb-8 text-center"
            >
                <div className="mb-4 flex justify-center">
                    <Image
                        src="/logo_transparent.png"
                        alt="SHaiPT logo"
                        width={88}
                        height={88}
                        priority
                        className="drop-shadow-[0_0_24px_var(--brand-glow)]"
                    />
                </div>
                <h1 className="font-display mb-2 text-5xl font-extrabold tracking-tight text-white md:text-6xl">
                    SH<span className="text-brand [text-shadow:0_0_20px_var(--brand-glow)]">ai</span>PT
                </h1>
                <p className="text-base text-ink-mid md:text-lg">
                    AI-Powered Personal Training
                </p>
            </motion.div>

            <div className="relative z-[1] flex w-full justify-center">
                <LoginForm />
            </div>
        </main>
    );
}
