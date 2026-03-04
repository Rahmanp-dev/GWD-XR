import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                await dbConnect();
                const user = await User.findOne({ email: credentials.email });
                if (!user) return null;
                const isValid = await user.comparePassword(credentials.password);
                if (!isValid) return null;
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    restaurantSlugs: user.restaurantSlugs,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.restaurantSlugs = user.restaurantSlugs;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.sub;
            session.user.role = token.role;
            session.user.restaurantSlugs = token.restaurantSlugs;
            return session;
        },
    },
    pages: {
        signIn: '/admin/login',
    },
    session: { strategy: 'jwt' },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
