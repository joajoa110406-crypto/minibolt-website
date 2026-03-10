import NextAuth from 'next-auth';
import NaverProvider from 'next-auth/providers/naver';
import KakaoProvider from 'next-auth/providers/kakao';
import type { NextAuthOptions } from 'next-auth';

const providers = [];
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  providers.push(
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
    })
  );
}
if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    })
  );
}

// 관리자 이메일 목록 (쉼표 구분 환경변수)
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.provider = account.provider;
      }
      // 이메일 저장 (최초 로그인 시 user 객체에서 가져옴)
      if (user?.email) {
        token.email = user.email;
      }
      // 관리자 여부 판별
      const adminEmails = getAdminEmails();
      const tokenEmail = (token.email as string | undefined)?.toLowerCase() || '';
      token.isAdmin = adminEmails.length > 0 && adminEmails.includes(tokenEmail);

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { provider?: string }).provider = token.provider as string;
        (session.user as { email?: string }).email = token.email as string;
        (session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
