import {Geom3} from '@jscad/modeling/src/geometries/types';
import {booleans, primitives, transforms} from '@jscad/modeling';
import {addColor, Cacheable, Centered, halfToFull, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {cylinder} from '@jscad/modeling/src/primitives';
import {mirrorZ} from '@jscad/modeling/src/operations/transforms';
import {commonSizeValue} from './common';
import {hull} from '@jscad/modeling/src/operations/hulls';

const {cuboid, sphere} = primitives;
const {translateZ, translateX, translateY, translate} = transforms;
const {union, subtract} = booleans;

export class MainBoard extends Cacheable implements Viewable {
  public readonly xiao = new XiaoBoard();
  public readonly baseWidth = 22;
  public readonly baseHeight = 60;
  public readonly baseThickness = 1.5;

  public readonly legBottomHeight = 2;
  public readonly screwHoleDistance = 40;

  public get displayName(): string {
    return 'MainBoard';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'baseHalf', model: () => this.baseHalf},
        {label: 'half', model: () => this.half},
        {label: 'full', model: () => this.full},
        {label: 'fullWithSwitchSupport', model: () => this.fullWithSwitchSupport},
        {label: 'testBoard', model: () => this.testBoard},
      ];
    });
  }

  public get maxZ(): number {
    return this.xiao.height;
  }

  public get height(): number {
    return legacyCash(this, 'height', () => {
      const height = this.xiao.height + this.baseThickness + this.legBottomHeight;
      // console.log('mainboard height', height);
      return height;
    });
  }

  public get baseHalf(): Geom3 {
    return addColor(
      [0, 0.6, 0, 0.9],
      subtract(
        Centered.cuboid([this.baseHeight, this.baseWidth / 2, this.baseThickness]),
        cylinder({
          radius: 1.7,
          height: this.baseThickness,
          center: [this.screwHoleDistance, 0, this.baseThickness / 2],
        }),
      ),
    );
  }

  private get legBottomHalf(): Geom3 {
    return addColor(
      [0.8, 0.8, 0.8],
      Centered.cuboid([this.xiao.boardHeight, this.xiao.legThickness, this.legBottomHeight]),
    );
  }

  public get half(): Geom3[] {
    return [
      this.baseHalf,
      ...this.xiao.half.map((g) => this.transformXiao(g)),
      translate([0, this.xiao.legDistanceFromCenter, this.baseThickness], this.legBottomHalf),
    ].map((g) => mirrorZ(g));
  }

  public transformXiao(g: Geom3): Geom3 {
    return translateZ(-this.xiao.legLength, g);
  }

  public get full(): Geom3[] {
    return halfToFull(this.half);
  }

  public get fullWithSwitchSupport(): Geom3[] {
    return [...this.full, ...this.xiao.switchSupport.map((g) => mirrorZ(this.transformXiao(g)))];
  }

  public get testBoard(): Geom3[] {
    const hagasuTokkakari = cuboid({size: [10, 1, 0.8], center: [this.baseHeight / 2, this.baseWidth / 2 - 0.5, -0.4]});
    const legHoleWidth = 0.8;
    const legHoleLength = this.xiao.boardHeight;
    const legHole = translate(
      [0.6, this.xiao.boardWidth / 2 - this.xiao.legThickness / 2 - legHoleWidth / 2, -this.baseThickness],
      Centered.cuboid([legHoleLength - 1.2, legHoleWidth, this.baseThickness]),
    );
    const half = subtract(mirrorZ(this.baseHalf), hagasuTokkakari, legHole);
    return [addColor([0, 0.6, 0], union(halfToFull([half])))];
  }
}

class XiaoBoard {
  public readonly boardWidth = 17.5;
  public readonly boardHeight = 20.5;
  public readonly boardThickness = 1;

  public readonly usbLength = 7;
  public readonly usbHeight = 3;
  public readonly usbWidth = 8.6;
  public readonly usbProtrusion = 1.2;

  public readonly mainChipWidth = 12;
  public readonly mainChipHeight = 10.5;
  public readonly mainChipThickness = 1.5;
  public readonly mainChipDistanceFromBoardEnd = 7;

  public readonly legLength = 10.7;
  public readonly legThickness = 2;

  public get height(): number {
    return this.legLength + this.usbHeight + this.boardThickness;
  }

  public get legDistanceFromCenter(): number {
    return this.boardWidth / 2 - this.legThickness;
  }

  // 10.7 足の長さ

  public get baseHalf(): Geom3 {
    return addColor(
      [0.3, 0.3, 0.3],
      translateZ(-this.boardThickness, Centered.cuboid([this.boardHeight, this.boardWidth / 2, this.boardThickness])),
    );
  }

  public get usbHalf(): Geom3 {
    return addColor(
      [0.7, 0.7, 0.7],
      translateZ(
        -this.usbHeight - this.boardThickness,
        Centered.cuboid([this.usbLength, this.usbWidth / 2, this.usbHeight]),
      ),
    );
  }

