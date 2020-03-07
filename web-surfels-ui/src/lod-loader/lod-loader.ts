import { LodBinary, LodNode } from 'web-surfels';
import { BinaryXHR } from 'web-surfels';

export class LodLoader {

    static readonly BASE_URL = 'http://localhost:5000/';

    static loadNode(id: number | string): Promise<LodNode> {
        const url = LodLoader.BASE_URL + id + '.lod';
        return BinaryXHR.get(url).then(buffer => {
            return LodBinary.fromBinary(buffer);
        });
    }

    static async loadAllNodes(): Promise<LodNode> {
        const loadingQueue: Array<LodNode> = [];
        const root = await LodLoader.loadNode('root');
        loadingQueue.push(root);
        while (loadingQueue.length > 0) {
            const parent = loadingQueue.pop();
            if (!parent) {
                continue;
            }
            const promises = parent.childIDs.map(id => LodLoader.loadNode(id));
            const loadedChildren = await Promise.all(promises);
            parent.children = loadedChildren;
            loadingQueue.push(...loadedChildren);
        }
        return root;
    }

}
