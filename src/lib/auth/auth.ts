import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Facebook from 'next-auth/providers/facebook';
import Apple from 'next-auth/providers/apple';
import { compare } from 'bcryptjs';
import { connectDb } from '../db';
import { PostgresAdapter } from './adapter';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PostgresAdapter(),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/prihlaseni',
  },
  providers: [
    Google,
    GitHub,
    Facebook,
    Apple,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Heslo', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const sql = await connectDb();
        const rows = await sql`
          SELECT id, name, email, image, password_hash
          FROM "user"
          WHERE email = ${email}
        `;
        const user = rows[0];
        if (!user || !user.password_hash) return null;

        const valid = await compare(password, user.password_hash as string);
        if (!valid) return null;

        return {
          id: user.id as string,
          name: user.name as string,
          email: user.email as string,
          image: (user.image as string) ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
