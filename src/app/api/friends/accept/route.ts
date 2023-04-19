import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { User } from "@/types/db";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        /* This line of code is parsing the `body` of the HTTP request using the Zod library to ensure
        that it conforms to a specific schema. Specifically, it is expecting an object with a
        property called `id` that is a string. */
        const { id: idToAdd } = z.object({ id: z.string() }).parse(body);

        const session = await getServerSession(authOptions);

        // Verify if the user is logged in
        if (!session) {
            return new Response('Unauthorized', {status: 401});
        }

        // Verify both users are already friends
        const isAlreadyFriends = await fetchRedis('sismember', `user:${session.user.id}:friends`, idToAdd);
        if (isAlreadyFriends) {
            return new Response('Already friends', {status: 400});
        }

        // Verify if the friend request exists
        const hasFriendRequest = await fetchRedis('sismember', `user:${session.user.id}:incoming_friend_requests`, idToAdd);
        if (!hasFriendRequest) {
            return new Response('Friend request does not exist', {status: 400});
        }

        // Valid
        const [userRaw, friendRaw] = (await Promise.all([
            fetchRedis('get', `user:${session.user.id}`),
            fetchRedis('get', `user:${idToAdd}`),
        ])) as [string, string];

        const user = JSON.parse(userRaw) as User;
        const friend = JSON.parse(friendRaw) as User;
    
        await Promise.all([
            pusherServer.trigger(toPusherKey(`user:${idToAdd}:friends`), 'new_friend', user),
            pusherServer.trigger(toPusherKey(`user:${session.user.id}:friends`), 'new_friend', friend),
            db.sadd(`user:${session.user.id}:friends`, idToAdd),
            db.sadd(`user:${idToAdd}:friends`, session.user.id),
            db.srem(`user:${session.user.id}:incoming_friend_requests`, idToAdd)
        ])

        return new Response('Friend added successfuly');
    
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response('Invalid request payload', { status: 422 });
        }
        return new Response('Invalid request', { status: 400 });
    }
}