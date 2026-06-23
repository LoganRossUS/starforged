/// <reference types="vite/client" />

declare module '@3d-dice/dice-box-threejs' {
  export interface DiceColorset {
    foreground?: string | string[];
    background?: string | string[];
    outline?: string;
    edge?: string;
    texture?: string;
    material?: string;
  }
  export interface DiceBoxConfig {
    assetPath?: string;
    framerate?: number;
    sounds?: boolean;
    volume?: number;
    shadows?: boolean;
    theme_surface?: string;
    theme_customColorset?: DiceColorset | null;
    theme_colorset?: string;
    theme_texture?: string;
    theme_material?: string;
    gravity_multiplier?: number;
    light_intensity?: number;
    baseScale?: number;
    strength?: number;
    onRollComplete?: (results: unknown) => void;
  }
  export default class DiceBox {
    constructor(container: string, config?: DiceBoxConfig);
    initialize(): Promise<void>;
    // Predetermined notation, e.g. "1d6+2d10@4,7,2" lands the dice on 4, 7, 2.
    roll(notation: string): Promise<unknown>;
    clearDice(): void;
  }
}
