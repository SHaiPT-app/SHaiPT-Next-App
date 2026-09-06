/**
 * Seed the exercise library from free-exercise-db (public domain, github.com/yuhonas/free-exercise-db).
 *
 *   pnpm db:seed:exercises            download dist/exercises.json and upsert ~870 rows
 *   pnpm db:seed:exercises -- --file path/to/exercises.json
 *
 * Safe to re-run: upserts on exercise_id (the dataset's stable id), replaces the
 * exercise_instructions steps, and re-applies the 4Dcoach mapping (fourd_id).
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { readFileSync } from 'node:fs';
import { adminClient, arg } from './db';
import { FOURD_EXERCISE_MAP, exerciseSlug, bodyPartsFor, EXERCISE_IMAGE_BASE } from '../lib/exerciseLibrary';

const SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

interface FreeExercise {
    id: string;
    name: string;
    force: string | null;
    level: string;
    mechanic: string | null;
    equipment: string | null;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    instructions: string[];
    category: string;
    images: string[];
}

async function load(): Promise<FreeExercise[]> {
    const file = arg('--file');
    if (file) return JSON.parse(readFileSync(file, 'utf8'));
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`download failed: ${res.status} ${SOURCE_URL}`);
    return (await res.json()) as FreeExercise[];
}

async function main() {
    const supabase = adminClient();
    const source = await load();
    console.log(`${source.length} exercises in the dataset`);

    // fourd_id lookup: id → { fourd, primary }
    const fourd = new Map<string, { fourd: string; primary: boolean }>();
    for (const [fourdId, ids] of Object.entries(FOURD_EXERCISE_MAP)) {
        ids.forEach((id, i) => fourd.set(id, { fourd: fourdId, primary: i === 0 }));
    }
    for (const id of fourd.keys()) {
        if (!source.some((e) => e.id === id)) console.warn(`  4D mapping: ${id} is not in the dataset`);
    }

    const rows = source.map((e) => {
        const map = fourd.get(e.id);
        return {
            exercise_id: e.id,
            slug: exerciseSlug(e.name),
            name: e.name,
            force: e.force,
            level: e.level,
            mechanic: e.mechanic,
            equipment: e.equipment,
            primary_muscles: e.primaryMuscles,
            secondary_muscles: e.secondaryMuscles,
            instructions: e.instructions,
            category: e.category,
            images: e.images,
            gif_url: e.images[0] ? `${EXERCISE_IMAGE_BASE}${e.images[0]}` : null,
            body_parts: bodyPartsFor(e.primaryMuscles),
            target_muscles: e.primaryMuscles,
            equipments: e.equipment ? [e.equipment] : [],
            difficulty: e.level,
            source: 'free-exercise-db',
            fourd_id: map?.fourd ?? null,
            is_fourd_primary: map?.primary ?? false,
        };
    });

    // slugs must be unique; the dataset has a few near-duplicate names
    const seen = new Map<string, number>();
    for (const r of rows) {
        const n = seen.get(r.slug) ?? 0;
        seen.set(r.slug, n + 1);
        if (n > 0) r.slug = `${r.slug}-${n + 1}`;
    }

    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const { error } = await supabase.from('exercises').upsert(chunk, { onConflict: 'exercise_id' });
        if (error) throw new Error(`exercises upsert failed at ${i}: ${error.message}`);
        process.stdout.write(`\rexercises ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    }
    console.log();

    const steps = source.flatMap((e) =>
        e.instructions.map((instruction, idx) => ({ exercise_id: e.id, step_number: idx + 1, instruction }))
    );
    const ids = source.map((e) => e.id);
    for (let i = 0; i < ids.length; i += 200) {
        const { error } = await supabase.from('exercise_instructions').delete().in('exercise_id', ids.slice(i, i + 200));
        if (error) throw new Error(`exercise_instructions delete failed: ${error.message}`);
    }
    for (let i = 0; i < steps.length; i += 500) {
        const { error } = await supabase.from('exercise_instructions').insert(steps.slice(i, i + 500));
        if (error) throw new Error(`exercise_instructions insert failed at ${i}: ${error.message}`);
        process.stdout.write(`\rinstructions ${Math.min(i + 500, steps.length)}/${steps.length}`);
    }
    console.log();

    const { count } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
    const { data: mapped } = await supabase.from('exercises').select('fourd_id, is_fourd_primary').not('fourd_id', 'is', null);
    console.log(`done: ${count} exercises, ${mapped?.length ?? 0} linked to 4Dcoach (${mapped?.filter((m) => m.is_fourd_primary).length ?? 0} primary)`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
