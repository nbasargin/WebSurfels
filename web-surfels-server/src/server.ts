import { Geometry, OctreeLodBuilder, LodNode, PointCloudDataGenerator, Timing, LodBinary } from 'web-surfels';
import { FileIO } from './file-io/file-io';

console.log(Timing.measure(), 'starting');

const data = PointCloudDataGenerator.generateSphere(10, 1, true);
console.log(Timing.measure(), 'generated sphere');

const bb = Geometry.getBoundingBox(data.positions);
const octree = new OctreeLodBuilder(bb, 32, 10);
octree.addData(data);
console.log(Timing.measure(), 'octree created');

const lod = octree.buildLod();
console.log(Timing.measure(), 'lod computed'); // bounding sphere is lod.boundingSphere


// write lod to files
async function writeLodTreeToFiles(lod: LodNode, folderPath: string) {
    await FileIO.mkDir(folderPath);
    await writeLodNode(lod, folderPath);
}

async function writeLodNode(node: LodNode, folderPath: string) {
    const binary = LodBinary.toBinary(node);
    await FileIO.writeFile(folderPath + node.id + '.lod', binary);
    for (const child of node.children) {
        await writeLodNode(child, folderPath);
    }
}

const folderPath = './lod/';
writeLodTreeToFiles(lod, folderPath).then(() => {
    console.log(Timing.measure(), 'done writing lod');
}).catch(err => {
    console.log('error writing lod', err);
});
