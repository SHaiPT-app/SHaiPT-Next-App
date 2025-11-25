# SHaiPT API Documentation

## Overview
This document describes the API endpoints, database helpers, and authentication/permissions for the SHaiPT fitness application.

## Technology Stack
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **API**: Next.js API Routes
- **Security**: Row Level Security (RLS) policies

## Database Schema

### Tables

#### `profiles`
User profiles for both trainers and trainees.
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('trainer', 'trainee')) NOT NULL,
  trainer_id UUID REFERENCES profiles(id),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `workout_plans`
Workout plans created by trainers for trainees.
```sql
CREATE TABLE workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainee_id UUID REFERENCES profiles(id) NOT NULL,
  trainer_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `workout_logs`
Logged workouts completed by trainees.
```sql
CREATE TABLE workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES workout_plans(id) NOT NULL,
  trainee_id UUID REFERENCES profiles(id) NOT NULL,
  date TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `exercises` (Reference Table)
Master exercise database for search functionality.
```sql
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  muscle_group TEXT,
  equipment TEXT,
  instructions TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Exercise Data Structure (JSONB)

#### Workout Plan Exercise Format:
```json
{
  "id": "uuid",
  "name": "Exercise Name",
  "sets": 3,
  "reps": "10-12",
  "weight": "bodyweight",
  "rest": "60s",
  "notes": "Optional exercise notes"
}
```

#### Workout Log Exercise Format:
```json
{
  "name": "Exercise Name",
  "sets": [
    {
      "reps": 10,
      "weight": "50kg",
      "completed": true
    },
    {
      "reps": 8, 
      "weight": "55kg",
      "completed": true
    }
  ]
}
```

### RLS Policies

#### Profiles RLS:
```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trainers can view trainee profiles
CREATE POLICY "Trainers can view trainees" ON profiles
  FOR SELECT USING (
    role = 'trainee' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );
```

#### Workout Plans RLS:
```sql
-- Trainees can view their assigned plans
CREATE POLICY "Trainees can view assigned plans" ON workout_plans
  FOR SELECT USING (trainee_id = auth.uid());

-- Trainers can manage plans for their trainees
CREATE POLICY "Trainers can manage trainee plans" ON workout_plans
  FOR ALL USING (trainer_id = auth.uid());
```

#### Workout Logs RLS:
```sql
-- Trainees can manage their own logs
CREATE POLICY "Trainees can manage own logs" ON workout_logs
  FOR ALL USING (trainee_id = auth.uid());

-- Trainers can view logs from their trainees
CREATE POLICY "Trainers can view trainee logs" ON workout_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = trainee_id AND trainer_id = auth.uid()
    )
  );
```

## API Endpoints

### Authentication Required
All API endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <supabase_access_token>
```

### `/api/plans`

#### GET `/api/plans`
Get workout plans.

**Query Parameters:**
- `traineeId` (string, optional) - Get plans for specific trainee
- `trainerId` (string, optional) - Get plans created by specific trainer

**Response:**
```json
{
  "plans": [
    {
      "id": "uuid",
      "trainee_id": "uuid", 
      "trainer_id": "uuid",
      "name": "Push Day Workout",
      "description": "Upper body push exercises",
      "exercises": [
        {
          "id": "uuid",
          "name": "Push-ups",
          "sets": 3,
          "reps": "10-12",
          "weight": "bodyweight",
          "rest": "60s"
        }
      ],
      "notes": "Focus on form",
      "is_active": true,
      "created_at": "2023-12-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/plans`
Create a new workout plan (trainer only).

**Request Body:**
```json
{
  "traineeId": "uuid",
  "name": "Push Day Workout", 
  "description": "Upper body push exercises",
  "exercises": [
    {
      "id": "uuid",
      "name": "Push-ups",
      "sets": 3,
      "reps": "10-12",
      "weight": "bodyweight",
      "rest": "60s",
      "notes": "Keep core tight"
    }
  ],
  "notes": "Focus on form over speed"
}
```

### `/api/logs`

#### GET `/api/logs`
Get workout logs.

**Query Parameters:**
- `traineeId` (string, required) - Get logs for specific trainee
- `planId` (string, optional) - Filter logs by plan

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "plan_id": "uuid",
      "trainee_id": "uuid", 
      "date": "2023-12-01",
      "exercises": [
        {
          "name": "Push-ups",
          "sets": [
            {"reps": 10, "weight": "bodyweight", "completed": true},
            {"reps": 12, "weight": "bodyweight", "completed": true},
            {"reps": 8, "weight": "bodyweight", "completed": true}
          ]
        }
      ],
      "notes": "Felt strong today",
      "created_at": "2023-12-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/logs`
Create a new workout log (trainee only).

**Request Body:**
```json
{
  "planId": "uuid",
  "date": "2023-12-01",
  "exercises": [
    {
      "name": "Push-ups",
      "sets": [
        {"reps": 10, "weight": "bodyweight", "completed": true},
        {"reps": 12, "weight": "bodyweight", "completed": true}
      ]
    }
  ],
  "notes": "Great workout!"
}
```

