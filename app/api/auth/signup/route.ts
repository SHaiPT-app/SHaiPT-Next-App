import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { username, password, role } = await request.json();

        // Check if username exists in Firestore (we use username as a unique field in our app)
        const existingUser = await db.users.getByUsername(username);
        if (existingUser) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }

        // Create user in Firebase Auth
        // We'll use username@shaipt.app as a fake email since Firebase requires email
        const email = `${username}@shaipt.app`;
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: username,
        });

        // Create user in Firestore
        const newUser = await db.users.create({
            id: userRecord.uid,
            username,
            password: 'HASHED_IN_FIREBASE_AUTH', // Don't store actual password
            role,
            trainerId: role === 'trainee' ? undefined : undefined
        });

        // Create session cookie
        // In a real app, we'd exchange the ID token for a session cookie here, 
        // but since we just created the user, we can't easily get an ID token server-side without signing in.
        // For now, we'll set a simple cookie with the UID.
        // Ideally, the frontend should sign in immediately after signup.

        const cookieStore = await cookies();
        cookieStore.set('session', JSON.stringify({ id: newUser.id, role: newUser.role }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });

        return NextResponse.json({ user: newUser });
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
