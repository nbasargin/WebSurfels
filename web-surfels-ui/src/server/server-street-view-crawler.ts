import { StreetViewApiResponse } from '../lib/data/street-view/api/street-view-api-response';
import { FileIO } from './file-io/file-io';
import * as fs from 'fs';
import * as https from 'https';

/**
 * Get data from the URL and write it to a local file.
 * Once the data it written, promise is resolved with the data
 * @param url
 * @param localPath
 */
function httpToFile(url, localPath): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(localPath);
        const chunks: Array<any> = [];
        https.get(url, response => {
            response.pipe(file);
            response.on('data', chunk => {
                chunks.push(chunk);
            });
        }).on('error', e => reject(e));

        file.on('finish', () => resolve(Buffer.concat(chunks)))
            .on('error', e => reject(e));
    });
}

/**
 * Crawl the street view API and save data to disk.
 * @param startID first panorama ID
 * @param maxPanoramas maximal number of panoramas
 * @param destination output folder
 */
async function crawl(startID: string, maxPanoramas: number, destination: string = '../gsv/crawl'): Promise<Array<string>> {
    const knownIDs: Set<string> = new Set([startID]);
    const loadingQueue: Array<string> = [startID];
    let loadedPanoramas = 0;

    await FileIO.mkDir(destination);

    while (loadedPanoramas < maxPanoramas && loadedPanoramas < loadingQueue.length) {
        const id = loadingQueue[loadedPanoramas];
        loadedPanoramas++;

        const dataUrl = `https://maps.google.com/cbk?output=json&panoid=${id}&dm=1`;
        const imgUrl = `https://maps.google.com/cbk?output=tile&panoid=${id}&zoom=0&x=0&y=0`;

        const [dataJson] = await Promise.all([
            httpToFile(dataUrl, FileIO.pathJoin(destination, id + '.json')),
            httpToFile(imgUrl, FileIO.pathJoin(destination, id + '.jpg')),
        ]);

        const data = JSON.parse(dataJson.toString('utf8')) as StreetViewApiResponse;

        for (const link of data.Links) {
            if (!knownIDs.has(link.panoId)) {
                knownIDs.add(link.panoId);
                loadingQueue.push(link.panoId);
            }
        }

        console.log(`${loadedPanoramas} / ${maxPanoramas}: processed ${data.Location.panoId}, remaining in queue: ${loadingQueue.length - loadedPanoramas}`);
    }

    return loadingQueue.slice(0, loadedPanoramas); // return a lost of loaded ids
}


(async function main() {
    const panoID = 'h--IJXCoiMfBaHbDmPPKKg';
    const processedIDs = await crawl(panoID, 5, '../gsv/test-crawl');
    console.log(`crawl complete, ${processedIDs.length} panoramas saved`);
})();