### `/api/users/search`

#### GET `/api/users/search`
Search for users by username (trainer only).

**Query Parameters:**
- `q` (string, required) - Search query for username (minimum 1 character)
- `role` (string, optional) - Filter by role ('trainer' | 'trainee')

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com", 
      "role": "trainee",
      "display_name": "John Doe"
    }
  ]
}
```

### `/api/users/link`

#### POST `/api/users/link`
Link a trainee to a trainer.

**Request Body:**
```json
{
  "traineeId": "uuid",
  "trainerId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trainee linked successfully"
}
```

### `/api/users/trainees`

#### GET `/api/users/trainees`
Get all trainees linked to the authenticated trainer.

**Query Parameters:**
- `trainerId` (string, required) - Trainer's user ID

**Response:**
```json
{
  "trainees": [
    {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "display_name": "John Doe",
      "trainer_id": "uuid",
      "created_at": "2023-12-01T00:00:00Z"
    }
  ]
}
```

## Database Helper Functions

Located in `/lib/supabaseDb.ts`:

### `db.profiles`
```typescript
// Create new user profile
create(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile>

// Get profile by ID
getById(id: string): Promise<Profile | null>

// Get profile by email
getByEmail(email: string): Promise<Profile | null>

// Get profile by username
getByUsername(username: string): Promise<Profile | null>

// Update profile
update(id: string, updates: Partial<Profile>): Promise<Profile>

// Search profiles by username
search(query: string, role?: 'trainer' | 'trainee'): Promise<Profile[]>
```

### `db.workoutPlans`
```typescript
// Create new workout plan
create(plan: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutPlan>

// Get plan by ID
getById(id: string): Promise<WorkoutPlan | null>

// Get plans for trainee
getByTrainee(traineeId: string): Promise<WorkoutPlan[]>

// Get plans by trainer
getByTrainer(trainerId: string): Promise<WorkoutPlan[]>

// Update plan
update(id: string, updates: Partial<WorkoutPlan>): Promise<WorkoutPlan>

// Delete plan
delete(id: string): Promise<boolean>
```

### `db.workoutLogs`
```typescript
// Create new workout log
create(log: Omit<WorkoutLog, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutLog>

// Get log by ID
getById(id: string): Promise<WorkoutLog | null>

// Get logs for trainee
getByTrainee(traineeId: string): Promise<WorkoutLog[]>

// Get logs for specific plan
getByPlan(planId: string): Promise<WorkoutLog[]>

// Update log
update(id: string, updates: Partial<WorkoutLog>): Promise<WorkoutLog>

// Delete log
delete(id: string): Promise<boolean>
```

### `db.exercises` (for search functionality)
```typescript
// Search exercises by name
search(query: string): Promise<Exercise[]>

// Get exercise by ID
getById(id: string): Promise<Exercise | null>
```

## TypeScript Interfaces

```typescript
export interface Profile {
  id: string;
  username: string;
  email: string;
  role: 'trainer' | 'trainee';
  trainer_id?: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutPlan {
  id: string;
  trainee_id: string;
  trainer_id: string;
  name: string;
  description?: string;
  exercises: PlanExercise[];
  notes?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutLog {
  id: string;
  plan_id: string;
  trainee_id: string;
  date: string;
  exercises: LoggedExercise[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlanExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rest?: string;
  notes?: string;
}

export interface LoggedExercise {
  name: string;
  sets: {
    reps: number;
    weight: string;
    completed: boolean;
  }[];
}

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  muscle_group?: string;
  equipment?: string;
  instructions?: string;
  image_url?: string;
}
```

## Authentication Flow

1. **Google OAuth**: User signs in via Google OAuth
2. **Profile Creation**: New users complete profile setup with username/role selection
3. **Session Management**: Supabase handles JWT tokens automatically
4. **API Authorization**: All API calls include Bearer token for RLS enforcement

## Error Handling

Common error responses:
```typescript
interface ApiError {
  error: string;
  message?: string;
  details?: any;
}
```

- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions (RLS violation)
- `404 Not Found` - Resource doesn't exist
- `422 Unprocessable Entity` - Invalid request data
- `500 Internal Server Error` - Server-side error

## Environment Variables

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (optional, for admin operations)
```

## Security Notes

- All database operations use RLS policies for data isolation
- Authentication tokens are managed by Supabase Auth  
- API routes validate user permissions before database operations
- Service role key should only be used for administrative operations
- All API endpoints require valid authentication headers

## Development Notes

### Adding New API Endpoints
1. Create new route file in `/app/api/[endpoint]/route.ts`
2. Add authentication header validation
3. Use authenticated Supabase client for database operations
4. Follow existing error handling patterns
5. Update this documentation

### Database Migrations
Use Supabase dashboard or CLI for schema changes:
```bash
supabase migration new migration_name
supabase db push
```

### Testing APIs
Use tools like Postman or curl with proper authentication headers:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     https://shaipt.com/api/plans
```