'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { fadeInUp } from '@/lib/animations';

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
        <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="mx-2 mb-3"
        >
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                {/* Header */}
                <div className="mb-3 flex items-center gap-2">
                    <Camera size={18} className="text-brand" />
                    <span className="text-sm font-semibold text-ink-hi">
                        Physique Photos
                    </span>
                </div>

                <p className="mb-4 text-[0.8rem] leading-normal text-ink-mid">
                    Upload front, back, and side photos. For best results, wear minimal
                    clothing and stand with arms out in a T-shape. Photos are private
                    and only used for your training assessment.
                </p>

                {/* Photo Previews */}
                <AnimatePresence mode="popLayout">
                    {photos.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                            {photos.map((photo, idx) => (
                                <motion.div
                                    key={photo.preview}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-brand/30"
                                >
                                    <img
                                        src={photo.preview}
                                        alt={photo.label}
                                        data-testid={`photo-preview-${idx}`}
                                        className="h-full w-full object-cover"
                                    />
                                    {/* Label */}
                                    <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-[0.1rem]">
                                        <span className="block text-center text-[0.55rem] text-white">
                                            {photo.label}
                                        </span>
                                    </div>
                                    {/* Remove button */}
                                    <button
                                        onClick={() => removePhoto(idx)}
                                        data-testid={`remove-photo-${idx}`}
                                        className="absolute right-0.5 top-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-black/60 p-0 text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>

                {/* Error message */}
                {error && (
                    <p className="mb-2 text-xs text-destructive">
                        {error}
                    </p>
                )}

                {/* Upload area */}
                <div className="flex flex-col items-stretch gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        multiple
                        onChange={handleFileSelect}
                        data-testid="photo-file-input"
                        className="hidden"
                    />

                    {photos.length < 6 && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            data-testid="add-photos-btn"
                            className="flex w-full cursor-pointer items-center justify-center gap-[0.4rem] rounded-lg border border-dashed border-brand/30 bg-[var(--surface-1)] px-3 py-[0.65rem] text-[0.8rem] font-medium text-brand transition-colors hover:border-brand/50 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div className="flex w-full gap-2">
                        <button
                            onClick={onSkip}
                            disabled={isUploading}
                            data-testid="skip-photos-btn"
                            className="btn-outline flex-1 !px-4 !py-2.5 !text-[0.8rem] disabled:!cursor-not-allowed disabled:opacity-50"
                        >
                            Skip for Now
                        </button>

                        {photos.length > 0 && (
                            <button
                                onClick={handleSubmit}
                                disabled={isUploading}
                                data-testid="submit-photos-btn"
                                className="btn-brand flex-1 !px-4 !py-2.5 !text-[0.8rem]"
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
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
