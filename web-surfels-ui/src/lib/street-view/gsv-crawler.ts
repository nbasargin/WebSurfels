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

    public static crawls = {
        munichTest: [
            'yoDO0JAidwhxwcrHkiiO2A',
            'rUJScz5qeFNziiQQ2hMqjA',
            'HfTV_yDHhuJAxB_yMxcvhg',
            'kqvWX70FEJ9QJDVSr9FYUA',
            'uqTmsw4aCg1TZvCNQMrASg',
            'x_lmhPUhXWzj18awTDu8sg',
            'rGdyHoqO5yFBThYm8kiwpA',
            'giDo-scRn5kbweSI5xmtIg',
            '-bgCziklvIHyyrav6R4aug',
            '9ZPVekRqspFF5M0-ka2zTw',
            '6ZfcCQRcyZNdvEq0CGHKcQ',
        ],
        trumpTower: [
            'GTKQkr3G-rRZQisDUMzUtg',
            'tDHgZF2towFDY0XScMdogA',
            'TX7hSqtNzoUQ3FHmd_B7jg',
            'DUC-bzTYi-qzKU43ZMy0Rw',
            '0ugKJC8FPlIqvIu7gUjXoA',
            'ziNa0wg33om0UUk_zGb16g',
            'FaTLGxzNsC77nmrZMKdBbQ',
        ],
        parisTrocadero: [
            'YMj435iyLBgQlDO78pJ97Q',
            'VC225rsj2QCxG9XTjzLbMw',
            'tjz38K0I5tVr9qbUgVrNwA',
            'wi-sFfwfXCfvdj0mBSiVjA',
            'O9f1mGJ1O1c20WPp-R0Ygg',
            'opjNqUgyjWZpS5B5zx7sGQ',
            'slbdKRPZIPr4ePrQ2BTFYQ',
            'AW27pHSeCarac2ZUn1xfLw',
            'aJKf2tZhC9apQzeMvQAapg',
            '5TTbErcxJ5Kc5DXtPy4T7Q',
            'hWv9A_7eJdsOv8gXcCUd6w',
        ],
        manhattan: [
            's6A9P5A3iWvqNscixSRPsw',
            'h--IJXCoiMfBaHbDmPPKKg',
            'PMcSzjQYUHtKTpuse_yQqA',
            'Z1EP7J_kGsOUkqLqqM-AVA',
            'nkPg07xpLbIxJ8z5pASqIw',
            '1l2WNGNsjz91zpoMJsyGoA',
            'UHSw7OOyDBlYM5ks2TPCqw',
            'wdNrsiO-JhrGQSlAhqdtFg',
            'z3tpeZzLuXsdj-etXNqmTw',
            '11eoeBrKKvlGkpr9gIMrHw',
            'MbDTU8MPKbIOnt6N_KHDqw',
            '_2VPWc6nzIecYksex81hOg',
            'djT-LnB1tCZI6F_GMSzi3A',
            'l3sALUHyowrDrGBr2U31NQ',
            'kgVLUTm6AXoM58tz7JWvow',
            'GrlEWvVGMVOAeWdTrAq-9g',
            'RArtSv2CTm6sWnQ6bV8nag',
            'BTkSy7mNFiF4YTI1W6y2iQ',
            'a7kZY2l1W0a-a-KbZB839A',
            'v62U8znJvuEmuRBYJScUKw',
            'hcuOJ1JtTwqtNTa8YSLhGg',
            '75pHalcSDXO_ndgnD2h2sw',
        ]
    }

}
