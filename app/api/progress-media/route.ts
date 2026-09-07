import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

const BUCKET = 'progress-media';

// `userId` in the query is ignored: the caller only sees their own media.
export async function GET(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { data: media, error } = await auth.supabase
            .from('progress_media')
            .select('*')
            .eq('user_id', auth.user.id)
            .order('taken_at', { ascending: false })
            .limit(50);
        if (error) throw error;

        // Generate signed URLs for each media item (storage RLS: own folder only)
        const mediaWithUrls = await Promise.all(
            (media || []).map(async (item) => {
                const { data } = await auth.supabase.storage
                    .from(BUCKET)
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
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        // user_id in the form is ignored: the upload belongs to the caller.
        const userId = auth.user.id;
        const caption = formData.get('caption') as string | null;
        const takenAt = formData.get('taken_at') as string | null;
        const visibility = (formData.get('visibility') as string) || 'private';

        if (!file) {
            return NextResponse.json(
                { error: 'file is required' },
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

        // Generate storage path: objects live under <user id>/ so storage RLS applies
        const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        const timestamp = Date.now();
        const storagePath = `${userId}/${timestamp}.${ext}`;

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await auth.supabase.storage
            .from(BUCKET)
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
        const { data: media, error: insertError } = await auth.supabase
            .from('progress_media')
            .insert([{
                user_id: userId,
                media_type: mediaType,
                storage_path: storagePath,
                caption: caption || undefined,
                taken_at: takenAt || new Date().toISOString(),
                visibility,
            }])
            .select()
            .single();
        if (insertError) throw insertError;

        // Get signed URL
        const { data: urlData } = await auth.supabase.storage
            .from(BUCKET)
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
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        // Get media record to find storage path (own rows only)
        const { data: media, error: fetchError } = await auth.supabase
            .from('progress_media')
            .select('*')
            .eq('id', id)
            .eq('user_id', auth.user.id)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!media) {
            return NextResponse.json(
                { error: 'Media not found' },
                { status: 404 }
            );
        }

        // Delete from storage
        const { error: storageError } = await auth.supabase.storage
            .from(BUCKET)
            .remove([media.storage_path]);

        if (storageError) {
            console.error('Storage delete error:', storageError);
        }

        // Delete database record
        const { error: deleteError } = await auth.supabase
            .from('progress_media')
            .delete()
            .eq('id', id)
            .eq('user_id', auth.user.id);
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting progress media:', error);
        return NextResponse.json(
            { error: 'Failed to delete progress media' },
            { status: 500 }
        );
    }
}
