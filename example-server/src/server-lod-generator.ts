import { PLYLoader } from '@loaders.gl/ply';
import { parse } from '@loaders.gl/core';

import { LodNode } from 'web-surfels';
import { LodBinary } from 'web-surfels';
import { Timing } from 'web-surfels';
import { BoundingBox } from 'web-surfels';
import { OctreeLodBuilder } from 'web-surfels';

import { FileIO } from './file-io/file-io';

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

function clipLodTreeDepth(node: LodNode, depthLimit: number) {
    if (depthLimit <= 1) {
        node.childIDs = [];
        node.children = [];
    } else {
        for (const child of node.children) {
            clipLodTreeDepth(child, depthLimit - 1);
        }
    }
}

async function generateLod() {
    const dataset = {
        inputFile: '3drm_neuschwanstein.ply',
        lodDepthLimit: 5,
        outFolder: 'neuschwanstein-depth5'
    };

    Timing.measure();
    console.log('starting');

    const castleFile = await FileIO.readFile('../data/point-clouds/' + dataset.inputFile);
    console.log(Timing.measure(), 'ms to load the file');

    const rawData = await parse(castleFile, PLYLoader);
    console.log(Timing.measure(), 'ms to parse ply format');

    const data = {
        positions: rawData.attributes.POSITION.value,
        sizes: new Float32Array(Math.floor(rawData.attributes.POSITION.value.length / 3)).fill(0.07),
        normals: rawData.attributes.NORMAL.value,
        colors: new Float32Array(rawData.attributes.COLOR_0.value).map(c => c / 255),
    };
    console.log(Timing.measure(), 'ms for data preprocessing');

    const bb = BoundingBox.create(data.positions);
    console.log(Timing.measure(), 'ms for bounding box computation');

    const octree = new OctreeLodBuilder(bb, 128, 10);
    octree.addData(data);
    const numNodes = octree.root.getNumberOfNodes();
    console.log(Timing.measure(), 'ms for octree construction');

    const lod = octree.buildLod(1);
    console.log(Timing.measure(), 'ms to compute LOD');

    clipLodTreeDepth(lod, dataset.lodDepthLimit);
    console.log(Timing.measure(), 'ms to clop the LOD tree to maxDepth =', dataset.lodDepthLimit);
    console.log('start writing to disk');

    const folderPath = '../data/lod/' + dataset.outFolder + '/';
    writeLodTreeToFiles(lod, folderPath, Math.floor(numNodes / 20)).then(() => {
        console.log(Timing.measure(), 'ms to write LOD nodes to disk');
    }).catch(err => {
        console.log('error writing lod', err);
    });
}

generateLod().catch(err => {
    console.error(err);
});
