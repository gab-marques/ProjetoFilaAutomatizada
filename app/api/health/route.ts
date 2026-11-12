import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'fila-inteligente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
