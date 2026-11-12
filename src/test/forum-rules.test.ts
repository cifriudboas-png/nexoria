import { describe, expect, it } from 'vitest';
import { canDeleteForumEntry, canEditForumEntry, prepareForumPost, prepareForumReply } from '@/lib/forum';

describe('fóruns', () => {
  it('publica o título e o texto sem espaços sobrando', () => {
    expect(prepareForumPost('  Dicas de Pizza Tycoon  ', '  comprem o forno grande ')).toEqual({
      title: 'Dicas de Pizza Tycoon',
      body: 'comprem o forno grande',
      filtered: [],
    });
  });

  it('recusa título com menos de 3 caracteres ou mais de 100', () => {
    expect(prepareForumPost('oi', 'texto')).toEqual({ error: 'forumTitleTooShort' });
    expect(prepareForumPost('a'.repeat(101), 'texto')).toEqual({ error: 'forumTitleTooLong' });
  });

  it('recusa post vazio ou com mais de 5000 caracteres', () => {
    expect(prepareForumPost('Título', '   ')).toEqual({ error: 'forumBodyEmpty' });
    expect(prepareForumPost('Título', 'a'.repeat(5001))).toEqual({ error: 'forumPostTooLong' });
  });

  it('recusa resposta vazia ou com mais de 2000 caracteres', () => {
    expect(prepareForumReply('  ')).toEqual({ error: 'forumBodyEmpty' });
    expect(prepareForumReply('a'.repeat(2001))).toEqual({ error: 'forumReplyTooLong' });
  });

  it('filtra palavrões, violência extrema e conteúdo sexual no post e nas respostas', () => {
    expect(prepareForumPost('que porra', 'vou te decapitar e manda nudes')).toEqual({
      title: 'que ######',
      body: 'vou te ######## e #######',
      filtered: ['profanity', 'violence', 'sexual'],
    });
    expect(prepareForumReply('sua merda')).toEqual({ body: 'sua ######', filtered: ['profanity'] });
  });

  it('só o autor edita; o autor ou um admin exclui', () => {
    expect(canEditForumEntry('ana', 'ana')).toBe(true);
    expect(canEditForumEntry('ana', 'bia')).toBe(false);
    expect(canDeleteForumEntry('ana', 'ana', false)).toBe(true);
    expect(canDeleteForumEntry('ana', 'bia', false)).toBe(false);
    expect(canDeleteForumEntry('ana', 'bia', true)).toBe(true);
    expect(canEditForumEntry('ana', null)).toBe(false);
  });
});
