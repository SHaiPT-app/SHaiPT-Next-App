// ============================================
// Demo Mode Mock Data
// Used for the investor demo walkthrough flow
// ============================================

export const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@shaipt.com',
  username: 'demo_athlete',
  full_name: 'Alex Demo',
  role: 'trainee' as const,
  avatar_url: '',
  fitness_goals: ['Build Muscle', 'Improve Strength', 'Stay Healthy'],
  preferred_weight_unit: 'lbs' as const,
  created_at: new Date().toISOString(),
};

export const DEMO_TRAINER = {
  id: 'demo-trainer-id',
  email: 'trainer@shaipt.com',
  username: 'coach_mike',
  full_name: 'Coach Mike',
  role: 'trainer' as const,
  avatar_url: '',
  created_at: new Date().toISOString(),
};

export const DEMO_INTERVIEW_SCRIPT = [
  {
    role: 'assistant' as const,
    content:
      "Welcome to SHaiPT! I'm your AI Coach. Let's get you set up with a personalized fitness plan. What are your main fitness goals?",
  },
  {
    role: 'user' as const,
    content: 'I want to build muscle and get stronger.',
  },
  {
    role: 'assistant' as const,
    content:
      "Building muscle and strength — great combination! How many days per week can you commit to training?",
  },
  {
    role: 'user' as const,
    content: '4 days a week.',
  },
  {
    role: 'assistant' as const,
    content:
      "4 days is perfect for a solid upper/lower split. Do you have any injuries or limitations I should know about?",
  },
  {
    role: 'user' as const,
    content: 'No injuries, I have full access to a gym.',
  },
  {
    role: 'assistant' as const,
    content:
      "Excellent! Based on your goals, I'm creating a personalized 8-week hypertrophy/strength program with a progressive overload structure, plus a nutrition plan to support your muscle-building goals. Let me generate everything for you now...",
  },
];

