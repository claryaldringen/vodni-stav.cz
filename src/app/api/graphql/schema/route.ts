import { NextResponse } from 'next/server';
import { typeDefs } from '../schema';

export const GET = () =>
  new NextResponse(typeDefs, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="schema.graphql"',
      'Access-Control-Allow-Origin': '*',
    },
  });
