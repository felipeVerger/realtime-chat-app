import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { Message, messageValidator } from "@/lib/validations/message";
import { User } from "@/types/db";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth";


export async function POST(req: Request) {
    try {
        const { text, chatId }: {text: string, chatId: string} = await req.json();
        const session = await getServerSession(authOptions);
        const currentUserId = session?.user.id;

        // Check if the current user is logged in
        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const [userId1, userId2] = chatId.split('--');

        // Check if one of the ids is from the current user
        if (currentUserId !== userId1 && currentUserId !== userId2) {
            return new Response('Unauthorized', { status: 401 });
        }

        // See which of the ids is from the current user
        const friendId = currentUserId === userId1 ? userId2 : userId1;
        // Check if the friend id is in the friends list of the current user
        const friendList = await fetchRedis('smembers', `user:${currentUserId}:friends`) as string[];
        const isFriend = friendList.includes(friendId);
        if (!isFriend) {
            return new Response('Unauthorized', { status: 401 });
        }

        const rawSender = await fetchRedis('get', `user:${currentUserId}`) as string;
        const sender = JSON.parse(rawSender) as User;
        
        // All valid, send message
        // Notify all connected chat room clients
        const timestamp = Date.now();
        const messageData: Message = {
            id: nanoid(),
            senderId: currentUserId,
            text,
            timestamp
        } 
        const message = messageValidator.parse(messageData);
        
        pusherServer.trigger(
            toPusherKey(`chat:${chatId}`),
            'incoming-message',
            message
        );

        pusherServer.trigger(toPusherKey(`user:${friendId}:chats`), 'new_message', {
            ...message,
            senderImg: sender.image,
            senderName: sender.name
        })

        await db.zadd(`chat:${chatId}:messages`, {
            score: timestamp,
            member: JSON.stringify(message)
        })
        return new Response('Message sent successfuly');

    } catch (error) {
        if (error instanceof Error) {
            return new Response(error.message, {status: 500})
        } 
        return new Response('Internal server error', {status: 500})
    }
}