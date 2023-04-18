import { User } from "next-auth";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

type UserId = string;

/* This code is extending the `JWT` interface provided by the `next-auth/jwt` module to include a new
property `id` of type `UserId`. This allows the `id` property to be accessed from the JWT object
returned by the `getToken` method of the `next-auth` module. */
declare module 'next-auth/jwt' {
    interface JWT {
        id: UserId
    }
}

/* This code is extending the `Session` interface provided by the `next-auth` module to include a new
property `id` of type `UserId`. This allows the `id` property to be accessed from the `user` object
in the `Session` object returned by the `getSession` method of the `next-auth` module. */
declare module 'next-auth' {
    interface Session {
        user: User & {
            id: UserId
        }
    }
}