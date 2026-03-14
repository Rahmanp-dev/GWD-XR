import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('model');
        const slug = formData.get('slug');

        if (!file || !slug) {
            return NextResponse.json({ error: 'model file and slug are required' }, { status: 400 });
        }

        // Validate file type
        const name = file.name.toLowerCase();
        if (!name.endsWith('.glb') && !name.endsWith('.gltf')) {
            return NextResponse.json({ error: 'Only .glb and .gltf files are allowed' }, { status: 400 });
        }

        // Validate file size (10MB max)
        const bytes = await file.arrayBuffer();
        if (bytes.byteLength > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // Ensure models directory exists
        const modelsDir = path.join(process.cwd(), 'public', 'models');
        await mkdir(modelsDir, { recursive: true });

        // Generate unique filename
        const ext = path.extname(name);
        const safeName = name.replace(ext, '').replace(/[^a-z0-9_-]/gi, '_').substring(0, 40);
        const filename = `${slug}-${safeName}-${Date.now()}${ext}`;
        const filePath = path.join(modelsDir, filename);

        // Write file
        await writeFile(filePath, Buffer.from(bytes));

        const url = `/models/${filename}`;
        return NextResponse.json({ success: true, url, filename }, { status: 201 });
    } catch (err) {
        console.error('[Upload] Error:', err);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
