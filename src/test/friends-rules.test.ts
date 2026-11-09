import { describe, expect, it } from 'vitest';
import { friendButtonLabel, toFriendStatus } from '@/lib/friends';

describe('friend button on profiles', () => {
  it('offers "send friend request" on a stranger\'s profile', () => {
    expect(friendButtonLabel('none')).toBe('friendSendRequest');
  });

  it('shows no friend button on your own profile', () => {
    expect(friendButtonLabel('self')).toBeNull();
  });

  it('offers to accept when the other player already asked', () => {
    expect(friendButtonLabel('incoming')).toBe('friendAcceptRequest');
  });

  it('shows the request as sent while waiting for an answer', () => {
    expect(friendButtonLabel('outgoing')).toBe('friendRequestSent');
  });

  it('treats an unknown status from the server as "not friends"', () => {
    expect(toFriendStatus('weird')).toBe('none');
    expect(toFriendStatus('friends')).toBe('friends');
  });
});
