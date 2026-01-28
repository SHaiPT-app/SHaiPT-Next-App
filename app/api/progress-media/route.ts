import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        const media = await db.progressMedia.getByUser(userId);

        // Generate signed URLs for each media item
        const mediaWithUrls = await Promise.all(
            media.map(async (item) => {
                const { data } = await supabase.storage
                    .from('progress-media')
                    .createSignedUrl(item.storage_path, 3600);
                return {
                    ...item,
                    url: data?.signedUrl || null,
                };
            })
        );

        return NextResponse.json({ media: mediaWithUrls });
    } catch (error) {
        console.error('Error fetching progress media:', error);
        return NextResponse.json(
            { error: 'Failed to fetch progress media' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const userId = formData.get('user_id') as string | null;
        const caption = formData.get('caption') as string | null;
        const takenAt = formData.get('taken_at') as string | null;
        const visibility = (formData.get('visibility') as string) || 'private';

        if (!file || !userId) {
            return NextResponse.json(
                { error: 'file and user_id are required' },
                { status: 400 }
            );
        }

        const validVisibilities = ['public', 'followers', 'private'];
        if (!validVisibilities.includes(visibility)) {
            return NextResponse.json(
                { error: 'visibility must be public, followers, or private' },
                { status: 400 }
            );
        }

        // Determine media type
        const isVideo = file.type.startsWith('video/');
        const mediaType = isVideo ? 'video' : 'image';

        // Generate storage path
        const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        const timestamp = Date.now();
        const storagePath = `${userId}/${timestamp}.${ext}`;

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
            .from('progress-media')
            .upload(storagePath, arrayBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json(
                { error: 'Failed to upload file' },
                { status: 500 }
            );
        }

        // Create database record
        const media = await db.progressMedia.create({
            user_id: userId,
            media_type: mediaType as 'image' | 'video',
            storage_path: storagePath,
            caption: caption || undefined,
            taken_at: takenAt || new Date().toISOString(),
            visibility: visibility as 'public' | 'followers' | 'private',
        });

        // Get signed URL
        const { data: urlData } = await supabase.storage
            .from('progress-media')
            .createSignedUrl(storagePath, 3600);

        return NextResponse.json(
            { media: { ...media, url: urlData?.signedUrl || null } },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error uploading progress media:', error);
        return NextResponse.json(
            { error: 'Failed to upload progress media' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        // Get media record to find storage path
        const media = await db.progressMedia.getById(id);
        if (!media) {
            return NextResponse.json(
                { error: 'Media not found' },
                { status: 404 }
            );
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('progress-media')
            .remove([media.storage_path]);

        if (storageError) {
            console.error('Storage delete error:', storageError);
        }

        // Delete database record
        await db.progressMedia.delete(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting progress media:', error);
        return NextResponse.json(
            { error: 'Failed to delete progress media' },
            { status: 500 }
        );
    }
}
