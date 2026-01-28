import type { BodyMeasurement, ProgressMedia } from '@/lib/types';

describe('Body Composition Types', () => {
    it('BodyMeasurement type has all expected fields', () => {
        const measurement: BodyMeasurement = {
            id: 'test-id',
            user_id: 'user-id',
            date: '2026-01-27',
            weight_kg: 80.5,
            body_fat_percentage: 15.2,
            neck_cm: 38,
            shoulders_cm: 120,
            chest_cm: 100,
            left_bicep_cm: 35,
            right_bicep_cm: 35.5,
            waist_cm: 82,
            hips_cm: 95,
            left_thigh_cm: 58,
            right_thigh_cm: 58.5,
            left_calf_cm: 37,
            right_calf_cm: 37.5,
            notes: 'Post-workout measurement',
        };

        expect(measurement.id).toBe('test-id');
        expect(measurement.user_id).toBe('user-id');
        expect(measurement.date).toBe('2026-01-27');
        expect(measurement.weight_kg).toBe(80.5);
        expect(measurement.body_fat_percentage).toBe(15.2);
        expect(measurement.neck_cm).toBe(38);
        expect(measurement.shoulders_cm).toBe(120);
        expect(measurement.chest_cm).toBe(100);
        expect(measurement.left_bicep_cm).toBe(35);
        expect(measurement.right_bicep_cm).toBe(35.5);
        expect(measurement.waist_cm).toBe(82);
        expect(measurement.hips_cm).toBe(95);
        expect(measurement.left_thigh_cm).toBe(58);
        expect(measurement.right_thigh_cm).toBe(58.5);
        expect(measurement.left_calf_cm).toBe(37);
        expect(measurement.right_calf_cm).toBe(37.5);
        expect(measurement.notes).toBe('Post-workout measurement');
    });

    it('BodyMeasurement allows partial fields (only required are id, user_id, date)', () => {
        const measurement: BodyMeasurement = {
            id: 'test-id',
            user_id: 'user-id',
            date: '2026-01-27',
        };

        expect(measurement.id).toBeDefined();
        expect(measurement.weight_kg).toBeUndefined();
        expect(measurement.waist_cm).toBeUndefined();
    });

    it('ProgressMedia supports image and video types', () => {
        const photo: ProgressMedia = {
            id: 'media-1',
            user_id: 'user-id',
            media_type: 'image',
            storage_path: 'user-id/photo.jpg',
            visibility: 'private',
        };

        const video: ProgressMedia = {
            id: 'media-2',
            user_id: 'user-id',
            media_type: 'video',
            storage_path: 'user-id/clip.mp4',
            caption: 'Flexing after leg day',
            taken_at: '2026-01-27T10:00:00Z',
            visibility: 'followers',
        };

        expect(photo.media_type).toBe('image');
        expect(video.media_type).toBe('video');
        expect(video.caption).toBe('Flexing after leg day');
        expect(photo.visibility).toBe('private');
        expect(video.visibility).toBe('followers');
    });

    it('ProgressMedia visibility options are restricted', () => {
        const visibilities: ProgressMedia['visibility'][] = ['public', 'followers', 'private'];
        expect(visibilities).toHaveLength(3);
        expect(visibilities).toContain('public');
        expect(visibilities).toContain('followers');
        expect(visibilities).toContain('private');
    });
});