export const DEMO_TRAINING_PLAN = {
  id: 'demo-plan-1',
  name: 'Hypertrophy/Strength 8-Week Program',
  description:
    'Progressive overload program designed for muscle growth and strength gains. Upper/Lower split, 4 days per week.',
  duration_weeks: 8,
  sessions: [
    {
      id: 'demo-session-1',
      name: 'Upper Body Power',
      day_number: 1,
      week_number: 1,
      exercises: [
        {
          name: 'Barbell Bench Press',
          sets: [
            { reps: '5', weight: '185 lbs', rest_seconds: 180 },
            { reps: '5', weight: '185 lbs', rest_seconds: 180 },
            { reps: '5', weight: '185 lbs', rest_seconds: 180 },
            { reps: '5', weight: '185 lbs', rest_seconds: 180 },
          ],
        },
        {
          name: 'Barbell Row',
          sets: [
            { reps: '6', weight: '155 lbs', rest_seconds: 120 },
            { reps: '6', weight: '155 lbs', rest_seconds: 120 },
            { reps: '6', weight: '155 lbs', rest_seconds: 120 },
            { reps: '6', weight: '155 lbs', rest_seconds: 120 },
          ],
        },
        {
          name: 'Overhead Press',
          sets: [
            { reps: '8', weight: '95 lbs', rest_seconds: 90 },
            { reps: '8', weight: '95 lbs', rest_seconds: 90 },
            { reps: '8', weight: '95 lbs', rest_seconds: 90 },
          ],
        },
        {
          name: 'Weighted Pull-ups',
          sets: [
            { reps: '8', weight: '+25 lbs', rest_seconds: 90 },
            { reps: '8', weight: '+25 lbs', rest_seconds: 90 },
            { reps: '8', weight: '+25 lbs', rest_seconds: 90 },
          ],
        },
      ],
    },
    {
      id: 'demo-session-2',
      name: 'Lower Body Power',
      day_number: 2,
      week_number: 1,
      exercises: [
        {
          name: 'Barbell Back Squat',
          sets: [
            { reps: '5', weight: '225 lbs', rest_seconds: 180 },
            { reps: '5', weight: '225 lbs', rest_seconds: 180 },
            { reps: '5', weight: '225 lbs', rest_seconds: 180 },
            { reps: '5', weight: '225 lbs', rest_seconds: 180 },
          ],
        },
        {
          name: 'Romanian Deadlift',
          sets: [
            { reps: '8', weight: '185 lbs', rest_seconds: 120 },
            { reps: '8', weight: '185 lbs', rest_seconds: 120 },
            { reps: '8', weight: '185 lbs', rest_seconds: 120 },
          ],
        },
        {
          name: 'Leg Press',
          sets: [
            { reps: '10', weight: '360 lbs', rest_seconds: 90 },
            { reps: '10', weight: '360 lbs', rest_seconds: 90 },
            { reps: '10', weight: '360 lbs', rest_seconds: 90 },
          ],
        },
      ],
    },
    {
      id: 'demo-session-3',
      name: 'Upper Body Hypertrophy',
      day_number: 4,
      week_number: 1,
      exercises: [
        {
          name: 'Incline Dumbbell Press',
          sets: [
            { reps: '10', weight: '65 lbs', rest_seconds: 90 },
            { reps: '10', weight: '65 lbs', rest_seconds: 90 },
            { reps: '10', weight: '65 lbs', rest_seconds: 90 },
          ],
        },
        {
          name: 'Cable Rows',
          sets: [
            { reps: '12', weight: '120 lbs', rest_seconds: 60 },
            { reps: '12', weight: '120 lbs', rest_seconds: 60 },
            { reps: '12', weight: '120 lbs', rest_seconds: 60 },
          ],
        },
        {
          name: 'Lateral Raises',
          sets: [
            { reps: '15', weight: '20 lbs', rest_seconds: 60 },
            { reps: '15', weight: '20 lbs', rest_seconds: 60 },
            { reps: '15', weight: '20 lbs', rest_seconds: 60 },
          ],
        },
      ],
    },
    {
      id: 'demo-session-4',
      name: 'Lower Body Hypertrophy',
      day_number: 5,
      week_number: 1,
      exercises: [
        {
          name: 'Front Squat',
          sets: [
            { reps: '8', weight: '155 lbs', rest_seconds: 120 },
            { reps: '8', weight: '155 lbs', rest_seconds: 120 },
            { reps: '8', weight: '155 lbs', rest_seconds: 120 },
          ],
        },
        {
          name: 'Walking Lunges',
          sets: [
            { reps: '12', weight: '50 lbs', rest_seconds: 90 },
            { reps: '12', weight: '50 lbs', rest_seconds: 90 },
            { reps: '12', weight: '50 lbs', rest_seconds: 90 },
          ],
        },
        {
          name: 'Leg Curl',
          sets: [
            { reps: '12', weight: '90 lbs', rest_seconds: 60 },
            { reps: '12', weight: '90 lbs', rest_seconds: 60 },
            { reps: '12', weight: '90 lbs', rest_seconds: 60 },
          ],
        },
      ],
    },
  ],
};

export const DEMO_NUTRITION_PLAN = {
  dailyCalories: 2800,
  macros: {
    protein: { grams: 190, percentage: 27 },
    carbs: { grams: 340, percentage: 49 },
    fat: { grams: 75, percentage: 24 },
  },
  meals: [
    {
      name: 'Breakfast',
      calories: 650,
      items: ['4 eggs scrambled', '2 slices whole wheat toast', '1 banana', 'Greek yogurt'],
    },
    {
      name: 'Lunch',
      calories: 750,
      items: ['8oz grilled chicken breast', '1.5 cups brown rice', 'Mixed vegetables', 'Olive oil dressing'],
    },
    {
      name: 'Pre-Workout Snack',
      calories: 350,
      items: ['Protein shake', '1 apple', '2 tbsp peanut butter'],
    },
    {
      name: 'Dinner',
      calories: 800,
      items: ['8oz salmon fillet', 'Sweet potato', 'Steamed broccoli', 'Side salad'],
    },
    {
      name: 'Evening Snack',
      calories: 250,
      items: ['Cottage cheese', 'Mixed berries', 'Handful of almonds'],
    },
  ],
};

