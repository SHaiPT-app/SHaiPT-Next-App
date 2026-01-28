/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/food-database/route';

const mockSearch = jest.fn();
const mockGetByCategory = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        foodDatabase: {
            search: (...args: unknown[]) => mockSearch(...args),
            getByCategory: (...args: unknown[]) => mockGetByCategory(...args),
            create: (...args: unknown[]) => mockCreate(...args),
        },
    },
}));

function createRequest(url: string, options?: RequestInit) {
    return new Request(url, options);
}

describe('/api/food-database', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('returns 400 when query is too short', async () => {
            const req = createRequest('http://localhost/api/food-database?q=a');
            const res = await GET(req as any);
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('Search query must be at least 2 characters');
        });

        it('searches for foods by query', async () => {
            const mockFoods = [
                { id: 'f1', name: 'Chicken Breast', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
            ];
            mockSearch.mockResolvedValue(mockFoods);

            const req = createRequest('http://localhost/api/food-database?q=chicken');
            const res = await GET(req as any);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.foods).toHaveLength(1);
            expect(data.foods[0].name).toBe('Chicken Breast');
            expect(mockSearch).toHaveBeenCalledWith('chicken');
        });

        it('gets foods by category', async () => {
            const mockFoods = [
                { id: 'f1', name: 'Brown Rice', category: 'grains' },
            ];
            mockGetByCategory.mockResolvedValue(mockFoods);

            const req = createRequest('http://localhost/api/food-database?category=grains');
            const res = await GET(req as any);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.foods).toHaveLength(1);
            expect(mockGetByCategory).toHaveBeenCalledWith('grains');
        });

        it('returns 500 on database error', async () => {
            mockSearch.mockRejectedValue(new Error('DB error'));

            const req = createRequest('http://localhost/api/food-database?q=chicken');
            const res = await GET(req as any);
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to search food database');
        });
    });

    describe('POST', () => {
        it('returns 400 when name is missing', async () => {
            const req = createRequest('http://localhost/api/food-database', {
                method: 'POST',
                body: JSON.stringify({ calories: 100 }),
            });
            const res = await POST(req as any);
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('Food name is required');
        });

        it('creates a food item successfully', async () => {
            const mockFood = {
                id: 'f1',
                name: 'Custom Protein Bar',
                calories: 200,
                protein_g: 20,
                carbs_g: 25,
                fat_g: 8,
            };
            mockCreate.mockResolvedValue(mockFood);

            const req = createRequest('http://localhost/api/food-database', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Custom Protein Bar',
                    calories: 200,
                    protein_g: 20,
                    carbs_g: 25,
                    fat_g: 8,
                }),
            });
            const res = await POST(req as any);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.food.name).toBe('Custom Protein Bar');
            expect(mockCreate).toHaveBeenCalled();
        });

        it('returns 500 on database error', async () => {
            mockCreate.mockRejectedValue(new Error('DB error'));

            const req = createRequest('http://localhost/api/food-database', {
                method: 'POST',
                body: JSON.stringify({ name: 'Test Food' }),
            });
            const res = await POST(req as any);
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to create food item');
        });
    });
});
