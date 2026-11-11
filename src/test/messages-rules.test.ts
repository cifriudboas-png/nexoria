import { describe, expect, it } from 'vitest';
import { isInConversation, mergeMessage, prepareMessageBody, type ChatMessage } from '@/lib/messages';

const message = (id: string, senderId: string, recipientId: string, createdAt: string): ChatMessage => ({
  id,
  senderId,
  recipientId,
  body: 'oi',
  createdAt,
  readAt: null,
});

describe('chat between players', () => {
  it('sends the trimmed text', () => {
    expect(prepareMessageBody('  olá!  ')).toEqual({ body: 'olá!', filtered: [] });
  });

  it('refuses an empty message', () => {
    expect(prepareMessageBody('   ')).toEqual({ error: 'messagesEmpty' });
  });

  it('refuses a message that is too long', () => {
    expect(prepareMessageBody('a'.repeat(501))).toEqual({ error: 'messagesTooLong' });
  });

  it('only shows a live message in the chat between those two players', () => {
    const fromBob = message('1', 'bob', 'me', '2026-11-10T10:00:00Z');
    expect(isInConversation(fromBob, 'me', 'bob')).toBe(true);
    expect(isInConversation(fromBob, 'me', 'carol')).toBe(false);
  });

  it('does not show the same message twice and keeps the oldest first', () => {
    const first = message('1', 'me', 'bob', '2026-11-10T10:00:00Z');
    const second = message('2', 'bob', 'me', '2026-11-10T10:01:00Z');
    const list = mergeMessage(mergeMessage([second], first), first);
    expect(list.map((m) => m.id)).toEqual(['1', '2']);
  });
});
