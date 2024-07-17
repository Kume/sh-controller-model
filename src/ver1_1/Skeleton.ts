import {mirrorVec3ds, Transform2D, Transform3D} from '../utils/Transform';
import {degToRad} from '@jscad/modeling/src/utils';
import {PointViewMeta} from '../types';
import {flex, seqVal, seqVec2} from '../utils/Value';

type HalfValues<Keys extends string | number | symbol, ValueMap extends Record<Keys, unknown>> = Keys extends string
  ? ValueMap extends {readonly [P in Keys]: number}
    ? Record<`${Keys}Half`, number>
    : never
  : never;

function addHalf<ValueMap extends {[key: string]: unknown}, Keys extends keyof ValueMap & string>(
  map: ValueMap,
  keys: readonly Keys[],
): HalfValues<keyof ValueMap, ValueMap> {
  return {
    ...map,
    ...Object.fromEntries(keys.map((key) => [`${key}Half`, (map as any)[key] / 2])),
  } as unknown as HalfValues<keyof ValueMap, ValueMap>;
}

const colors = {
  board: [0.2, 0.7, 0.2],
} as const;

export class Skeleton {
  public static get children() {
    return {
      ButtonPad: this.ButtonPad,
      Trigger: this.Trigger,
      Grip: this.Grip,
      BatteryBoxHolder: this.BatteryBoxHolder,
    } as const;
  }

