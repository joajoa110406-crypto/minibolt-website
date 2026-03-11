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
      profile(profile) {
        return {
          id: profile.response.id,
          name: profile.response.name,
          email: profile.response.email,
          image: profile.response.profile_image,
          phone: profile.response.mobile,           // 휴대전화번호
        };
      },
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
    maxAge: 24 * 60 * 60, // 24시간
    updateAge: 60 * 60,   // 1시간마다 갱신
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, account, user, profile }) {
      if (account) {
        token.provider = account.provider;
      }
      // 이메일 저장 (최초 로그인 시 user 객체에서 가져옴)
      if (user?.email) {
        token.email = user.email;
      }
      // 이름 저장
      if (user?.name) {
        token.name = user.name;
      }
      // 전화번호 저장 (네이버: profile.response.mobile)
      if (account?.provider === 'naver' && profile) {
        const naverProfile = profile as { response?: { mobile?: string } };
        if (naverProfile.response?.mobile) {
          token.phone = naverProfile.response.mobile;
        }
      }
      // user 객체의 phone (커스텀 profile 함수에서 설정)
      if ((user as { phone?: string })?.phone) {
        token.phone = (user as { phone?: string }).phone;
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
        (session.user as { phone?: string }).phone = (token.phone as string) || '';
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
