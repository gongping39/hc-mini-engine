import { z } from 'zod';

// Zod schema for GameSpec validation
export const GameSpecSchema = z.object({
  title: z.string().optional().default('Untitled Game'),
  gameLoop: z.literal('runner'),
  scrollSpeed: z.number().positive().default(200),
  gravity: z.number().positive().default(1200),
  jumpForce: z.number().positive().default(400),
  artStyle: z.object({
    theme: z.string().optional().default('default'),
    sfx: z.enum(['arcade', 'none']).optional().default('arcade')
  }).optional().default(() => ({ theme: 'default', sfx: 'arcade' as const })),
  player: z.object({
    hitbox: z.tuple([z.number().positive(), z.number().positive()]).optional().default([32, 32]),
    jumpBufferMs: z.number().nonnegative().optional().default(150)
  }).optional().default(() => ({ hitbox: [32, 32] as [number, number], jumpBufferMs: 150 })),
  obstacle: z.object({
    spawnRate: z.number().positive(),
    gapMin: z.number().nonnegative().optional().default(100),
    gapMax: z.number().nonnegative().optional().default(200)
  }).optional(),
  levelSections: z.array(
    z.object({
      len: z.number().positive(),
      density: z.number().nonnegative(),
      boost: z.boolean().optional().default(false)
    })
  ).optional()
});

// Type inference from zod schema
export type GameSpec = z.infer<typeof GameSpecSchema>;

// Default GameSpec for fallback
export const DEFAULT_GAME_SPEC: GameSpec = {
  title: 'Example Game',
  gameLoop: 'runner',
  scrollSpeed: 200,
  gravity: 1200,
  jumpForce: 400,
  artStyle: {
    theme: 'default',
    sfx: 'arcade'
  },
  player: {
    hitbox: [32, 32],
    jumpBufferMs: 150
  },
  obstacle: {
    spawnRate: 100,
    gapMin: 100,
    gapMax: 200
  },
  levelSections: [
    { len: 1000, density: 0.5, boost: false },
    { len: 2000, density: 0.7, boost: true }
  ]
};

// Validation result type
export type ValidationResult<T> = 
  | { success: true; data: T; warning?: string }
  | { success: false; error: string; fallback: T };

// Safe parse function with fallback
export function validateGameSpec(data: unknown): ValidationResult<GameSpec> {
  try {
    const result = GameSpecSchema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errorDetails = result.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      
      console.warn('GameSpec validation failed:', errorDetails);
      
      return {
        success: false,
        error: `Invalid GameSpec: ${errorDetails}`,
        fallback: DEFAULT_GAME_SPEC
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    console.warn('GameSpec validation error:', errorMessage);
    
    return {
      success: false,
      error: `Validation error: ${errorMessage}`,
      fallback: DEFAULT_GAME_SPEC
    };
  }
}