  public get mainChipHalf(): Geom3 {
    return addColor(
      [0.9, 0.9, 0.9],
      translateZ(
        -this.mainChipThickness - this.boardThickness,
        Centered.cuboid([this.mainChipHeight, this.mainChipWidth / 2, this.mainChipThickness]),
      ),
    );
  }

  public get legHalf(): Geom3 {
    return addColor([0.1, 0.1, 0.1], Centered.cuboid([this.boardHeight, this.legThickness, this.legLength]));
  }

  public get half(): Geom3[] {
    return [
      this.baseHalf,
      translateX(-this.usbProtrusion, this.usbHalf),
      translateX(this.mainChipDistanceFromBoardEnd, this.mainChipHalf),
      translateY(this.legDistanceFromCenter, this.legHalf),
    ];
  }

  public get switchSupport(): Geom3[] {
    const baseThickness = 1;
    const chipMargin = 0.5;
    const baseZ = -this.boardThickness - this.mainChipThickness - chipMargin;
    const innerMargin = 0.5;
    const wallThickness = 1;
    // const wallHeight = this.legLength - baseZ + baseThickness;
    const wallHeight = 6;
    const wallLength = this.mainChipDistanceFromBoardEnd + this.mainChipHeight - 3;
    const bridgeLength = this.boardWidth + innerMargin * 2 + wallThickness * 2;
    const bridgeWidth = 4;

    return [
      addColor(
        [0.2, 0.2, 0.8],
        union(
          cuboid({
            size: [bridgeWidth, bridgeLength, baseThickness],
            center: [wallLength - bridgeWidth / 2, 0, baseZ - baseThickness / 2],
          }),
          hull(
            cuboid({
              size: [bridgeWidth, 1, baseThickness],
              center: [wallLength - bridgeWidth / 2, 0, baseZ - baseThickness / 2],
            }),
            cuboid({
              size: [11, wallThickness, baseThickness],
              center: [
                wallLength - 11 / 2,
                -this.boardWidth / 2 - wallThickness / 2 - innerMargin,
                baseZ - baseThickness / 2,
              ],
            }),
          ),

          // 壁
          cuboid({
            size: [wallLength, wallThickness, wallHeight],
            center: [
              wallLength / 2,
              -this.boardWidth / 2 - wallThickness / 2 - innerMargin,
              baseZ + wallHeight / 2 - baseThickness,
            ],
          }),
          cuboid({
            size: [bridgeWidth, wallThickness, wallHeight],
            center: [
              wallLength - bridgeWidth / 2,
              this.boardWidth / 2 + wallThickness / 2 + innerMargin,
              baseZ + 8 / 2 - baseThickness,
            ],
          }),

          // 押すときの支点
          cuboid({
            size: [bridgeWidth, 2, chipMargin],
            center: [wallLength - bridgeWidth - 1, -this.mainChipWidth / 2 + 0.5, baseZ + chipMargin / 2],
          }),

          // ボタンを押す部分
          cuboid({
            size: [6, 11, baseThickness],
            center: [this.boardHeight - 6 / 2 - 2, 0, baseZ - baseThickness / 2],
          }),
          cuboid({
            size: [2, 3, 0.6],
            center: [this.boardHeight - 2 / 2, 4, baseZ + 0.6 / 2],
          }),
          hull(
            cuboid({
              size: [wallThickness, 3, 0.0001],
              center: [this.boardHeight + wallThickness / 2, 4, baseZ],
            }),
            cuboid({
              size: [0.0001, 3, 1],
              center: [this.boardHeight - 2, 4, baseZ - 1 / 2],
            }),
          ),

          // ボタンを押す部分の先にあるひっかかり
          cuboid({
            size: [wallThickness, 3, 3],
            center: [this.boardHeight + wallThickness / 2, 4, baseZ + 3 / 2],
          }),
        ),
      ),
    ];
  }

