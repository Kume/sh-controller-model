import {Geom3} from '@jscad/modeling/src/geometries/types';

class SwitchJoyStick {
  public readonly baseWidth = 19;
  public readonly baseHeight = 21;
  public readonly baseThickness = 5;
  public readonly baseYOffset = 0.5;
  public readonly stickHeight = 10;
  public readonly stickRadius = 2;
  public readonly stickTopThickness = 5;
  public readonly stickTopRadius = 16;

  public get stick(): Geom3 {}

  public get stickTop(): Geom3 {}
}
