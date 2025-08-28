import { parse } from 'yaml';
import type { GameDSL } from './schema';

import easyRaw from '../configs/easy.yaml?raw';
import normalRaw from '../configs/normal.yaml?raw';
import hardRaw from '../configs/hard.yaml?raw';

const configs: Record<string, string> = {
  easy: easyRaw,
  normal: normalRaw,
  hard: hardRaw,
};

export function loadDSL(): GameDSL {
  const urlParams = new URLSearchParams(window.location.search);
  const level = urlParams.get('level') || 'normal';
  
  const configRaw = configs[level] || configs['normal'];
  const config = parse(configRaw) as GameDSL;
  
  return config;
}