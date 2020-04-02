import { GSVPanoramaLoader } from './gsv-panorama-loader';

export class GSVCrawler {

    async crawl(startID: string, bfsLimit: number): Promise<Set<string>> {
        const ids: Set<string> = new Set();
        const queue: Array<{id: string, remDepth: number}> = [];
        let queuePos = 0;
        ids.add(startID);
        queue.push({id: startID, remDepth: bfsLimit});

        while (queuePos < queue.length) {
            const {id, remDepth} = queue[queuePos];
            queuePos++;

            const response = await GSVPanoramaLoader.loadById(id);
            for (const link of response.Links) {
                if (!ids.has(link.panoId)) {
                    ids.add(link.panoId);
                    console.log('found new id:', link.panoId);
                    if (remDepth > 0) {
                        queue.push({id: link.panoId, remDepth: remDepth-1});
                    }
                }
            }
        }
        return ids;
    }

}
