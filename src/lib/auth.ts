import { NextAuthOptions } from "next-auth";
import { UpstashRedisAdapter } from "@next-auth/upstash-redis-adapter";
import { db } from "./db";
import GoogleProvider from 'next-auth/providers/google'
import { User } from "@/types/db";
import { fetchRedis } from "@/helpers/redis";


/**
 * The function retrieves Google credentials from environment variables and throws an error if they are
 * missing.
 * @returns an object with two properties: `clientId` and `clientSecret`, which are obtained from
 * environment variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, respectively. If either of
 * these environment variables is missing or empty, the function throws an error.
 */
function getGoogleCredentials() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || clientId.length === 0) {
        throw new Error('Missing GOOGLE_CLIENT_ID')
    }
    if (!clientSecret || clientSecret.length === 0) {
        throw new Error('Missing GOOGLE_CLIENT_SECRET')
    }

    return {clientId, clientSecret}
}

export const authOptions: NextAuthOptions = {
    /* `adapter: UpstashRedisAdapter(db)` is configuring NextAuth to use Upstash Redis as the session
    store. The `UpstashRedisAdapter` is a package that provides a Redis adapter for NextAuth,
    allowing session data to be stored in a Redis database. The `db` parameter passed to the adapter
    is the Redis client instance used to connect to the database. */
    adapter: UpstashRedisAdapter(db),
    /* This configuration option is setting the session strategy to use JSON Web Tokens (JWT) for
    session management. JWT is a standard for securely transmitting information between parties as a
    JSON object. By setting the session strategy to JWT, NextAuth will use JWTs to manage user
    sessions, which can be stored in cookies or local storage. */
    session: {
        strategy: 'jwt'
    },
    /* This configuration option is setting the path for the sign-in page to '/login'. When a user
    tries to access a protected page without being authenticated, NextAuth will redirect them to the
    sign-in page specified here. */
    pages: {
        signIn: '/login'
    },
    /* This code block is configuring NextAuth to use Google as an authentication provider. It is
    setting the `providers` option to an array containing a single element, which is an instance of
    the `GoogleProvider` class. The `GoogleProvider` class is provided by the
    `next-auth/providers/google` package and is used to configure NextAuth to use Google as an
    authentication provider. The `clientId` and `clientSecret` options passed to the
    `GoogleProvider` constructor are obtained by calling the `getGoogleCredentials` function, which
    retrieves the values from environment variables. These credentials are used by NextAuth to
    authenticate users with Google. */
    providers: [
        GoogleProvider({
            clientId: getGoogleCredentials().clientId,
            clientSecret: getGoogleCredentials().clientSecret,
        })
    ],
    /* The `callbacks` property in the NextAuthOptions object is used to define functions that are
    called during the authentication process. */
    callbacks: {
        async jwt({ token, user }) {
            const dbUserResult = await fetchRedis('get', `user:${token.id}`) as string | null;

            if(!dbUserResult) {
                token.id = user?.id;
                return token;
            }

            const dbUser = JSON.parse(dbUserResult) as User;

            return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                picture: dbUser.image
            }
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id
                session.user.email = token.name
                session.user.email = token.email
                session.user.image = token.picture
            }

            return session
        },
        redirect() {
            return '/dashboard'
        }
    }
}