export const DEMO_WORKOUT_LOG = {
  id: 'demo-log-1',
  exercise: 'Barbell Bench Press',
  sets: [
    { set: 1, weight: 135, reps: 10, rpe: 6, isWarmup: true },
    { set: 2, weight: 165, reps: 5, rpe: 7, isWarmup: true },
    { set: 3, weight: 185, reps: 5, rpe: 8, isWarmup: false },
    { set: 4, weight: 185, reps: 5, rpe: 8.5, isWarmup: false },
    { set: 5, weight: 185, reps: 4, rpe: 9, isWarmup: false },
  ],
  formFeedback: [
    { type: 'good' as const, message: 'Bar path is straight and consistent' },
    { type: 'good' as const, message: 'Proper arch maintained throughout' },
    { type: 'warning' as const, message: 'Right elbow flaring slightly on last rep - watch for shoulder impingement' },
    { type: 'good' as const, message: 'Controlled eccentric phase (2-3 seconds)' },
  ],
};

export const DEMO_ANALYTICS = {
  weeklyVolume: [
    { week: 'Week 1', volume: 28500 },
    { week: 'Week 2', volume: 30200 },
    { week: 'Week 3', volume: 32100 },
    { week: 'Week 4', volume: 29000 },
    { week: 'Week 5', volume: 33500 },
    { week: 'Week 6', volume: 35200 },
    { week: 'Week 7', volume: 36800 },
    { week: 'Week 8', volume: 38500 },
  ],
  personalRecords: [
    { exercise: 'Bench Press', weight: 205, date: '2 days ago', isNew: true },
    { exercise: 'Squat', weight: 275, date: '5 days ago', isNew: true },
    { exercise: 'Deadlift', weight: 315, date: '1 week ago', isNew: false },
    { exercise: 'Overhead Press', weight: 135, date: '3 days ago', isNew: true },
  ],
  workoutStreak: 12,
  totalWorkouts: 28,
  muscleGroups: [
    { name: 'Chest', percentage: 22 },
    { name: 'Back', percentage: 24 },
    { name: 'Legs', percentage: 28 },
    { name: 'Shoulders', percentage: 14 },
    { name: 'Arms', percentage: 12 },
  ],
  bodyWeight: [
    { date: 'Jan 1', weight: 175 },
    { date: 'Jan 8', weight: 176 },
    { date: 'Jan 15', weight: 176.5 },
    { date: 'Jan 22', weight: 177 },
    { date: 'Jan 29', weight: 177.5 },
    { date: 'Feb 5', weight: 178 },
    { date: 'Feb 12', weight: 178.5 },
    { date: 'Feb 19', weight: 179 },
  ],
};

export const DEMO_TRAINER_CLIENTS = [
  {
    id: 'client-1',
    name: 'Sarah Johnson',
    username: 'sarah_j',
    avatar: 'S',
    lastWorkout: 'Today',
    currentPlan: 'Fat Loss 12-Week',
    streak: 8,
    alerts: [],
  },
  {
    id: 'client-2',
    name: 'Alex Demo',
    username: 'demo_athlete',
    avatar: 'A',
    lastWorkout: 'Yesterday',
    currentPlan: 'Hypertrophy/Strength 8-Week',
    streak: 12,
    alerts: [],
  },
  {
    id: 'client-3',
    name: 'Mike Chen',
    username: 'mike_c',
    avatar: 'M',
    lastWorkout: '3 days ago',
    currentPlan: 'Powerlifting Prep',
    streak: 3,
    alerts: [{ type: 'missed_workouts', severity: 'warning', message: 'Missed 2 scheduled sessions' }],
  },
  {
    id: 'client-4',
    name: 'Emma Wilson',
    username: 'emma_w',
    avatar: 'E',
    lastWorkout: '5 days ago',
    currentPlan: 'General Fitness',
    streak: 0,
    alerts: [{ type: 'missed_workouts', severity: 'critical', message: 'No workouts in 5 days' }],
  },
];

// Demo flow step order
export const DEMO_STEPS = [
  { path: '/demo', label: 'Welcome' },
  { path: '/demo/interview', label: 'AI Interview' },
  { path: '/demo/plan', label: 'Your Plan' },
  { path: '/demo/workout', label: 'Workout' },
  { path: '/demo/analytics', label: 'Analytics' },
  { path: '/demo/trainer', label: 'Trainer View' },
  { path: '/demo/pricing', label: 'Pricing' },
] as const;
