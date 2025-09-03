import { validateGameSpec, type GameSpec, type ValidationResult } from '../schema/validator';

export type SpecLoadResult = {
  spec: GameSpec;
  source: 'remote' | 'local' | 'fallback';
  validation: ValidationResult<GameSpec>;
  url?: string;
};

export async function getSpec(name: string): Promise<SpecLoadResult> {
  const base = (import.meta as any).env?.BASE_URL || "/";
  const url = `${base}specs/${encodeURIComponent(name)}.json`;
  
  // Try to fetch from remote
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const jsonData = await res.json();
      const validation = validateGameSpec(jsonData);
      
      if (validation.success) {
        return {
          spec: validation.data,
          source: 'remote',
          validation,
          url
        };
      } else {
        // Validation failed, use fallback but show warning
        console.warn(`Remote spec validation failed for ${name}:`, validation.error);
        return {
          spec: validation.fallback,
          source: 'fallback',
          validation,
          url
        };
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch spec from ${url}:`, error);
  }
  
  // Try local fallback (dev/404)
  if (name === "example") {
    try {
      const localSpec = (await import("../schema/example.json")).default;
      const validation = validateGameSpec(localSpec);
      
      if (validation.success) {
        return {
          spec: validation.data,
          source: 'local',
          validation
        };
      } else {
        // Even local spec is invalid, use fallback
        console.warn(`Local spec validation failed for ${name}:`, validation.error);
        return {
          spec: validation.fallback,
          source: 'fallback',
          validation
        };
      }
    } catch (error) {
      console.warn(`Failed to load local spec for ${name}:`, error);
    }
  }
  
  // Ultimate fallback - use default spec
  const validation = validateGameSpec({});
  console.warn(`Using fallback spec for ${name} - no valid spec found`);
  
  return {
    spec: validation.success ? validation.data : validation.fallback,
    source: 'fallback',
    validation: {
      success: false,
      error: `Spec not found: ${url}`,
      fallback: validation.success ? validation.data : validation.fallback
    }
  };
}