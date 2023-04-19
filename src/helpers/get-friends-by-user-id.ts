import { User } from "@/types/db";
import { fetchRedis } from "./redis"

// Retrieve friends for current user
export const getFriendsByUserId = async (userId: string) => {
    const friendsIDs = await fetchRedis('smembers', `user:${userId}:friends`) as string[];

    const friends = await Promise.all(
        friendsIDs.map(async (friendId) => {
            const friend = await fetchRedis('get', `user:${friendId}`) as string;
            const parsedFriend = JSON.parse(friend) as User;
            return parsedFriend;
        })
    )

    return friends;
}