'use client';

import { useState, useRef, useCallback } from 'react';
import { Box, Text, Flex, VStack } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { fadeInUp } from '@/lib/animations';

const MotionBox = motion.create(Box);

interface PhotoFile {
    file: File;
    preview: string;
    label: string;
}

interface IntakePhotoUploadProps {
    onPhotosSubmitted: (files: File[]) => void;
    onSkip: () => void;
    isUploading: boolean;
}

const PHOTO_VIEWS = [
    { key: 'front', label: 'Front View' },
    { key: 'back', label: 'Back View' },
    { key: 'side', label: 'Side View' },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export default function IntakePhotoUpload({
    onPhotosSubmitted,
    onSkip,
    isUploading,
}: IntakePhotoUploadProps) {
    const [photos, setPhotos] = useState<PhotoFile[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        setError(null);

        const newPhotos: PhotoFile[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!ACCEPTED_TYPES.includes(file.type)) {
                setError('Please upload image files only (JPEG, PNG, WebP)');
                continue;
            }

            if (file.size > MAX_FILE_SIZE) {
                setError('Each photo must be under 10MB');
                continue;
            }

            // Assign label based on existing photos count
            const totalCount = photos.length + newPhotos.length;
            const viewIndex = Math.min(totalCount, PHOTO_VIEWS.length - 1);
            const label = totalCount < PHOTO_VIEWS.length
                ? PHOTO_VIEWS[viewIndex].label
                : `Photo ${totalCount + 1}`;

            newPhotos.push({
                file,
                preview: URL.createObjectURL(file),
                label,
            });
        }

        if (newPhotos.length > 0) {
            setPhotos(prev => [...prev, ...newPhotos]);
        }

        // Reset input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [photos.length]);

    const removePhoto = useCallback((index: number) => {
        setPhotos(prev => {
            const removed = prev[index];
            URL.revokeObjectURL(removed.preview);
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    const handleSubmit = useCallback(() => {
        if (photos.length === 0) return;
        onPhotosSubmitted(photos.map(p => p.file));
    }, [photos, onPhotosSubmitted]);

    return (
        <MotionBox
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            mx="0.5rem"
            mb="0.75rem"
        >
            <Box
                p="1rem"
                borderRadius="12px"
                bg="rgba(255, 102, 0, 0.05)"
                border="1px solid rgba(255, 102, 0, 0.15)"
            >
                {/* Header */}
                <Flex alignItems="center" gap="0.5rem" mb="0.75rem">
                    <Camera size={18} color="#FF6600" />
                    <Text
                        fontSize="0.85rem"
                        fontWeight="600"
                        color="var(--foreground)"
                    >
                        Physique Photos
                    </Text>
                </Flex>

                <Text fontSize="0.8rem" color="#aaa" mb="1rem" lineHeight="1.5">
                    Upload front, back, and side photos. For best results, wear minimal
                    clothing and stand with arms out in a T-shape. Photos are private
                    and only used for your training assessment.
                </Text>

                {/* Photo Previews */}
                <AnimatePresence mode="popLayout">
                    {photos.length > 0 && (
                        <Flex gap="0.5rem" mb="0.75rem" flexWrap="wrap">
                            {photos.map((photo, idx) => (
                                <MotionBox
                                    key={photo.preview}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    position="relative"
                                    w="80px"
                                    h="80px"
                                    borderRadius="8px"
                                    overflow="hidden"
                                    border="1px solid rgba(255, 102, 0, 0.3)"
                                    flexShrink={0}
                                >
                                    <img
                                        src={photo.preview}
                                        alt={photo.label}
                                        data-testid={`photo-preview-${idx}`}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    {/* Label */}
                                    <Box
                                        position="absolute"
                                        bottom="0"
                                        left="0"
                                        right="0"
                                        bg="rgba(0, 0, 0, 0.7)"
                                        px="0.25rem"
                                        py="0.1rem"
                                    >
                                        <Text fontSize="0.55rem" color="#fff" textAlign="center">
                                            {photo.label}
                                        </Text>
                                    </Box>
                                    {/* Remove button */}
                                    <button
                                        onClick={() => removePhoto(idx)}
                                        data-testid={`remove-photo-${idx}`}
                                        style={{
                                            position: 'absolute',
                                            top: '2px',
                                            right: '2px',
                                            background: 'rgba(0, 0, 0, 0.6)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#fff',
                                            padding: 0,
                                        }}
                                    >
                                        <X size={12} />
                                    </button>
                                </MotionBox>
                            ))}
                        </Flex>
                    )}
                </AnimatePresence>

                {/* Error message */}
                {error && (
                    <Text fontSize="0.75rem" color="#FF4444" mb="0.5rem">
                        {error}
                    </Text>
                )}

                {/* Upload area */}
                <VStack gap="0.5rem">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        multiple
                        onChange={handleFileSelect}
                        data-testid="photo-file-input"
                        style={{ display: 'none' }}
                    />

                    {photos.length < 6 && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            data-testid="add-photos-btn"
                            style={{
                                width: '100%',
                                padding: '0.65rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px dashed rgba(255, 102, 0, 0.3)',
                                borderRadius: '8px',
                                color: 'var(--neon-orange)',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                opacity: isUploading ? 0.5 : 1,
                            }}
                        >
                            {photos.length === 0 ? (
                                <>
                                    <Upload size={16} />
                                    Select Photos
                                </>
                            ) : (
                                <>
                                    <ImageIcon size={16} />
                                    Add More Photos ({photos.length}/6)
                                </>
                            )}
                        </button>
                    )}

                    {/* Action buttons */}
                    <Flex gap="0.5rem" w="100%">
                        <button
                            onClick={onSkip}
                            disabled={isUploading}
                            data-testid="skip-photos-btn"
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#888',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                opacity: isUploading ? 0.5 : 1,
                            }}
                        >
                            Skip for Now
                        </button>

                        {photos.length > 0 && (
                            <button
                                onClick={handleSubmit}
                                disabled={isUploading}
                                data-testid="submit-photos-btn"
                                style={{
                                    flex: 1,
                                    padding: '0.6rem',
                                    background: isUploading ? 'rgba(255, 102, 0, 0.3)' : '#FF6600',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#0B0B15',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: isUploading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.3rem',
                                }}
                            >
                                {isUploading ? (
                                    'Uploading...'
                                ) : (
                                    <>
                                        <Check size={16} />
                                        Submit {photos.length} Photo{photos.length > 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        )}
                    </Flex>
                </VStack>
            </Box>
        </MotionBox>
    );
}
