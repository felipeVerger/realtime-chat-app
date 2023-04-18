import FriendRequests from '@/components/FriendRequests/FriendRequests';
import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth'
import { User } from '@/types/db';
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation';

const page = async ({}) => {
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  /* This code is fetching a list of incoming friend requests for the current user from Redis, a
  key-value store. It is using the `fetchRedis` helper function to make a request to Redis using the
  `smembers` command to retrieve all the members of a Redis set with the key
  `user:${session.user.id}:incoming_friend_requests`. The result is then cast as an array of strings
  using the `as` keyword and stored in the `incomingSenderIds` constant. */
  const incomingSenderIds = (await fetchRedis(
    "smembers",
    `user:${session.user.id}:incoming_friend_requests`
  )) as string[];

  /* This code is fetching information about incoming friend requests for the current user from Redis,
  a key-value store. It first retrieves a list of sender IDs for incoming friend requests from Redis
  using the `smembers` command. It then maps over this list of sender IDs using the `map` function
  to create an array of promises that will fetch information about each sender. */
  const incomingFriendRequests = await Promise.all(
    incomingSenderIds.map(async (senderId) => {
        const sender = await fetchRedis('get', `user:${senderId}`) as string;
        const senderParsed = JSON.parse(sender) as User;
        return {
            senderId,
            senderEmail: senderParsed.email
        }
    })
  )
  
  return (
    <main className='pt-8'>
        <h1 className='font-bold text-5xl mb-8'>Friend requests</h1>
        <div className='flex flex-col gap-4'>
            <FriendRequests incomingFriendRequests={incomingFriendRequests} sessionId={session.user.id}/>
        </div>
    </main>
  )
}

export default page