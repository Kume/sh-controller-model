import {Cacheable, cacheGetter, Centered, halfToFull, hexagon} from '../utls';
import {Viewable, ViewerItem} from '../types';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {Skeleton} from './Skeleton';
import {circle, cuboid, cylinder, polygon, rectangle} from '@jscad/modeling/src/primitives';
import {
  mirrorX,
  mirrorY,
  rotateX,
  rotateY,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {expand} from '@jscad/modeling/src/operations/expansions';

const coverCollisionOffset = 0.3;

export class BatteryBoxHolder1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.BatteryBoxHolder;

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'looseOutlineHalf', model: () => this.looseOutlineHalf},
      {label: 'half', model: () => this.half},
      {label: 'full', model: () => this.full},
      {label: 'coverHalf', model: () => this.coverHalf},
      {label: 'coverOutlineHalf', model: () => this.coverOutlineHalf},
      {label: 'gripSideJointPartHalf', model: () => this.gripSideJointPartHalf},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  @cacheGetter
  public get full(): Geom3[] {
    return [subtract(union(halfToFull(this.half)), this.innerFull)];
  }

  /**
   * fullに対して更に削る部分
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
      ),
      this.sk.transformTailNat.applyGeom(
        extrudeLinear(
          {height: Skeleton.Common.Nat.z + this.sk.other.natOffset},
          hexagon(Skeleton.Common.Nat.radius + this.sk.other.natOffset),
        ),
      ),
      this.sk.transformTailNat.applyGeom(cylinder({radius: 1.7, height: 99})),
    ];
  }

  @cacheGetter
  public get half(): Geom3[] {
    return [subtract(this.outlineHalf, this.innerHalf)];
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
  public get outlineHalf(): Geom3[] {
    const additionalEndZ =
      this.sk.z.bottomToTop.valueAt('batteryBoxBase') - this.sk.BatteryBox.z.cutout + this.sk.z.tailJointAdditional;
    // グリップとの接続のための付け足し
    const additionalJoint = subtract(
      union(
        // グリップ方向
        // this.geom3FromSidePlane(
        //   polygon({
        //     points: [
        //       [0, 0],
        //       [0, -this.sk.z.tailJointAdditional],
        //       [this.sk.x.tailJoint, 0],
        //     ],
        //   }),
        //   this.sk.BatteryBox.y.total / 2,
        // ),
        // ケツ方向
        this.geom3FromBottomPlane(
          // translateX(
          //   -this.sk.z.tailJointAdditional,
          //   Centered.rectangle([additionalEndZ, this.sk.BatteryBox.y.total / 2]),
          // ),
          Centered.rectangle([additionalEndZ, this.sk.BatteryBox.y.total / 2]),
          this.sk.x.tailJointAdditional,
          -this.sk.x.tailJointAdditional,
        ),
      ),
    );
    const base = subtract(
      union(this.geom3FromBottomPlane(this.endPlaneHalf, this.sk.x.total + 99)),
      this.outlineHalfSubtractuion,
      // ButtonPadの側面と角度を合わせるための切り取り (ここで切り取る前提で↑で+99してる)
      this.sk.transformSelf.reversed().applyGeom(
        cuboid({
          size: [99, 99, 99],
          center: [99 / 2 - 0.5, 99 / 2, 0],
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
          additionalJoint,
        ),
        this.subtructionForJointHalf,
      ),
    ];
  }

  @cacheGetter
  public get looseOutlineHalf(): Geom3[] {
    const endPlane = Centered.rectangle([this.sk.z.total, this.sk.y.totalHalf + 0.0001]);
    return [
      expand(
        {delta: 0.4},
        subtract(
          union(
            this.geom3FromBottomPlane(endPlane, this.sk.x.total),
            this.geom3FromBottomPlane(
              Centered.rectangle([
                this.sk.z.bottomToTop.valueAt('batteryBoxCutoutStart'),
                this.sk.BatteryBox.y.total / 2,
              ]),
              this.sk.x.tailJointAdditional,
              -this.sk.x.tailJointAdditional,
            ),
          ),
          this.outlineHalfSubtractuion,
          this.subtructionForJointHalf,
        ),
      ),
    ];
  }

  public get gripSideJointPartHalf(): Geom3[] {
    const thickness = 2.5;
    return [
      subtract(
        translate(
          [-this.sk.x.tailJointAdditional - thickness, 0, 0],
          Centered.cuboid([
            this.sk.x.tailJointAdditional + thickness + this.sk.x.jointSideNaname,
            this.sk.y.totalHalf,
            this.sk.z.bottomToTop.valueAt('batteryBoxCutoutStart') - 0.5,
          ]),
        ),
        this.looseOutlineHalf,
        this.sk.transformTailNat.applyGeom(cuboid({size: [3.4, 3.4, 99]})),
        // this.sk.transformTailNat.applyGeom(cuboid({size: [3.4, 10, 5]})),
      ),
    ];
  }

  private get subtructionForJointHalf(): Geom3[] {
    return [
      extrudeLinear(
        {height: this.sk.z.bottomToTop.valueAt('batteryBoxCutoutStart')},
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
    const collisionOffset = 0.4;
    // グリップと領域を分け合うためにナナメに削る部分
    const headSidePlane = polygon({
      points: [
        [this.sk.x.tailToHead.valueAt('nanameStart'), 0],
        [this.sk.x.total, 0],
        [this.sk.x.total, this.sk.z.total - this.sk.z.headHeight - collisionOffset],
      ],
    });
    // グリップに末尾のジョイント部分を作るために削る部分
    const tailSidePlane = polygon({
      points: [
        [0, 0],
        [this.sk.x.jointSideNaname, 0],
        [
          this.sk.x.tailToHead.valueAt('batteryBoxStart'),
          this.sk.z.bottomToTop.valueAt('batteryBoxBase') - this.sk.BatteryBox.z.cutout,
        ],
        [0, this.sk.z.bottomToTop.valueAt('batteryBoxBase') - this.sk.BatteryBox.z.cutout],
      ],
    });
    return [
      this.geom3FromSidePlane(headSidePlane, 999),
      this.geom3FromSidePlane(tailSidePlane, 999, this.sk.BatteryBox.y.total / 2),
    ];
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
