/**
 * @jest-environment node
 */
import { GET, POST, DELETE } from '@/app/api/food-logs/route';

const mockGetByUserAndDate = jest.fn();
const mockGetByUserDateRange = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        foodLogs: {
            getByUserAndDate: (...args: unknown[]) => mockGetByUserAndDate(...args),
            getByUserDateRange: (...args: unknown[]) => mockGetByUserDateRange(...args),
            create: (...args: unknown[]) => mockCreate(...args),
            delete: (...args: unknown[]) => mockDelete(...args),
        },
    },
}));

function createRequest(url: string, options?: RequestInit) {
    return new Request(url, options);
}

describe('/api/food-logs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('returns 400 when userId is missing', async () => {
            const req = createRequest('http://localhost/api/food-logs');
            const res = await GET(req as any);
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('userId is required');
        });

        it('returns logs for a specific date', async () => {
            const mockLogs = [
                { id: 'log-1', food_name: 'Chicken', calories: 165, meal_type: 'lunch' },
            ];
            mockGetByUserAndDate.mockResolvedValue(mockLogs);

            const req = createRequest('http://localhost/api/food-logs?userId=user-1&date=2025-01-15');
            const res = await GET(req as any);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.logs).toHaveLength(1);
            expect(data.logs[0].food_name).toBe('Chicken');
            expect(mockGetByUserAndDate).toHaveBeenCalledWith('user-1', '2025-01-15');
        });

        it('returns logs for a date range', async () => {
            const mockLogs = [
                { id: 'log-1', food_name: 'Chicken', logged_date: '2025-01-15' },
                { id: 'log-2', food_name: 'Rice', logged_date: '2025-01-16' },
            ];
            mockGetByUserDateRange.mockResolvedValue(mockLogs);

            const req = createRequest('http://localhost/api/food-logs?userId=user-1&startDate=2025-01-15&endDate=2025-01-16');
            const res = await GET(req as any);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.logs).toHaveLength(2);
            expect(mockGetByUserDateRange).toHaveBeenCalledWith('user-1', '2025-01-15', '2025-01-16');
        });

        it('uses today as default date when date is not provided', async () => {
            mockGetByUserAndDate.mockResolvedValue([]);
            const today = new Date().toISOString().split('T')[0];

            const req = createRequest('http://localhost/api/food-logs?userId=user-1');
            const res = await GET(req as any);

            expect(res.status).toBe(200);
            expect(mockGetByUserAndDate).toHaveBeenCalledWith('user-1', today);
        });

        it('returns 500 on database error', async () => {
            mockGetByUserAndDate.mockRejectedValue(new Error('DB error'));

            const req = createRequest('http://localhost/api/food-logs?userId=user-1&date=2025-01-15');
            const res = await GET(req as any);
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to fetch food logs');
        });
    });

    describe('POST', () => {
        it('returns 400 when required fields are missing', async () => {
            const req = createRequest('http://localhost/api/food-logs', {
                method: 'POST',
                body: JSON.stringify({ user_id: 'user-1' }),
            });
            const res = await POST(req as any);
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('user_id, food_name, and meal_type are required');
        });

        it('returns 400 for invalid meal_type', async () => {
            const req = createRequest('http://localhost/api/food-logs', {
                method: 'POST',
                body: JSON.stringify({ user_id: 'user-1', food_name: 'Test', meal_type: 'brunch' }),
            });
            const res = await POST(req as any);
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('meal_type must be breakfast, lunch, dinner, or snack');
        });

        it('creates a food log successfully', async () => {
            const mockLog = {
                id: 'log-1',
                user_id: 'user-1',
                food_name: 'Chicken Breast',
                meal_type: 'lunch',
                calories: 165,
                protein_g: 31,
                carbs_g: 0,
                fat_g: 3.6,
            };
            mockCreate.mockResolvedValue(mockLog);

            const req = createRequest('http://localhost/api/food-logs', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: 'user-1',
                    food_name: 'Chicken Breast',
                    meal_type: 'lunch',
                    calories: 165,
                    protein_g: 31,
                    carbs_g: 0,
                    fat_g: 3.6,
                }),
            });
            const res = await POST(req as any);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.log.food_name).toBe('Chicken Breast');
            expect(mockCreate).toHaveBeenCalled();
        });

        it('returns 500 on database error', async () => {
            mockCreate.mockRejectedValue(new Error('DB error'));

            const req = createRequest('http://localhost/api/food-logs', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: 'user-1',
                    food_name: 'Test',
                    meal_type: 'lunch',
                }),
            });
            const res = await POST(req as any);
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to create food log');
        });
    });

    describe('DELETE', () => {
        it('returns 400 when id is missing', async () => {
            const req = createRequest('http://localhost/api/food-logs');
            const res = await DELETE(req as any);
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('id is required');
        });

        it('deletes a food log successfully', async () => {
            mockDelete.mockResolvedValue(undefined);

            const req = createRequest('http://localhost/api/food-logs?id=log-1');
            const res = await DELETE(req as any);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
            expect(mockDelete).toHaveBeenCalledWith('log-1');
        });

        it('returns 500 on database error', async () => {
            mockDelete.mockRejectedValue(new Error('DB error'));

            const req = createRequest('http://localhost/api/food-logs?id=log-1');
            const res = await DELETE(req as any);
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to delete food log');
        });
    });
});
