/// <reference types="vite/client" />

declare module '@3d-dice/dice-box' {
  export interface DiceResult {
    groupId: number;
    rollId: number;
    sides: number;
    dieType: string;
    theme: string;
    themeColor: string;
    value: number;
  }
  export interface DiceBoxConfig {
    container?: string;
    assetPath?: string;
    theme?: string;
    themeColor?: string;
    scale?: number;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    angularDamping?: number;
    linearDamping?: number;
    spinForce?: number;
    throwForce?: number;
    startingHeight?: number;
    settleTimeout?: number;
    offscreen?: boolean;
    delay?: number;
    lightIntensity?: number;
    enableShadows?: boolean;
    shadowTransparency?: number;
  }
  export interface RollGroup {
    qty: number;
    sides: number;
    themeColor?: string;
    modifier?: number;
  }
  export default class DiceBox {
    constructor(config?: DiceBoxConfig);
    init(): Promise<void>;
    roll(notation: string | string[] | RollGroup | RollGroup[]): Promise<DiceResult[]>;
    add(notation: string | RollGroup | RollGroup[]): Promise<DiceResult[]>;
    clear(): void;
    hide(): DiceBox;
    show(): DiceBox;
    onRollComplete: (results: DiceResult[]) => void;
    onRollResult: (result: DiceResult) => void;
  }
}
