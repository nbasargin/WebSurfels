import { Geometry, OctreeLodBuilder, LodNode, Timing, LodBinary, PointCloudData } from 'web-surfels';
import { FileIO } from './file-io/file-io';
import { PLYLoader } from '@loaders.gl/ply';
import { parse } from '@loaders.gl/core';

async function loadData(): Promise<PointCloudData> {
    const castleFile = await FileIO.readFile('../point-clouds/stanford_dragon.ply');
    const rawData = await parse(castleFile, PLYLoader);
    const sizes = new Float32Array(Math.floor(rawData.attributes.POSITION.value.length / 3));
    sizes.fill(0.03);
    const data: PointCloudData = {
        positions: rawData.attributes.POSITION.value,
        sizes: sizes,
        normals: rawData.attributes.NORMAL.value,
        colors: new Float32Array(rawData.attributes.COLOR_0.value),
    };
    for (let i = 0; i < data.positions.length; i++) {
        data.positions[i] *= 20.0;
    }
    for (let i = 1; i < data.positions.length; i+=3) {
        data.positions[i] -= 2.5;
    }
    for (let i = 0; i < data.colors.length; i++) {
        data.colors[i] /= 255.0;
    }
    return data;
}

// write lod to files
async function writeLodTreeToFiles(lod: LodNode, folderPath: string) {
    await FileIO.mkDir(folderPath);
    await writeLodNode(lod, folderPath, true);
}

async function writeLodNode(node: LodNode, folderPath: string, isRootNode: boolean) {
    const binary = LodBinary.toBinary(node);
    await FileIO.writeFile(folderPath + (isRootNode ? 'root' : node.id) + '.lod', binary);
    for (const child of node.children) {
        await writeLodNode(child, folderPath, false);
    }
}

console.log(Timing.measure(), 'starting');

loadData().then(data => {
    console.log(Timing.measure(), 'raw data loaded');

    const bb = Geometry.getBoundingBox(data.positions);
    const octree = new OctreeLodBuilder(bb, 32, 10);
    octree.addData(data);
    console.log(Timing.measure(), 'octree created');

    const lod = octree.buildLod();
    console.log(Timing.measure(), 'lod computed'); // bounding sphere is lod.boundingSphere

    const folderPath = './lod/';
    writeLodTreeToFiles(lod, folderPath).then(() => {
        console.log(Timing.measure(), 'done writing lod');
    }).catch(err => {
        console.log('error writing lod', err);
    });

});
