/** @jest-environment node */
/**
 * The v1 <-> v2 intake mapping.
 *
 * The interview extracts free text into the v1 shape; the form renders the v2 shape. Everything
 * the coach learns has to survive that translation, and two topics did not: training location and
 * athletic history both matched on substrings in the wrong order, so "Home Gym" was filed as a
 * commercial gym and a 5-10 year athlete as 10+.
 *
 * The round-trip cases are the ones that matter most — intakeV2toV1 writes labels that
 * intakeV1toV2 has to be able to read back.
 */
import { intakeV1toV2, intakeV2toV1, EMPTY_INTAKE_FORM_V2, type IntakeFormData } from '@/lib/types';

const EMPTY_V1: IntakeFormData = {
    name: '', age: '', height: '', weight: '',
    sport_history: '', training_duration: '', training_style: '',
    fitness_goals: '',
    training_days_per_week: '', session_duration: '', preferred_time: '',
    available_equipment: '', training_location: '',
    injuries: '', medical_considerations: '',
    fitness_level: '',
};

const v1 = (over: Partial<IntakeFormData>): IntakeFormData => ({ ...EMPTY_V1, ...over });

describe('training location', () => {
    it.each([
        ['Commercial Gym', 'commercial_gym'],
        ['Home Gym', 'home_gym'],
        ['Garage gym', 'home_gym'],
        ['Outdoor', 'outdoor'],
        ['Calisthenics park', 'calisthenics_park'],
        ['Hotel or travel', 'hotel_travel'],
    ])('reads %j as %s', (input, expected) => {
        expect(intakeV1toV2(v1({ training_location: input })).training_location).toBe(expected);
    });

    it('does not file a home gym as a commercial one', () => {
        // "Home Gym" contains "gym"; testing that first was the bug.
        expect(intakeV1toV2(v1({ training_location: 'I train in my home gym' })).training_location).toBe('home_gym');
    });

    it('does not file a calisthenics park as plain outdoor', () => {
        expect(intakeV1toV2(v1({ training_location: 'the calisthenics park near me' })).training_location).toBe('calisthenics_park');
    });

    it('falls back to the equipment description when no location was given', () => {
        expect(intakeV1toV2(v1({ available_equipment: 'Just what is in my garage' })).training_location).toBe('home_gym');
    });

    it('is empty when nothing was said', () => {
        expect(intakeV1toV2(EMPTY_V1).training_location).toBe('');
    });
});

describe('athletic history', () => {
    it.each([
        ['Never trained', 'never'],
        ['Less than 1 year', '<1yr'],
        ['1-3 years', '1-3yr'],
        ['3-5 years', '3-5yr'],
        ['5-10 years', '5-10yr'],
        ['10+ years', '10+yr'],
    ])('reads %j as %s', (input, expected) => {
        expect(intakeV1toV2(v1({ training_duration: input })).athletic_history).toBe(expected);
    });

    it('does not promote a 5-10 year athlete to 10+', () => {
        // "5-10 years" contains "10 ", and that was tested first.
        expect(intakeV1toV2(v1({ training_duration: '5-10 years' })).athletic_history).toBe('5-10yr');
    });

    it('reads it out of the sport history when that is where it was mentioned', () => {
        expect(intakeV1toV2(v1({ sport_history: 'Rugby, then lifting for 3-5 years' })).athletic_history).toBe('3-5yr');
    });
});

describe('round trip through the v2 labels', () => {
    // intakeV2toV1 renders these as human labels; intakeV1toV2 has to read its own output back.
    it.each(['commercial_gym', 'home_gym', 'outdoor', 'calisthenics_park', 'hotel_travel'])(
        'preserves training_location %s',
        (location) => {
            const back = intakeV1toV2(intakeV2toV1({ ...EMPTY_INTAKE_FORM_V2, training_location: location as never }));
            expect(back.training_location).toBe(location);
        },
    );

    it.each(['never', '<1yr', '1-3yr', '3-5yr', '5-10yr', '10+yr'])(
        'preserves athletic_history %s',
        (history) => {
            const back = intakeV1toV2(intakeV2toV1({ ...EMPTY_INTAKE_FORM_V2, athletic_history: history }));
            expect(back.athletic_history).toBe(history);
        },
    );
});

describe('equipment', () => {
    it('splits a comma list', () => {
        expect(intakeV1toV2(v1({ available_equipment: 'Barbell, dumbbells, squat rack' })).equipment)
            .toEqual(['Barbell', 'dumbbells', 'squat rack']);
    });

    it('splits on the conjunction people actually use', () => {
        expect(intakeV1toV2(v1({ available_equipment: 'Barbell, dumbbells and a cable machine' })).equipment)
            .toEqual(['Barbell', 'dumbbells', 'a cable machine']);
    });

    it('is empty when nothing was said', () => {
        expect(intakeV1toV2(EMPTY_V1).equipment).toEqual([]);
    });
});
