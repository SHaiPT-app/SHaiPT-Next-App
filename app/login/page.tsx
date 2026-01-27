'use client';

import LoginForm from '@/components/LoginForm';
import { Box, Heading, Text } from '@chakra-ui/react';
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
        >
            <MotionBox
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                mb="2rem"
                textAlign="center"
            >
                <Heading
                    as="h1"
                    fontSize={{ base: '3rem', md: '4rem' }}
                    fontWeight="800"
                    color="#F25F29"
                    textShadow="0 0 20px rgba(242, 95, 41, 0.5)"
                    mb="0.5rem"
                    fontFamily="var(--font-orbitron)"
                >
                    SHaiPT
                </Heading>
                <Text color="gray.500" fontSize={{ base: '1rem', md: '1.2rem' }}>
                    AI-Powered Personal Training
                </Text>
            </MotionBox>

            <LoginForm />
        </Box>
    );
}
