import { describe, expect, it } from 'vitest';
import { cleanText, filterText, isUsernameBlocked } from '@/lib/contentFilter';
import { prepareMessageBody } from '@/lib/messages';
import { validateSignupForm } from '@/lib/auth';

describe('filtro de conteúdo impróprio', () => {
  it('troca palavrões por "######"', () => {
    expect(filterText('que porra é essa')).toEqual({ text: 'que ###### é essa', categories: ['profanity'] });
  });

  it('troca violência extrema por "########"', () => {
    expect(filterText('vou te decapitar')).toEqual({ text: 'vou te ########', categories: ['violence'] });
  });

  it('troca conteúdo sexual por "#######"', () => {
    expect(filterText('manda nudes aí')).toEqual({ text: '####### aí', categories: ['sexual'] });
  });

  it('pega palavras disfarçadas com números, acentos, letras repetidas ou separadas', () => {
    expect(cleanText('P0RRAAAA')).toBe('######');
    expect(cleanText('p u t a')).toBe('######');
    expect(cleanText('PORNÔ')).toBe('#######');
  });

  it('não mexe em palavras normais que só parecem proibidas', () => {
    expect(cleanText('computador, cultura e o que rola hoje')).toBe('computador, cultura e o que rola hoje');
  });

  it('filtra a mensagem do chat antes de enviar e avisa o que achou', () => {
    expect(prepareMessageBody('  sua merda  ')).toEqual({ body: 'sua ######', filtered: ['profanity'] });
    expect(prepareMessageBody('oi!')).toEqual({ body: 'oi!', filtered: [] });
  });

  it('recusa nomes de usuário com conteúdo proibido, mesmo escondido', () => {
    expect(isUsernameBlocked('xx_p0rra_xx')).toBe(true);
    expect(isUsernameBlocked('nexoria')).toBe(false);
    expect(validateSignupForm({ username: 'caralhoboy', password: '12345678', confirmPassword: '12345678' }).username).toEqual({
      key: 'usernameBlocked',
    });
  });
});
