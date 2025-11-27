import { cleanExercisesData } from '@/lib/utils';
import { PlanExercise } from '@/lib/types';

describe('cleanExercisesData', () => {
    it('cleans exercise data correctly', () => {
        const input: PlanExercise[] = [
            {
                id: '1',
                name: 'Bench Press',
                exercise_id: 'ex-1',
                gif_url: 'http://example.com/gif',
                notes: 'Some notes',
                sets: [
                    { targetReps: '10', targetWeight: '100', actualReps: '10', actualWeight: '100', pr: true }
                ]
            }
        ];

        const output = cleanExercisesData(input);

        expect(output).toHaveLength(1);
        expect(output[0]).toEqual({
            id: '1',
            name: 'Bench Press',
            exercise_id: 'ex-1',
            gif_url: 'http://example.com/gif',
            notes: 'Some notes',
            sets: [
                { targetReps: '10', targetWeight: '100', actualReps: '10', actualWeight: '100', pr: true }
            ]
        });
    });

    it('removes undefined values', () => {
        const input: PlanExercise[] = [
            {
                id: '2',
                name: 'Squat',
                sets: [{ targetReps: '5', targetWeight: '' }]
            }
        ];

        const output = cleanExercisesData(input);

        expect(output[0]).not.toHaveProperty('exercise_id');
        expect(output[0]).not.toHaveProperty('gif_url');
        expect(output[0]).not.toHaveProperty('notes');
        expect(output[0].sets[0]).not.toHaveProperty('actualReps');
    });

    it('handles empty input', () => {
        const output = cleanExercisesData([]);
        expect(output).toEqual([]);
    });
});
