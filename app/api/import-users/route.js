import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Server-side Supabase client with service_role key (full admin access)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Anon client for session verification only
const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Process a single user creation
async function createSingleUser(name, email, password, group) {
    const pwd = password || 'Ramadhan2026!';

    // Use admin.createUser (no rate limit issues, no session hijack)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pwd,
        email_confirm: true,
        user_metadata: { full_name: name, user_group: group },
    });

    if (error) {
        return { success: false, email, error: error.message };
    }

    const userId = data?.user?.id;
    if (!userId) {
        return { success: false, email, error: 'No user ID returned' };
    }

    // Update/upsert the profile with group info
    // Small delay for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 200));

    const { error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userId,
            full_name: name,
            email,
            user_group: group,
            role: 'member',
        }, { onConflict: 'id' });

    if (upsertError) {
        console.warn(`Profile upsert failed for ${email}:`, upsertError);
    }

    return { success: true, email };
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

        // 2. Check if service_role key is configured
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'your_service_role_key_here') {
            return NextResponse.json({
                error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi. Tambahkan di .env.local',
                fallback: true,
            }, { status: 500 });
        }

        // 3. Parse request body
        const { users, group } = await request.json();

        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ error: 'No users provided' }, { status: 400 });
        }

        if (!group) {
            return NextResponse.json({ error: 'Group is required' }, { status: 400 });
        }

        // 4. Check for existing users - fetch all auth users' emails
        const emailsToImport = users.map(u => u.email.toLowerCase().trim());
        const existingEmails = new Set();

        // Use admin API to list users and check which emails already exist
        // We paginate through all users since listUsers has a default limit
        let page = 1;
        const perPage = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                page,
                perPage,
            });

            if (listError) {
                console.warn('Error listing users:', listError);
                break;
            }

            if (authUsers && authUsers.length > 0) {
                for (const authUser of authUsers) {
                    if (authUser.email && emailsToImport.includes(authUser.email.toLowerCase())) {
                        existingEmails.add(authUser.email.toLowerCase());
                    }
                }
                if (authUsers.length < perPage) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        // Separate users into new and existing (skipped)
        const skippedUsers = [];
        const newUsers = [];

        for (const u of users) {
            if (existingEmails.has(u.email.toLowerCase().trim())) {
                skippedUsers.push({ name: u.name, email: u.email });
            } else {
                newUsers.push(u);
            }
        }

        // 5. Process only new users in parallel batches
        const BATCH_SIZE = 5;
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (let i = 0; i < newUsers.length; i += BATCH_SIZE) {
            const batch = newUsers.slice(i, i + BATCH_SIZE);

            const results = await Promise.allSettled(
                batch.map(u => createSingleUser(u.name, u.email, u.password, group))
            );

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.success) {
                    successCount++;
                } else {
                    failCount++;
                    const errMsg = result.status === 'fulfilled'
                        ? result.value.error
                        : result.reason?.message || 'Unknown error';
                    const errEmail = result.status === 'fulfilled'
                        ? result.value.email
                        : 'unknown';
                    errors.push({ email: errEmail, error: errMsg });
                }
            }
        }

        return NextResponse.json({
            success: true,
            successCount,
            failCount,
            skippedCount: skippedUsers.length,
            skippedUsers: skippedUsers.length > 0 ? skippedUsers : undefined,
            total: users.length,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('Import API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
