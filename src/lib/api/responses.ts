import { NextResponse } from 'next/server';

export const apiSuccess = <T, M extends Record<string, unknown>>(
  data: T,
  meta?: M,
): NextResponse =>
  NextResponse.json({ data, ...(meta && { meta }) });
