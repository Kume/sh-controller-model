// @ts-ignore
import stlSerializer from '@jscad/stl-serializer';
import fs from 'fs';
import {Grip} from './Grip';
import {Geometry} from '@jscad/modeling/src/geometries/types';
import * as path from 'path';
import {MainBoard} from './MainBoard';
import {Trigger} from './Trigger';
import {NatHolder} from './NatHolder';

function saveStl(fileName: string, geom: Geometry) {
  const data = stlSerializer.serialize({binary: false}, geom);
  fs.writeFileSync(path.join('./out', fileName), data[0]);
}

const trigger = new Trigger();
const grip = new Grip();
const mainBoard = new MainBoard();
const natHolder = new NatHolder({totalHeight: 7, screwHoleType: 'square', topThickness: 1});

saveStl('main.stl', grip.halfWithBoard);
saveStl('mainBoard.stl', mainBoard.half);
saveStl('trigger.stl', trigger.devSold);
saveStl('natHolder.stl', natHolder.full);

if (process.env.npm_package_scripts_dev?.startsWith('ts-node-dev')) {
  // yarn dev で起動した場合のみ、ts-node-devでwatchするためにプログラムを終了させない。
  setTimeout(() => {}, 1000000000);
}
