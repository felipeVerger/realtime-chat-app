import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addFriendValidator } from "@/lib/validations/add-friends";
import { getServerSession } from "next-auth";
import { z } from "zod";


export async function POST(req: Request) {
    try {
        const body = await req.json();
        /* `const {email: emailToAdd} = addFriendValidator.parse(body.email);` is destructuring the
        `email` property from the `body` object and assigning it to a new variable `emailToAdd`. The
        `addFriendValidator.parse` method is used to validate the `email` property and ensure that
        it is a valid email address. This line of code is extracting the validated email address
        from the `body` object and assigning it to a new variable for further use in the function. */
        const {email: emailToAdd} = addFriendValidator.parse(body.email);

        const idToAdd = await fetchRedis('get', `user:email:${emailToAdd}`) as string;

        // If the id of the friend doesnt exist the we return an error
        if (!idToAdd) {
            return new Response('This person does not exist', { status: 400 });
        }

        const session = await getServerSession(authOptions);

        // If we are not sign in we are not authorized to add a user
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        // If the id of the user we are trying to add is the same as ours we return an error response
        if (idToAdd === session?.user.id) {
            return new Response("You cannot add yourself as a friend", { status: 400 });
        }

        // Check if the user is already added
        const isAlreadyAdded = await fetchRedis(
            'sismember', 
            `user:${idToAdd}:incoming_friend_requests`,
            session.user.id
        ) as 0 | 1;
        if (isAlreadyAdded) {
            return new Response('Already added this user', { status: 400 });
        }

        // Check if the user if the user is already friend
        const isAlreadyFriend = await fetchRedis(
            'sismember', 
            `user:${session.user.id}:friends`,
            idToAdd
        ) as 0 | 1;
        if (isAlreadyFriend) {
            return new Response('This user is already your friend', { status: 400 });
        }
        
        // Valid request, send friend request
        db.sadd(`user:${idToAdd}:incoming_friend_requests`, session.user.id);
        return new Response('OK');
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response('Invalid request payload', { status: 422 });
        }

        return new Response('Invalid request', { status: 400 });
    }
}