// @ts-ignore
import stlSerializer from '@jscad/stl-serializer';
// @ts-ignore
import objSerializer from '@jscad/obj-serializer';
import fs from 'fs';
import {Geometry} from '@jscad/modeling/src/geometries/types';
import * as path from 'path';
import {MainBoard} from './MainBoard';
import {Trigger} from './Trigger';
import {NatHolder} from './NatHolder';
import {SHController} from './SHController';

function saveStl(fileName: string, geom: Geometry | Geometry[]) {
  const data = stlSerializer.serialize({binary: false}, geom);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  fs.writeFileSync(path.join('./out', fileName), data[0]);
  // eslint-disable-next-line no-console
  console.log(`output ${fileName}`);
}

function saveObj(fileName: string, geom: Geometry | Geometry[]) {
  const data = objSerializer.serialize({binary: false}, geom);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  fs.writeFileSync(path.join('./out', fileName), data[0]);
  // eslint-disable-next-line no-console
  console.log(`output ${fileName}`);
}

const trigger = new Trigger();
const mainBoard = new MainBoard();
const natHolder = new NatHolder({totalHeight: 7, screwHoleType: 'square', topThickness: 1});
const main = new SHController();

saveStl('mainBoard.stl', mainBoard.full);
saveStl('trigger.stl', trigger.devSold);
saveStl('triggerWithGrip.stl', trigger.fullWithGrip);
saveStl('batteryBoxHolder.stl', main.grip.batteryBoxHolder.full);
saveStl('natHolder.stl', natHolder.full);
saveStl('buttonBoard.stl', main.buttonPad.board.boardHalf);
saveStl('buttonBoardAndStick.stl', main.buttonPad.boardAndStick);
saveStl('buttonPad.stl', main.buttonPad.full);
saveStl('buttonPadTestBoard.stl', main.buttonPad.board.testBoard);
saveStl('main.stl', main.outline);

if (process.env.npm_lifecycle_script?.startsWith('ts-node-dev')) {
  // yarn dev で起動した場合のみ、ts-node-devでwatchするためにプログラムを終了させない。
  setTimeout(() => {}, 1000000000);
}
