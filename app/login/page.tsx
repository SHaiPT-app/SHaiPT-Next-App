'use client';

import Image from 'next/image';
import LoginForm from '@/components/LoginForm';
import { Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';

const MotionBox = motion.create(Box);

export default function LoginPage() {
    return (
        <Box
            as="main"
            minH="100vh"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            bg="#15151F"
            p="1rem"
            position="relative"
            overflow="hidden"
        >
            {/* Ambient brand glow */}
            <div className="glow-orb -top-[15%] left-[15%] h-[45vw] w-[45vw]" />
            <div className="glow-orb glow-orb--pink -bottom-[15%] right-[10%] h-[35vw] w-[35vw]" />

            <MotionBox
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                mb="2rem"
                textAlign="center"
                position="relative"
                zIndex={1}
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
            </MotionBox>

            <Box position="relative" zIndex={1} w="100%" display="flex" justifyContent="center">
                <LoginForm />
            </Box>
        </Box>
    );
}
