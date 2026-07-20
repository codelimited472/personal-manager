import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const filePath = path.join(process.cwd(), 'sync-errors.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
