import { FileIO } from './file-io/file-io';
import { PLYLoader } from '@loaders.gl/ply';
import { parse } from '@loaders.gl/core';
import { LodNode } from '../lib/data/level-of-detail/lod-node';
import { LodBinary } from '../lib/data/level-of-detail/lod-binary';
import { Timing } from '../lib/utils/timing';
import { BoundingBox } from '../lib/utils/bounding-geometry';
import { OctreeLodBuilder } from '../lib/data/level-of-detail/octree-lod-buider/octree-lod-builder';

let filesWritten = 0;

// write lod to files
async function writeLodTreeToFiles(lod: LodNode, folderPath: string, logNth: number) {
    await FileIO.mkDir(folderPath);
    await writeLodNode(lod, folderPath, true, logNth);
}

async function writeLodNode(node: LodNode, folderPath: string, isRootNode: boolean, logNth: number) {
    const binary = LodBinary.toBinary(node);
    await FileIO.writeFile(folderPath + (isRootNode ? 'root' : node.id) + '.lod', binary);
    filesWritten++;
    if (filesWritten % logNth === 0) {
        console.log('written ' + filesWritten + ' files')
    }
    for (const child of node.children) {
        await writeLodNode(child, folderPath, false, logNth);
    }
}

async function generateLod() {
    console.log(Timing.measure(), 'starting');

    const castleFile = await FileIO.readFile('../point-clouds/3drm_neuschwanstein.ply');
    console.log(Timing.measure(), 'file was loaded');

    const rawData = await parse(castleFile, PLYLoader);
    console.log(Timing.measure(), 'ply format parsed');

    const data = {
        positions: rawData.attributes.POSITION.value,
        sizes: new Float32Array(Math.floor(rawData.attributes.POSITION.value.length / 3)).fill(0.07),
        normals: rawData.attributes.NORMAL.value,
        colors: new Float32Array(rawData.attributes.COLOR_0.value).map(c => c / 255),
    };
    console.log(Timing.measure(), 'data pre-processing done');

    const bb = BoundingBox.create(data.positions);
    console.log(Timing.measure(), 'bounding box computed');

    const octree = new OctreeLodBuilder(bb, 128, 10);
    octree.addData(data);
    const numNodes = octree.root.getNumberOfNodes();
    console.log(Timing.measure(), 'octree created');

    const lod = octree.buildLod(1);
    console.log(Timing.measure(), 'lod computed, start writing to disk');

    const folderPath = '../lod/';
    writeLodTreeToFiles(lod, folderPath, Math.floor(numNodes / 20)).then(() => {
        console.log(Timing.measure(), 'done writing lod');
    }).catch(err => {
        console.log('error writing lod', err);
    });
}

generateLod().catch(err => {
    console.error(err);
});
