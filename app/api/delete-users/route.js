import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Server-side Supabase client with service_role key
// Server-side Supabase client with service_role key
// Initialize lazily or check for key to prevent build errors
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
    : null;

// Anon client for session verification
const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Delete a single user and all related data
async function deleteSingleUser(userId) {
    try {
        // 1. Delete related data first
        await supabaseAdmin.from('daily_activities').delete().eq('user_id', userId);
        await supabaseAdmin.from('quran_readings').delete().eq('user_id', userId);

        // 2. Delete profile
        const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
        if (profileError) {
            console.warn(`Profile delete failed for ${userId}:`, profileError);
        }

        // 3. Delete auth user
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
            console.warn(`Auth user delete failed for ${userId}:`, authError);
            return { success: false, userId, error: authError.message };
        }

        return { success: true, userId };
    } catch (error) {
        return { success: false, userId, error: error.message || 'Unknown error' };
    }
}

export async function POST(request) {
    try {
        // 1. Verify the request is from an authenticated admin
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        if (!supabaseAdmin) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // 2. Parse request body
        const { userIds } = await request.json();

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });
        }

        // 3. Prevent self-deletion
        if (userIds.includes(user.id)) {
            return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
        }

        // 4. Process deletions in parallel batches
        const BATCH_SIZE = 5;
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            const batch = userIds.slice(i, i + BATCH_SIZE);

            const results = await Promise.allSettled(
                batch.map(id => deleteSingleUser(id))
            );

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.success) {
                    successCount++;
                } else {
                    failCount++;
                    const errMsg = result.status === 'fulfilled'
                        ? result.value.error
                        : result.reason?.message || 'Unknown error';
                    const errId = result.status === 'fulfilled'
                        ? result.value.userId
                        : 'unknown';
                    errors.push({ userId: errId, error: errMsg });
                }
            }
        }

        return NextResponse.json({
            success: true,
            successCount,
            failCount,
            total: userIds.length,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('Bulk delete API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
