import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { User } from '@/lib/types';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const { username, password, role } = await request.json();

        if (!username || !password || !role) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const existingUser = db.users.getByUsername(username);
        if (existingUser) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }

        const newUser: User = {
            id: uuidv4(),
            username,
            password,
            role,
        };

        db.users.create(newUser);

        // Set a simple session cookie
        const cookieStore = await cookies();
        cookieStore.set('session', JSON.stringify({ id: newUser.id, role: newUser.role }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });

        return NextResponse.json({ user: newUser });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
