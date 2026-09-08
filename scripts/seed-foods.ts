/**
 * Seed food_database from USDA FoodData Central "Foundation Foods" (public domain, ~440 foods).
 *
 *   pnpm db:seed:foods                     download the current CSV release and upsert
 *   pnpm db:seed:foods -- --zip file.zip   use a downloaded release
 *
 * Values are per 100 g (serving_size 100, serving_unit 'g'). Energy uses the USDA kcal value
 * when present, else the Atwater specific/general values, else 4/4/9 from the macros.
 * Safe to re-run: upserts on source_id ('usda:<fdc_id>'). Needs the service role key.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adminClient, arg } from './db';

const RELEASE = 'FoodData_Central_foundation_food_csv_2025-12-18';
const SOURCE_URL = `https://fdc.nal.usda.gov/fdc-datasets/${RELEASE}.zip`;

const NUTRIENT = {
    kcal: '1008',
    kcalAtwaterGeneral: '2047',
    kcalAtwaterSpecific: '2048',
    protein: '1003',
    fat: '1004',
    carbs: '1005',
    fiber: '1079',
    sugarsTotal: '2000',
    sugars: '1063',
    sodium: '1093',
} as const;

// USDA category id → the short categories the nutrition UI filters on
const CATEGORY: Record<string, string> = {
    '1': 'dairy', '2': 'spices', '4': 'fats', '5': 'protein', '6': 'other', '7': 'protein', '9': 'fruits',
    '10': 'protein', '11': 'vegetables', '12': 'nuts', '13': 'protein', '14': 'beverages', '15': 'protein',
    '16': 'legumes', '17': 'protein', '18': 'grains', '19': 'sweets', '20': 'grains', '21': 'other',
    '22': 'other', '25': 'snacks',
};

/** Minimal RFC 4180 parser (quoted fields, doubled quotes, no embedded newlines in this dataset). */
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        const row: string[] = [];
        let field = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (quoted) {
                if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
                else if (c === '"') quoted = false;
                else field += c;
            } else if (c === '"') quoted = true;
            else if (c === ',') { row.push(field); field = ''; }
            else field += c;
        }
        row.push(field);
        rows.push(row);
    }
    return rows;
}

function csvDir(): string {
    let zip = arg('--zip');
    const dir = mkdtempSync(join(tmpdir(), 'usda-'));
    if (!zip) {
        zip = join(dir, 'usda.zip');
        console.log(`downloading ${SOURCE_URL}`);
        execFileSync('curl', ['-sL', '--max-time', '300', '-o', zip, SOURCE_URL]);
        if (statSync(zip).size < 100000) throw new Error('download looks wrong (too small); pass --zip with a local file');
    }
    execFileSync('unzip', ['-o', '-q', zip, '-d', dir]);
    const inner = readdirSync(dir).find((d) => d.startsWith('FoodData_Central'));
    return inner ? join(dir, inner) : dir;
}

function num(v: string | undefined): number | null {
    if (v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

async function main() {
    const dir = csvDir();
    const foods = parseCsv(readFileSync(join(dir, 'food.csv'), 'utf8')).slice(1)
        .filter((r) => r[1] === 'foundation_food')
        .map((r) => ({ fdc_id: r[0], description: r[2], category_id: r[3] }));
    console.log(`${foods.length} foundation foods`);
    const wanted = new Set(foods.map((f) => f.fdc_id));

    const nutrients = new Map<string, Map<string, number>>();
    for (const r of parseCsv(readFileSync(join(dir, 'food_nutrient.csv'), 'utf8')).slice(1)) {
        const [, fdc_id, nutrient_id, amount] = r;
        if (!wanted.has(fdc_id)) continue;
        const n = num(amount);
        if (n === null) continue;
        let m = nutrients.get(fdc_id);
        if (!m) { m = new Map(); nutrients.set(fdc_id, m); }
        m.set(nutrient_id, n);
    }

    const rows = foods.map((f) => {
        const n = nutrients.get(f.fdc_id) ?? new Map<string, number>();
        // USDA derives carbohydrate "by difference", which lands slightly below zero for a few
        // meats. A tester reading "C: -0.48g" sees a bug, so clamp every macro at zero.
        const atLeastZero = (v: number | undefined) => Math.max(0, v ?? 0);
        const protein = atLeastZero(n.get(NUTRIENT.protein));
        const fat = atLeastZero(n.get(NUTRIENT.fat));
        const carbs = atLeastZero(n.get(NUTRIENT.carbs));
        const kcal = n.get(NUTRIENT.kcal) ?? n.get(NUTRIENT.kcalAtwaterSpecific) ?? n.get(NUTRIENT.kcalAtwaterGeneral)
            ?? Math.round(protein * 4 + carbs * 4 + fat * 9);
        return {
            name: f.description,
            brand: null,
            category: CATEGORY[f.category_id] ?? 'other',
            serving_size: 100,
            serving_unit: 'g',
            calories: Math.round(kcal * 10) / 10,
            protein_g: Math.round(protein * 100) / 100,
            carbs_g: Math.round(carbs * 100) / 100,
            fat_g: Math.round(fat * 100) / 100,
            fiber_g: atLeastZero(n.get(NUTRIENT.fiber)),
            sugar_g: atLeastZero(n.get(NUTRIENT.sugarsTotal) ?? n.get(NUTRIENT.sugars)),
            sodium_mg: atLeastZero(n.get(NUTRIENT.sodium)),
            is_verified: true,
            source: 'usda-foundation',
            source_id: `usda:${f.fdc_id}`,
        };
    }).filter((r) => r.calories > 0 || r.protein_g > 0 || r.carbs_g > 0 || r.fat_g > 0);

    // the 0060 seed rows and USDA rows must not collide on (name, brand)
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
        const k = r.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });

    const supabase = adminClient();
    for (let i = 0; i < unique.length; i += 100) {
        const { error } = await supabase.from('food_database').upsert(unique.slice(i, i + 100), { onConflict: 'source_id' });
        if (error) throw new Error(`food_database upsert failed at ${i}: ${error.message}`);
        process.stdout.write(`\rfoods ${Math.min(i + 100, unique.length)}/${unique.length}`);
    }
    console.log();
    const { count } = await supabase.from('food_database').select('*', { count: 'exact', head: true });
    console.log(`done: ${count} foods in food_database (${RELEASE})`);
    writeFileSync(join(dir, 'seeded.json'), JSON.stringify(unique.slice(0, 3), null, 2));
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
