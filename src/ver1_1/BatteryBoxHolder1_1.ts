import {Cacheable, cacheGetter, Centered, chamfer, halfToFull, hexagon} from '../utls';
import {Viewable, ViewerItem} from '../types';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {Skeleton} from './Skeleton';
import {circle, cuboid, cylinder, polygon, rectangle} from '@jscad/modeling/src/primitives';
import {
  mirrorX,
  mirrorY,
  mirrorZ,
  rotateX,
  rotateY,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {Screw} from '../Screw';

const coverCollisionOffset = 0.3;

const screwLength = 6;

export class BatteryBoxHolder1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.BatteryBoxHolder;
  public readonly screw = new Screw(screwLength, 2.5, (g) =>
    this.sk.transformTailNat.applyGeom(mirrorZ(translateZ(screwLength - Skeleton.Common.Nat.z, g))),
  );

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'looseOutlineHalf', model: () => this.looseOutlineHalfBase},
      {label: 'half', model: () => this.half},
      {label: 'full', model: () => this.full},
      {label: 'coverHalf', model: () => this.coverHalf},
      {label: 'coverOutlineHalf', model: () => this.coverOutlineHalf},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  @cacheGetter
  public get full(): Geom3[] {
    return [
      subtract(
        union(
          halfToFull(this.half),

          // ケーブルフック
          translateY(
            this.sk.y.tailToHeadForCableHook.valueAt('hookStart'),
            this.geom3FromSidePlane(
              polygon({
                points: [
                  [this.sk.x.tailToHeadForCableHook.valueAt('hookStart'), 0],
                  [this.sk.x.tailToHeadForCableHook.valueAt('hookNanameEnd'), -this.sk.z.cableHook],
                  [this.sk.x.tailToHeadForCableHook.valueAt('hookEnd'), -this.sk.z.cableHook],
                  [this.sk.x.tailToHeadForCableHook.valueAt('hookEnd'), -this.sk.z.cableHook / 2],
                  [this.sk.x.tailToHeadForCableHook.valueAt('hookCutoffStart'), -this.sk.z.cableHook / 2],
                  [this.sk.x.tailToHeadForCableHook.valueAt('hookCutoffStart'), 0],
                ],
              }),
              this.sk.y.tailToHeadForCableHook.totalFromTo('hookStart', 'hookEnd'),
            ),
          ),
        ),
        this.innerFull,
        // 面取り
        rotateY(
          Math.PI / 2,
          union(
            chamfer(
              rectangle({
                size: [this.sk.z.bottomToTop.valueAt('batteryBoxBase'), this.sk.y.total],
                center: [-this.sk.z.bottomToTop.valueAt('batteryBoxBase') / 2, 0],
              }),
              1,
            ),
          ),
        ),
        // 対で印刷するときに面するケーブルフックが来るところのスペースを開けておく
        translate(
          [
            this.sk.x.tailToHeadForCableHook.valueAt('hookStart') - 0.5,
            -this.sk.y.tailToHeadForCableHook.valueAt('hookEnd') - 0.5,
            0,
          ],
          Centered.cuboid([
            this.sk.x.tailToHeadForCableHook.totalFromTo('hookStart', 'hookEnd') + 1,
            this.sk.y.tailToHeadForCableHook.totalFromTo('hookStart', 'hookEnd') + 1,
            0.5,
          ]),
        ),
      ),

      ...this.screw.outline,
    ];
  }

  /**
   * fullに対して更に削る部分 = 中央部分 & 左右非対称部分
   */
  @cacheGetter
  public get innerFull(): Geom3[] {
    const cableGrooveWidth = this.sk.y.cableGrooveSeq.totalFromTo('grooveStart', 'grooveEnd');
    const innereXEnd = this.sk.x.tailToHead.valueAt('batteryBoxStart');
    const yGrooveStart = this.sk.y.cableGrooveSeq.valueAt('grooveStart');
    const grooveHeadYOffset = this.sk.y.cableGrooveSeq.totalFromTo('grooveEnd', 'bottomGrooveEnd');
    const bottomGrooveLength = this.sk.x.collisionAvoidanceHole.valueAt('holeStart') - 0.5;
    return [
      translate(
        [innereXEnd - this.sk.x.cableGroove, yGrooveStart, 0],
        Centered.cuboid([this.sk.x.cableGroove, cableGrooveWidth, this.sk.z.cableGroove]),
      ),
      extrudeLinear(
        {
          height: this.sk.z.bottomToTop.valueAt('bottomWallEnd'),
        },
        union(
          polygon({
            points: [
              [innereXEnd, yGrooveStart],
              [bottomGrooveLength, yGrooveStart + grooveHeadYOffset],
              [bottomGrooveLength + 5, yGrooveStart + grooveHeadYOffset],
              [bottomGrooveLength + 5, yGrooveStart + cableGrooveWidth + grooveHeadYOffset],
              [bottomGrooveLength, yGrooveStart + cableGrooveWidth + grooveHeadYOffset],
              [innereXEnd, yGrooveStart + cableGrooveWidth],
            ],
          }),
          translate(
            [this.sk.x.collisionAvoidanceHole.valueAt('holeStart') + 1.9999, this.sk.y.collisionAvoidanceHole / 2],
            Centered.rectangle([this.sk.x.collisionAvoidanceHole.totalFromTo('holeStart', 'holeEnd') - 2, 6]),
          ),
        ),
      ),
      this.sk.transformTailNat.applyGeom(
        extrudeLinear(
          {height: Skeleton.Common.Nat.z + this.sk.other.natOffset + 10},
          hexagon(Skeleton.Common.Nat.radius + this.sk.other.natOffset),
        ),
      ),
      this.sk.transformTailNat.applyGeom(cylinder({radius: 1.7, height: 99})),
    ];
  }

  @cacheGetter
  public get half(): Geom3[] {
    return [subtract(this.outlineHalf, this.innerHalf), ...this.headJointHalf];
  }

  @cacheGetter
  public get innerHalf(): Geom3[] {
    const bottomFaceHeight = this.sk.z.bottomToTop.totalFromTo('bottomWallEnd', 'topWallStart');
    const radius = this.sk.BatteryBox.other.radius;
    const widthHalf = this.sk.BatteryBox.y.total / 2 + this.sk.other.innerMargin;
    const bottomFace = union(
      Centered.rectangle([bottomFaceHeight, widthHalf - radius]),
      Centered.rectangle([bottomFaceHeight - radius, widthHalf]),
      circle({radius, center: [bottomFaceHeight - radius, widthHalf - radius]}),
    );
    return [
      translate(
        [this.sk.x.tailToHead.valueAt('batteryBoxStart'), 0, this.sk.z.bottomToTop.valueAt('bottomWallEnd')],
        mirrorX(rotateY(-Math.PI / 2, extrudeLinear({height: this.sk.x.total}, bottomFace))),
      ),
      // 底の部分を斜めに削ると先端が印刷不可能な厚さになるので、四角く削っておく
      translateX(
        this.sk.x.tailToHead.valueAt('nanameStart'),
        Centered.cuboid([this.sk.x.total, widthHalf, this.sk.z.bottomToTop.valueAt('bottomWallEnd')]),
      ),
      // チップやボタンサポートとの干渉を避けるための穴
      (() => {
        const length = this.sk.x.collisionAvoidanceHole.totalFromTo('holeStart', 'holeEnd');
        return cuboid({
          size: [length, this.sk.y.collisionAvoidanceHole, 9],
          center: [this.sk.x.collisionAvoidanceHole.valueAt('holeStart') + length / 2, 0, 0],
        });
      })(),
    ];
  }

  @cacheGetter
  public get headJointHalf(): Geom3[] {
    const collisionOffset = 0.3;
    return [
      translate(
        [this.sk.x.total, this.sk.y.totalHalf - this.sk.y.headJoint, this.sk.z.total - this.sk.z.headHeight],
        union(
          // 出っ張り部分
          translate(
            [-collisionOffset, 0, -this.sk.z.headJoint.height - this.sk.z.headJoint.offset],
            Centered.cuboid([
              this.sk.x.headJoint.headLength + collisionOffset,
              this.sk.y.headJoint,
              this.sk.z.headJoint.height,
            ]),
          ),
          // ベース部分
          this.geom3FromSidePlane(
            polygon({
              points: [
                [-collisionOffset, -this.sk.z.headJoint.height - this.sk.z.headJoint.offset],
                [-collisionOffset, 1],
                [-8, 0],
                [-collisionOffset - 1.5, -this.sk.z.headJoint.height - this.sk.z.headJoint.offset],
              ],
            }),
            this.sk.y.headJoint,
          ),
        ),
      ),
    ];
  }

  @cacheGetter
  public get outlineHalf(): Geom3[] {
    const base = subtract(
      union(this.geom3FromBottomPlane(this.endPlaneHalf, this.sk.x.total + 99)),
      this.outlineHalfSubtractuion,
      // 先端部分をButtonPadの側面と角度を合わせるための切り取り (ここで切り取る前提で↑で+99してる)
      this.sk.transformSelf.reversed().applyGeom(
        cuboid({
          size: [999, 999, 999],
          center: [999 / 2 - 0.3, 999 / 2, 0],
        }),
      ),
    );
    return [
      subtract(
        union(
          subtract(
            base,
            // カバーの領域を削る
            this.geom3FromBottomPlane(
              translateX(this.sk.z.bottomToTop.valueAt('batteryBoxBase'), Centered.rectangle([99, 99])),
              this.sk.x.coverTailToHead.valueAt('coverEnd'),
            ),
            // カバーの出っ張り部分を削る
            this.geom3FromBottomPlane(
              translateX(
                this.sk.z.bottomToTop.valueAt('batteryBoxBase') - this.sk.BatteryBox.z.cutout,
                Centered.rectangle([this.sk.BatteryBox.z.cutout, this.sk.BatteryBox.y.cutoutHalf]),
              ),
              this.sk.x.tailToHead.valueAt('batteryBoxStart'),
            ),
          ),
          // ボタンパッド近くの上部ナナメ部分 (本当はexpand(coverOutlineHalf)をsubtractしたいが、計算に時間がかかりすぎるため別途ナナメ部分だけ切り出してつなげる)
          intersect(base, union(this.coverSubtractionHalf)),

          // グリップとの接続のための付け足し
          this.geom3FromSidePlane(
            polygon({
              points: [
                [this.sk.x.tailJointAdditionalStart, 0],
                [this.sk.x.tailJointAdditionalStart, -this.sk.z.tailJointAdditional],
                [this.sk.x.tailJoint, 0],
              ],
            }),
            this.sk.y.tailJointAdditionalHalf,
          ),

          subtract(
            hull(
              translate(
                [11.5, this.sk.BatteryBox.y.total / 2 - 1, -1],
                Centered.cuboid([this.sk.x.tailToHead.valueAt('nanameStart'), 1, 1]),
              ),
              translate(
                [10.5, this.sk.BatteryBox.y.total / 2 - 1, 0],
                Centered.cuboid([this.sk.x.tailToHead.valueAt('nanameStart'), 1, 0.2]),
              ),
            ),
            translate([this.sk.x.tailToHead.valueAt('nanameStart'), 0, -99 / 2], Centered.cuboid([99, 99, 99])),
          ),
        ),
        // this.subtructionForJointHalf,
      ),
    ];
  }

  @cacheGetter
  public get looseOutlineHalfBase(): Geom3[] {
    const endPlane = Centered.rectangle([this.sk.z.total, this.sk.y.totalHalf + 0.000001]);
    return [
      subtract(this.geom3FromBottomPlane(endPlane, this.sk.x.total), this.outlineHalfSubtractuion),
      ...this.headJointHalf,
    ];
  }

  private get subtructionForJointHalf(): Geom3[] {
    return [
      extrudeLinear(
        {height: 1},
        polygon({
          points: [
            [this.sk.x.tailToHead.valueAt('batteryBoxStart'), this.sk.BatteryBox.y.total / 2],
            [-this.sk.x.tailJointAdditional, this.sk.BatteryBox.y.total / 2],
            [
              -this.sk.x.tailJointAdditional,
              this.sk.BatteryBox.y.total / 2 -
                this.sk.x.tailToHead.valueAt('batteryBoxStart') -
                this.sk.x.tailJointAdditional,
            ],
          ],
        }),
      ),
    ];
  }

  @cacheGetter
  public get outlineHalfSubtractuion(): Geom3[] {
    // グリップと領域を分け合うためにナナメに削る部分
    const headSidePlane = polygon({
      points: [
        [this.sk.x.tailToHead.valueAt('nanameStart'), 0],
        [this.sk.x.total, 0],
        [this.sk.x.total, this.sk.z.total - this.sk.z.headHeight],
      ],
    });
    return [this.geom3FromSidePlane(headSidePlane, 999)];
  }

  private geom3FromBottomPlane(geom: Geom2, height: number, offset?: number): Geom3 {
    const result = mirrorX(rotateY(-Math.PI / 2, extrudeLinear({height}, geom)));
    return offset != null ? translateX(offset, result) : result;
  }

  private geom3FromSidePlane(geom: Geom2, width: number, offset?: number): Geom3 {
    const result = mirrorY(rotateX(Math.PI / 2, extrudeLinear({height: width}, geom)));
    return offset != null ? translateY(offset, result) : result;
  }

  public get endPlaneHalf(): Geom2 {
    return union(
      Centered.rectangle([this.sk.z.total, this.sk.y.topWidthHalf - this.sk.other.radius]),
      Centered.rectangle([this.sk.z.total - this.sk.other.radius, this.sk.y.topWidthHalf]),
      Centered.rectangle([this.sk.z.bottomToTop.valueAt('batteryBoxBase'), this.sk.y.totalHalf]),
      circle({
        radius: this.sk.other.radius,
        center: [this.sk.z.total - this.sk.other.radius, this.sk.y.topWidthHalf - this.sk.other.radius],
      }),
    );
  }

  @cacheGetter
  public get coverHalf(): Geom3[] {
    return [subtract(this.coverOutlineHalf, this.innerHalf)];
  }

  @cacheGetter
  public get coverOutlineHalf(): Geom3[] {
    return [
      subtract(
        this.geom3FromBottomPlane(
          intersect(
            this.endPlaneHalf,
            rectangle({
              size: [this.sk.z.bottomToTop.totalFromTo('batteryBoxBase', 'top'), this.sk.y.topWidthHalf * 2],
              center: [
                this.sk.z.bottomToTop.valueAt('batteryBoxBase') +
                  this.sk.z.bottomToTop.totalFromTo('batteryBoxBase', 'top') / 2 +
                  coverCollisionOffset,
                0,
              ],
            }),
          ),
          this.sk.x.coverTailToHead.valueAt('coverEnd'),
        ),
        this.coverSubtractionHalf,
      ),
    ];
  }

  /**
   * カバー先端のナナメ形状を作る
   */
  @cacheGetter
  public get coverSubtractionHalf(): Geom3[] {
    const rectLength = this.sk.other.radius * 2;
    return [
      this.geom3FromSidePlane(
        polygon({
          points: [
            [this.sk.x.coverTailToHead.valueAt('nanameStart'), this.sk.z.bottomToTop.valueAt('batteryBoxBase')],
            [this.sk.x.coverTailToHead.valueAt('twistStart') + 99, this.sk.z.bottomToTop.valueAt('batteryBoxBase')],
            [
              this.sk.x.coverTailToHead.valueAt('twistStart') + 99,
              this.sk.z.bottomToTop.valueAt('top') - this.sk.other.radius,
            ],
            [
              this.sk.x.coverTailToHead.valueAt('twistStart'),
              this.sk.z.bottomToTop.valueAt('top') - this.sk.other.radius,
            ],
          ],
        }),
        999,
      ),
      translate(
        [
          this.sk.x.coverTailToHead.valueAt('twistStart'),
          this.sk.y.topWidthHalf - this.sk.other.radius,
          this.sk.z.total - this.sk.other.radius,
        ],
        mirrorX(
          rotateY(
            -Math.PI / 2,
            extrudeLinear(
              {
                height: this.sk.x.coverTailToHead.totalFromTo('twistStart', 'twistEnd'),
                twistAngle: -Math.PI / 2,
                twistSteps: 30,
              },
              rectangle({size: [rectLength, rectLength], center: [-rectLength / 2, rectLength / 2]}),
            ),
          ),
        ),
      ),
      (() => {
        const yMax = this.sk.y.topWidthHalf - this.sk.other.radius;
        return extrudeLinear(
          {height: 999},
          polygon({
            points: [
              [this.sk.x.coverTailToHead.valueAt('coverEnd'), yMax + 99],
              [this.sk.x.coverTailToHead.valueAt('twistEnd'), yMax + 99],
              [this.sk.x.coverTailToHead.valueAt('twistEnd'), yMax],
              [
                this.sk.x.coverTailToHead.valueAt('coverEnd'),
                yMax - this.sk.x.coverTailToHead.totalFromTo('twistEnd', 'coverEnd'),
              ],
            ],
          }),
        );
      })(),
    ];
  }
}
