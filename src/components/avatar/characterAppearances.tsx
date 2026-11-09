export type CharacterLook = 'starter' | 'guest';

export type CharacterAppearance = {
  skin: string;
  shirt: string;
  sleeve: string;
  pants: string;
};

export const CHARACTER_APPEARANCES: Record<CharacterLook, CharacterAppearance> = {
  starter: {
    skin: '#F5BE1E',
    shirt: '#2E9E4A',
    sleeve: '#F5BE1E',
    pants: '#8D9299',
  },
  guest: {
    skin: '#F4EFE9',
    shirt: '#3A3D42',
    sleeve: '#3A3D42',
    pants: '#141414',
  },
};
