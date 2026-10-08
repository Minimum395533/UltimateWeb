import type { Character, CharacterColor } from '../types';

// Captain Falcon color presets (9 colors matching Ultimate)
export const captainFalconColors: CharacterColor[] = [
  { index: 0, name: 'Default', primaryColor: '#0066CC', secondaryColor: '#FFFFFF' },
  { index: 1, name: 'Red', primaryColor: '#CC0000', secondaryColor: '#FFFFFF' },
  { index: 2, name: 'Blue', primaryColor: '#003399', secondaryColor: '#FFFFFF' },
  { index: 3, name: 'Black', primaryColor: '#000000', secondaryColor: '#FFFFFF' },
  { index: 4, name: 'Green', primaryColor: '#009900', secondaryColor: '#FFFFFF' },
  { index: 5, name: 'White', primaryColor: '#FFFFFF', secondaryColor: '#0066CC' },
  { index: 6, name: 'Yellow', primaryColor: '#FFCC00', secondaryColor: '#000000' },
  { index: 7, name: 'Purple', primaryColor: '#9900CC', secondaryColor: '#FFFFFF' },
  { index: 8, name: 'Orange', primaryColor: '#FF6600', secondaryColor: '#000000' },
];

export const captainFalcon: Character = {
  id: 'captain_falcon',
  name: 'captain_falcon',
  displayName: 'Captain Falcon',
  colorOptions: captainFalconColors,
};

// All available characters
export const characters: Character[] = [
  captainFalcon,
];

export function getCharacterById(id: string): Character | undefined {
  return characters.find(c => c.id === id);
}

export function getColorByIndex(character: Character, index: number): CharacterColor | undefined {
  return character.colorOptions.find(c => c.index === index);
}
