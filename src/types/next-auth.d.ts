/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      provider?: string;
      phone?: string;
      isAdmin?: boolean;
    };
  }

  interface User {
    phone?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    provider?: string;
    phone?: string;
    isAdmin?: boolean;
  }
}