  /**
   * x: 軸の向き: スティックからボタン方向 領域: x>0
   * y: 左右対称
   * z: 軸の向き: スティック側が上 領域: z>0
   */
  public static readonly ButtonPad = class ButtonPad {
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
        [this.x.total, 0],
        [this.x.total, this.y.end],
        ...sideHalf,
        [0, this.y.start],
        [0, 0],
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
          const yOffset = S.ButtonPad.y.end;

          return {
            // カバーを削れるギリギリの範囲の薄い領域
            1: [
              // 底面中央付近
              [xEnd - 4, 4, 0],
              [xEnd - 17, 6, 0],

              // 底面横エッジギリギリ
              [xEnd - 2, yOffset + 1, 0],
              [xEnd - 20, yOffset + 2.5, 0],

              // 上の方(これのzを上げると削る角度が増える)
              [xEnd - 6, yOffset + 5, 3],
              [xEnd - 18, yOffset + 7, 3],
            ],

            2: [
              // 底面を丸くくり抜く形に5点配置
              [xEnd, yOffset, 0],
              [xEnd - 7, yOffset - 1, 0],
              [xEnd - 20, yOffset + 2.5, 0], // this.[1][3] と同様
              [xEnd - 26, yOffset + 8, 0],
              [xEnd - 32, yOffset + 15.8, 0], // ジョイント部分の接点と同一

              // 上の方(これのzを上げると削る角度が増える)
              [xEnd - 26, yOffset + 16, 11],
              [xEnd - 2, yOffset + 6, 11],
            ],
          } as const;
        },
      } as const;
    }
    public static get pointsViewMeta() {
      return {
        outline: {
          defaultVisible: true,
          radius: 1.5,
        },
        screw: {
          defaultVisible: true,
        },
        fingerSubtractionHalf: {
          color: [0.8, 0.8, 1],
          defaultVisible: true,
        },
      } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
    }
  };
  static readonly Trigger = class Trigger {
    public static readonly x = {
      total: 50,
    } as const;
    public static readonly y = {
      totalHalf: 25,
      get total() {
        return this.totalHalf * 2;
      },
      bottomWidthHalf: 11,
    } as const;
    public static readonly z = {
      total: 32.5,
      back: 15,
    };
    public static readonly other = {
      hullSphereRadius: 3,
      hullSmallSphereRadius: 2,
    } as const;
    public static get transformSelf() {
      return new Transform3D([['mirror', 'z']]);
    }
    public static get points() {
      return {
        // 凸包でトリガーの丸っこい形を作るためのポイント
        get hullHalf() {
          const topBaseX = S.Trigger.x.total + S.Trigger.z.total * Math.tan(S.Trigger.ButtonFace.other.rotateRad);
          // 山の頂上あたりの点
          return {
            get top() {
              const maxZ = S.Trigger.z.total;
              const baseY = S.Trigger.y.bottomWidthHalf;
              const offset = S.Trigger.other.hullSphereRadius;
              const smallOffset = S.Trigger.other.hullSmallSphereRadius;
              return {
                standard: [
                  // 前方 サイドの方の点を少し後ろにすることで、前方向きの三角形になる 少しでも指に引っかからないように
                  [topBaseX - 1, 0, maxZ - 1 - offset],
                  [topBaseX - 2, baseY - 3, maxZ - 1 - offset],

                  // 横幅を確保するための点
                  [topBaseX - 3, baseY, maxZ - 1 - offset],
                ],
                // ちょっと尖っった形状を作るために小さいスフィア化する想定の点
                small: [
                  // 床においたときの接地部分 置いたときに安定させるため、x軸z軸の値を同じにして地面と平行にさせる
                  [topBaseX - 3, 0, maxZ - smallOffset],
                  [topBaseX - 3, baseY - 5, maxZ - smallOffset],
                ],
              } as const;
            },
            // 横の膨らみを作るための点
            get side() {
              return [
                [topBaseX - 8, S.Trigger.y.totalHalf - 4, 12],
                [topBaseX - 10, S.Trigger.y.totalHalf, 0],
              ] as const;
            },
          } as const;
        },
      } as const;
    }
    public static get children() {
      return {
        ButtonFace: this.ButtonFace,
      };
    }
    static readonly ButtonFace = class ButtonFace {
      public static readonly x = {
        corner: 15,
        total: 25,
      } as const;
      public static readonly y = {
        corner: 18,
        get thickness() {
          return S.Common.TactileSwitch.z.subterraneanHeight;
        },
      } as const;
      public static readonly z = {
        get topToBottom() {
          return seqVal(
            [
              ['boardStart', 9],
              ['boardEnd', S.Trigger.ButtonFace.Board.x.topToBottom.totalValue],
              ['endWallStart', 0.5],
              ['yobo', flex()],
            ],
            this.total,
          );
        },
        total: 50,
      };
      public static readonly other = {
        rotateRad: degToRad(-34),
      };
      public static get transformSelf() {
        return new Transform3D([
          ['mirror', 'x'],
          ['rotate', 'y', this.other.rotateRad],
          ['translate', S.Trigger.x.total, 0, 0],
        ]);
      }
      public static get point2ds() {
        return {
          bottomOuterSeq: seqVec2(
            [
              ['start', [0, 0]],
              ['curveStart', [0, flex()]],
              ['curveEnd', [4, 10]],
              ['end', [flex(), this.y.corner - 10]],
            ],
            // トリガー部分のy軸端の部分まで含める
            [this.x.corner, S.Trigger.y.totalHalf],
          ),
          bottomInner: [
            [S.Trigger.ButtonFace.x.total, S.Trigger.y.totalHalf],
            [S.Trigger.ButtonFace.x.total, this.Board.y.totalHalf + 1],
            [S.Common.TactileSwitch.z.subterraneanHeight, this.Board.y.totalHalf + 1],
            [S.Common.TactileSwitch.z.subterraneanHeight, 0],
          ],
          get bottomOutline() {
            return [...this.bottomOuterSeq.vecs, ...this.bottomInner] as const;
          },
        } as const;
      }
      public static get points() {
        return {
          bottomOutline: this.point2ds.bottomOutline.map((p) => [...p, 0] as const),
        } as const;
      }
      public static get pointsViewMeta() {
        return {
          bottomOutline: {
            color: [0.5, 1, 0.5],
            defaultVisible: true,
          },
        } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
      }
      public static get children() {
        return {
          Board: this.Board,
        };
      }
      public static readonly Board = class TriggerBoard {
        public static readonly x = {
          topToBottom: seqVal([
            ['topSwitch', 7],
            ['bottomSwitch', 17],
            ['bottom', 5],
          ]),
        } as const;
        public static readonly y = {
          totalHalf: 11,
          bottomSwitch: 7,
        } as const;
        public static readonly z = {
          thickness: 1.5,
        };
        public static get transformSelf() {
          return new Transform3D([
            [
              'translate',
              S.Trigger.ButtonFace.z.topToBottom.valueAt('boardStart'),
              0,
              -S.Common.TactileSwitch.z.subterraneanHeight,
            ],
            ['rotate', 'y', degToRad(-90)],
          ]);
        }
        public static get point2ds() {
          return {
            rightSwitch: [this.x.topToBottom.valueAt('topSwitch'), this.y.bottomSwitch],
            leftSwitch: [this.x.topToBottom.valueAt('topSwitch'), -this.y.bottomSwitch],
            bottomSwitch: [this.x.topToBottom.valueAt('bottomSwitch'), 0],
            get switches() {
              return [this.rightSwitch, this.leftSwitch, this.bottomSwitch] as const;
            },
            board: [
              [0, this.y.totalHalf],
              [this.x.topToBottom.valueAt('bottom'), this.y.totalHalf],
              [this.x.topToBottom.valueAt('bottom'), -this.y.totalHalf],
              [0, -this.y.totalHalf],
            ],
          } as const;
        }
        public static get points() {
          return {
            switches: this.point2ds.switches.map((point) => [...point, 0] as const),
            switchesTop: this.point2ds.switches.map((point) => [...point, S.Common.TactileSwitch.z.total] as const),
            boardTop: this.point2ds.board.map((point) => [...point, 0] as const),
            boardBottom: this.point2ds.board.map((point) => [...point, -this.z.thickness] as const),
          } as const;
        }
        public static get pointsViewMeta() {
          return {
            switches: {
              color: [0.8, 0.4, 0.4],
              defaultVisible: true,
            },
            switchesTop: {
              color: [0.8, 0.4, 0.4],
              defaultVisible: true,
            },
            boardTop: {
              color: colors.board,
              defaultVisible: true,
            },
          } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
        }
      };
    };
    public static readonly Joint = {
      x: {},
      y: {},
      z: {
        screwPoll: 4,
      },
      other: {
        screwPollRadius: 5,
      },
    } as const;
  };
  static readonly Grip = class Grip {
    public static readonly x = {
      endThickness: 1.2,
      topWall: 15,
      total: 75,
      get ledHole() {
        return seqVal([
          ['start', 3.5],
          ['end', S.Grip.other.ledHoleSize],
        ]);
      },
      get resetSwitchHole() {
        return seqVal([
          ['start', 2.5],
          ['end', S.Grip.other.resetSwitchHoleSize],
        ]);
      },
    } as const;
    public static get y() {
      return {
        total: this.End.y.total,
        totalHalf: this.End.y.totalHalf,
        get ledHole() {
          return seqVal([
            ['start', 4.5],
            ['end', S.Grip.other.ledHoleSize],
          ]);
        },
        get resetSwitchHole() {
          return seqVal([
            ['start', 4],
            ['end', S.Grip.other.resetSwitchHoleSize],
          ]);
        },
      } as const;
    }
    public static get z() {
      return {
        total: this.End.x.total,
        ledHold: 0.5,
      } as const;
    }
    public static get other() {
      return {
        ledHoleSize: 3,
        resetSwitchHoleSize: 2.6,
      } as const;
    }
    public static get transformSelf() {
      return new Transform3D([
        ['translate', -this.x.total, 0, -S.Trigger.z.back],
        ['rotate', 'y', degToRad(-24)],
      ]);
    }
    public static get children() {
      return {
        End: this.End,
        Board: this.Board,
      };
    }
    public static readonly End = {
      x: {
        topThickness: 1,
        get topToBottom() {
          return seqVal([
            ['topWallEnd', this.topThickness],
            ['boardStart', 0.5],
            ['boardEnd', S.Grip.Board.z.total],
            ['boardLegBottom', S.Grip.Board.z.legBottom],
            ['bottomWallStart', 0.5],
            ['bottom', 1],
          ]);
        },
        get total() {
          return this.topToBottom.totalValue;
        },
        get bottomToTopForHoles() {
          return seqVal(
            [
              ['switchHoleStart', flex()],
              ['switchHoleEnd', 4],
              ['usbHoleStart', 7.2],
              ['usbHoleEnd', 4],
              ['end', this.topThickness],
            ],
            this.total,
          );
        },
      },
      y: {
        total: 30,
        get totalHalf() {
          return this.total / 2;
        },
        usbHoleHalf: 4.85,
        switchHoleHalf: 3,
      },
      other: {
        radius: 6,
      },
      get transformSelf() {
        return new Transform3D([
          ['rotate', 'y', degToRad(-90)],
          ['mirror', 'x'],
        ]);
      },
      get point2ds() {
        return {
          outlineHalf: [
            [0, 0],
            [0, this.y.totalHalf - this.other.radius],
            [this.other.radius, this.y.totalHalf],
            [this.x.total, this.y.totalHalf],
            [this.x.total, 0],
          ],
        } as const;
      },
      get points() {
        return {
          bottomHalf: this.point2ds.outlineHalf.map((point) => [...point, 0] as const),
        };
      },
    } as const;

    public static readonly Board = {
      x: {
        total: 60,
        screw: 40,
      },
      y: addHalf(
        {
          total: 22,
        },
        ['total'],
      ),
      get z() {
        const bottomToTop = seqVal([
          ['boardTop', 1.5],
          ['xiaoTop', this.XiaoBoard.z.total],
        ]);
        return {
          bottomToTop,
          total: bottomToTop.totalValue,
          legBottom: 2,
        } as const;
      },
      get transformSelf() {
        return new Transform3D([
          ['translate', S.Grip.x.endThickness, 0, S.Grip.End.x.topToBottom.totalFromTo('boardEnd', 'bottom')],
        ]);
      },
      get point2ds() {
        return {
          outline: [
            [0, this.y.totalHalf],
            [this.x.total, this.y.totalHalf],
            [this.x.total, -this.y.totalHalf],
            [0, -this.y.totalHalf],
          ],
        } as const;
      },
      get points() {
        return {
          bottomOutline: this.point2ds.outline.map((point) => [...point, 0] as const),
        };
      },
      get pointsViewMeta() {
        return {
          bottomOutline: {
            color: colors.board,
            defaultVisible: true,
          },
        } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
      },
      XiaoBoard: {
        x: {
          total: 20.5,
          chip: seqVal([
            ['start', 7],
            ['end', 10.5],
          ]),
          usb: seqVal([
            ['start', -1.2],
            ['end', 7],
          ]),
        },
        y: {
          total: 17.5,
          get totalHalf() {
            return this.total / 2;
          },
          leg: 2,
          usb: 8.6,
          get usbHalf() {
            return this.usb / 2;
          },
          chip: 12,
          get chipHalf() {
            return this.chip / 2;
          },
        },
        z: {
          bottomToTop: seqVal([
            ['legBottom', -3.5],
            ['legBase', 3.5],
            ['boardBottom', 10.7],
            ['boardTop', 1],
            ['usbTop', 3],
          ]),
          chip: 1.5,
          get total() {
            return this.bottomToTop.totalValue;
          },
        },
        get transformSelf() {
          return new Transform3D([['translate', 0, 0, S.Grip.Board.z.bottomToTop.valueAt('boardTop')]]);
        },
        get point2ds() {
          return {
            outline: [
              [0, this.y.totalHalf],
              [this.x.total, this.y.totalHalf],
              [this.x.total, -this.y.totalHalf],
              [0, -this.y.totalHalf],
            ],
          };
        },
        get points() {
          return {
            bottomOutline: this.point2ds.outline.map((point) => [...point, 0] as const),
          };
        },
        get pointsViewMeta() {
          return {
            bottomOutline: {
              color: colors.board,
              defaultVisible: true,
            },
          } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
        },
      },
    } as const;
  };
  static readonly BatteryBoxHolder = {
    x: {
      get tailToHead() {
        const nanameStart = 38;
        return seqVal([
          ['batteryBoxStart', 3],
          ['nanameStart', nanameStart],
          ['batteryBoxEnd', S.BatteryBoxHolder.BatteryBox.x.total - nanameStart],
          ['head', 1],
        ]);
      },
      get total() {
        return this.tailToHead.totalValue;
      },
      tailJoint: 8,
      tailJointAdditional: 1,
      jointSideNaname: 10,
      get coverTailToHead() {
        const radius = S.BatteryBoxHolder.other.radius;
        return seqVal(
          [
            ['nanameStart', flex()],
            ['twistStart', S.BatteryBoxHolder.z.bottomToTop.totalFromTo('batteryBoxBase', 'top') - radius],
            ['twistEnd', (radius * Math.PI) / 2],
            ['coverEnd', 3],
            ['head', 2.3],
          ],
          this.total,
        );
      },
      cableGroove: 2,
      get collisionAvoidanceHole() {
        return seqVal([
          ['holeStart', 7],
          ['holeEnd', 11],
        ]);
      },
    } as const,
    get y() {
      return {
        total: 30,
        topWidthHalf: this.BatteryBox.y.total / 2 + this.other.innerMargin + this.other.topThickness,
        get totalHalf() {
          return this.total / 2;
        },
        get cableGrooveSeq() {
          return seqVal(
            [
              ['grooveStart', 5.4],
              ['grooveEnd', 3.2],
              ['bottomGrooveEnd', flex()],
              ['end', 3.7],
            ],
            this.totalHalf,
          );
        },
        collisionAvoidanceHole: 13,
      } as const;
    },
    z: {
      get bottomToTop() {
        return seqVal([
          ['bottomWallEnd', 1.5],
          ['batteryBoxBottom', S.BatteryBoxHolder.other.innerMargin],
          ['batteryBoxCutoutStart', S.BatteryBoxHolder.BatteryBox.z.base - S.BatteryBoxHolder.BatteryBox.z.cutout],
          ['batteryBoxBase', S.BatteryBoxHolder.BatteryBox.z.cutout],
          ['batteryBoxTop', S.BatteryBoxHolder.BatteryBox.z.cover],
          ['topWallStart', S.BatteryBoxHolder.other.innerMargin],
          ['top', S.BatteryBoxHolder.other.topThickness],
        ]);
      },
      get total() {
        return this.bottomToTop.totalValue;
      },
      get headHeight() {
        // 回転 + 延長した後にボタンパッドの上と大体合うように調整
        return S.ButtonPad.z.total - 0.5;
      },
      tailJointAdditional: 1.8, // グリップにぶつからないように目で調整した
      cableGroove: 10.2,
    },
    other: {
      topThickness: 1.2,
      innerMargin: 0.4,
      get radius() {
        return S.BatteryBoxHolder.BatteryBox.other.radius + 1.5;
      },
      natOffset: 0.2,
    },
    get transformSelf() {
      return new Transform3D([
        ['translate', -this.x.total, 0, -this.z.total + this.z.headHeight],
        ['rotate', 'y', degToRad(-11)],
      ]);
    },
    get transformTailNat() {
      return new Transform3D([
        ['rotate', 'y', Math.PI / 2],
        [
          'translate',
          this.x.tailToHead.valueAt('batteryBoxStart') - S.Common.Nat.z - this.other.natOffset,
          0,
          this.z.bottomToTop.valueAt('bottomWallEnd') + 3,
        ],
      ]);
    },
    get points() {
      return {
        outlineCenter: [
          [0, 0, 0],
          [0, 0, this.z.total],
          [this.x.tailToHead.valueAt('nanameStart'), 0, 0],
          [this.x.total, 0, 5],
          [this.x.total, 0, this.z.total],
        ],
      } as const;
    },
    BatteryBox: {
      x: {total: 63},
      y: {
        total: 25,
        // カバー後方の飛び出してる部分
        cutoutHalf: 8.2 / 2,
      },
      z: {
        total: 15,
        cover: 5,
        // カバー部分を除いた高さ
        base: 10,
        // カバー後方の飛び出してる部分
        cutout: 3.5,
      },
      other: {radius: 2},
    },
  } as const;
  static readonly Common = {
    TactileSwitch: {
      z: {
        seq: seqVal([
          ['baseTop', 3.5],
          ['switchTop', 6],
        ]),
        /** スイッチの外装に埋め込まれている部分の高さ */
        get subterraneanHeight() {
          return this.seq.totalValue - 2;
        },
        get total() {
          return this.seq.valueAt('switchTop');
        },
      },
    },
    Nat: {
      z: 2.4,
      radius: 5.5 / 2,
    },
  } as const;
}

const S = Skeleton;
