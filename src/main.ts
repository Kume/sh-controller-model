// @ts-ignore
import stlSerializer from '@jscad/stl-serializer';
// @ts-ignore
import objSerializer from '@jscad/obj-serializer';
import fs from 'fs';
import {Geometry} from '@jscad/modeling/src/geometries/types';
import * as path from 'path';
import {SHController} from './SHController';
import {SHController1_1} from './ver1_1/SHController1_1';

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

// const main = new SHController();
const main = new SHController1_1();
main.printItems.forEach((i) => saveStl(`${i.label}.stl`, i.model()));

if (process.env.npm_lifecycle_script?.startsWith('ts-node-dev')) {
  // yarn dev で起動した場合のみ、ts-node-devでwatchするためにプログラムを終了させない。
  setTimeout(() => {}, 1000000000);
}