  public get switchSupportOld2(): Geom3[] {
    const baseThickness = 1;
    const chipMargin = 0.5;
    const innerMargin = 0.5;
    const wallThickness = 0.8;
    const baseZ = -this.boardThickness - this.mainChipThickness - chipMargin;
    const width = this.boardWidth + (innerMargin + wallThickness) * 2;
    const baseLength = 8;
    const rightWallLength = 13;
    const leftWallLength = baseLength;
    const wallHeight = 10;
    const maxX = this.boardHeight + innerMargin + wallThickness;
    const backWallWidth = 4;
    return [
      addColor(
        [0.2, 0.2, 0.8],
        union(
          cuboid({
            size: [baseLength, width, baseThickness],
            center: [maxX - baseLength / 2, 0, baseZ - baseThickness / 2],
          }),

          hull(
            cuboid({
              size: [baseLength, 1, baseThickness],
              center: [maxX - baseLength / 2, 0, baseZ - baseThickness / 2],
            }),
            cuboid({
              size: [rightWallLength, 3, baseThickness],
              center: [maxX - rightWallLength / 2, -width / 2 + 3 / 2, baseZ - baseThickness / 2],
            }),
          ),

          // 右壁
          cuboid({
            size: [rightWallLength, wallThickness, wallHeight],
            center: [
              maxX - rightWallLength / 2,
              -this.boardWidth / 2 - wallThickness / 2 - innerMargin,
              baseZ + wallHeight / 2 - baseThickness,
            ],
          }),

          // 左壁
          cuboid({
            size: [leftWallLength, wallThickness, wallHeight],
            center: [
              maxX - leftWallLength / 2,
              this.boardWidth / 2 + wallThickness / 2 + innerMargin,
              baseZ + wallHeight / 2 - baseThickness,
            ],
          }),

          // 押すときの支点
          cuboid({
            size: [4, 2, chipMargin],
            center: [this.boardHeight - 4 / 2 - 6, -this.mainChipWidth / 2 + 0.5, baseZ + chipMargin / 2],
          }),

          // ボタンを押す部分
          cuboid({
            size: [2, 3, 1],
            center: [this.boardHeight - 2 / 2, 4, baseZ + 1 / 2],
          }),
        ),
      ),
      addColor(
        [0.2, 0.2, 0.6, 0.5],
        union(
          // 右後壁
          cuboid({
            size: [wallThickness, backWallWidth, wallHeight],
            center: [
              maxX - wallThickness / 2,
              -(this.boardWidth / 2 - backWallWidth / 2 + innerMargin + wallThickness),
              baseZ + wallHeight / 2 - baseThickness,
            ],
          }),

          // 左後壁
          cuboid({
            size: [wallThickness, backWallWidth, wallHeight],
            center: [
              maxX - wallThickness / 2,
              this.boardWidth / 2 - backWallWidth / 2 + innerMargin + wallThickness,
              baseZ + wallHeight / 2 - baseThickness,
            ],
          }),
        ),
      ),
    ];
  }

  public get switchSupportOld(): Geom3[] {
    const baseThickness = 1;
    const chipMargin = 0.5;
    const baseZ = -this.boardThickness - this.mainChipThickness - chipMargin;
    const innerMargin = 0.5;
    const wallThickness = 1.5;
    const wallHeight = this.legLength - baseZ + baseThickness;
    const wallLength = this.mainChipDistanceFromBoardEnd + this.mainChipHeight;
    const bridgeLength = this.boardWidth + innerMargin * 2 + wallThickness * 2;
    const bridgeWidth = 4;
    const gripSideWallDistance = commonSizeValue.gripWidth / 2 - commonSizeValue.gripSideThickness + 0.5;

    return [
      addColor(
        [0.2, 0.2, 0.8],
        union(
          cuboid({
            size: [bridgeWidth, bridgeLength, baseThickness],
            center: [wallLength - bridgeWidth / 2, 0, baseZ - baseThickness / 2],
          }),
          hull(
            cuboid({
              size: [bridgeWidth, bridgeLength, baseThickness],
              center: [wallLength - bridgeWidth / 2, 0, baseZ - baseThickness / 2],
            }),
            cuboid({
              size: [10, wallThickness, baseThickness],
              center: [
                wallLength - 10 / 2,
                -this.boardWidth / 2 - wallThickness / 2 - innerMargin,
                baseZ - baseThickness / 2,
              ],
            }),
          ),

          // 壁
          cuboid({
            size: [wallLength, wallThickness, wallHeight],
            center: [
              wallLength / 2,
              -this.boardWidth / 2 - wallThickness / 2 - innerMargin,
              baseZ + wallHeight / 2 - baseThickness,
            ],
          }),

          // グリップの壁と接する部分
          hull(
            translate(
              [0, -gripSideWallDistance, this.legLength - 1],
              Centered.cuboid([wallLength, gripSideWallDistance - bridgeLength / 2, 1]),
            ),
            translate([0, -bridgeLength / 2, this.legLength - 5], Centered.cuboid([wallLength, wallThickness, 5])),
          ),

          // 押すときの支点
          cuboid({
            size: [bridgeWidth, 2, chipMargin],
            center: [wallLength - bridgeWidth - 2, -this.mainChipWidth / 2 + 0.5, baseZ + chipMargin / 2],
          }),

          // ボタンを押す部分
          cuboid({
            size: [bridgeWidth, 8, baseThickness],
            center: [this.boardHeight - bridgeWidth / 2, 2, baseZ - baseThickness / 2],
          }),
          cuboid({
            size: [2, 3, 1],
            center: [this.boardHeight - 2 / 2, 4, baseZ + 1 / 2],
          }),

          // 支えるのとは反対側の引っ掛かり部分
          cuboid({
            size: [bridgeWidth, wallThickness, 8],
            center: [
              wallLength - bridgeWidth / 2,
              this.boardWidth / 2 + wallThickness / 2 + innerMargin,
              baseZ + 8 / 2 - baseThickness,
            ],
          }),
        ),
      ),
    ];
  }
}
