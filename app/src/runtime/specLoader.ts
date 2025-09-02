import type { GameSpec } from '../schema/types';

export async function getSpec(name: string): Promise<GameSpec> {
  try {
    // First try to fetch from public specs directory
    const response = await fetch(`/specs/${name}.json`);
    if (response.ok) {
      const spec = await response.json();
      console.log(`Loaded spec '${name}' from /specs/`);
      return spec as GameSpec;
    }
    
    // If fetch fails, fall back to bundled schema
    console.log(`Spec '${name}' not found in /specs/, trying bundled schema...`);
  } catch (error) {
    console.warn(`Failed to fetch spec '${name}' from /specs/:`, error);
  }
  
  // Fallback to bundled schema files
  try {
    const specModule = await import(`../schema/${name}.json`);
    const spec = specModule.default as GameSpec;
    console.log(`Loaded spec '${name}' from bundled schema`);
    return spec;
  } catch (error) {
    console.error(`Failed to load spec '${name}' from both /specs/ and bundled schema:`, error);
    throw new Error(`Spec '${name}' not found`);
  }
}