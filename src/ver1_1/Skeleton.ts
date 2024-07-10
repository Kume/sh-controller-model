import {mirrorVec3ds, Transform2D} from '../utils/Transform';
import {degToRad} from '@jscad/modeling/src/utils';

export class Skeleton {
  public static get children() {
    return {
      ButtonPad: this.ButtonPad,
      // Grip: this.Grip,
    } as const;
  }

  /**
   * x: 軸の向き: スティックからボタン方向 領域: x>0
   * y: 左右対称
   * z: 軸の向き: スティック側が上 領域: z>0
   */
  static readonly ButtonPad = class ButtonPad {
    public static readonly y = {
      start: 10,
      end: 13,
    } as const;
    public static readonly x = {
      total: 82,
    } as const;
    public static readonly z = {
      total: 12,
      topThickness: 1.5,
    } as const;
    public static readonly other = {
      sideThickness: 1.5,
      edgeToScrew: 6.5,
    } as const;
    public static readonly transform2d = new Transform2D([
      ['rotate', degToRad(76)],
      ['translate', 16, -40],
    ] as const);
    public static readonly transform2ds = {
      counterScrew: Transform2D.join(
        // グローバル座標系をButtonPadの座標系に変換
        this.transform2d.reversed(),
        // ButtonPad座標系で反転
        new Transform2D([['mirror', 'y']]),
        // 一度グローバル座標系に戻す
        this.transform2d,
        // グローバル座標系で反転
        new Transform2D([['mirror', 'y']]),
        // もう一度ButtonPadの座標系に戻す
        this.transform2d.reversed(),
      ),
    };
    public static readonly transformSelf = this.transform2d.to3d();
    public static get point2ds() {
      const sideHalf = this.transform2d.reversed().applyVecs([
        [0, S.Grip.y.totalHalf],
        [0, -S.Grip.y.totalHalf],
      ]);
      const outlineHalf = [
        [0, 0],
        [0, this.y.start],
        ...sideHalf,
        [this.x.total, this.y.end],
        [this.x.total, 0],
      ] as const;
      // グローバル座標系でのネジの位置
      const globalScrew = [this.other.edgeToScrew, 0] as const;
      return {
        sideHalf,
        outlineHalf,
        screw: this.transform2d.reversed().applyVec(globalScrew),
        counterScrew: this.transform2ds.counterScrew.applyVec(globalScrew),
      } as const;
    }
    public static get points() {
      const outlineHalf = {
        top: this.point2ds.outlineHalf.map((point2d) => [...point2d, this.z.total] as const),
        bottom: this.point2ds.outlineHalf.map((point2d) => [...point2d, 0] as const),
      } as const;
      return {
        outlineHalf,
        outline: [
          ...outlineHalf.top,
          ...outlineHalf.bottom,
          ...mirrorVec3ds([...outlineHalf.top, ...outlineHalf.bottom], 'y'),
        ],
        screwHalf: {
          top: [...this.point2ds.screw, this.z.total],
          counter: [...this.point2ds.counterScrew, this.z.total],
        },
        get screw() {
          return {
            top: [this.screwHalf.top, ...mirrorVec3ds([this.screwHalf.top], 'y')],
            counter: [this.screwHalf.counter, ...mirrorVec3ds([this.screwHalf.counter], 'y')],
          };
        },
        /** 人差し指が引っかからないようにするためのナナメのくぼみを構成する点 */
        get fingerSubtractionHalf() {
          const xEnd = S.ButtonPad.x.total;
          const y1Offset = S.ButtonPad.y.end;

          return {
            // カバーを削れるギリギリの範囲の薄い領域
            1: [
              // 底面中央付近
              [xEnd - 4, 4, 0],
              [xEnd - 17, 6, 0],

              // 底面横エッジギリギリ
              [xEnd - 2, y1Offset + 1, 0],
              [xEnd - 20, y1Offset + 2.5, 0],

              // 上の方(これのzを上げると削る角度が増える)
              [xEnd - 6, y1Offset + 5, 3],
              [xEnd - 18, y1Offset + 7, 3],
            ],

            2: [
              // 底面を丸くくり抜く形に5点配置
              [xEnd, y1Offset, 0],
              [xEnd - 7, y1Offset - 1, 0],
              [xEnd - 20, y1Offset + 2.5, 0], // this.[1][3] と同様
              [xEnd - 26, y1Offset + 8, 0],
              [xEnd - 32, y1Offset + 15.8, 0], // ジョイント部分の接点と同一

              // 上の方(これのzを上げると削る角度が増える)
              [xEnd - 26, y1Offset + 16, 11],
              [xEnd - 2, y1Offset + 6, 11],
            ],
          };
        },
      } as const;
    }
  };
  static readonly Grip = class Grip {
    public static readonly x = {} as const;
    public static readonly y = {
      total: 30,
      get totalHalf() {
        return this.total / 2;
      },
    } as const;
  };
}

const S = Skeleton;
