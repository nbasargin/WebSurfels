import { GSVCrawler } from '../../lib/data/street-view/gsv-crawler';
import { DemoBase } from './demo-base';

export class StreetViewCrawlerDemo implements DemoBase {

    preferredMovementSpeed = 1;

    constructor() {
        const crawler = new GSVCrawler();
        crawler.crawl('s6A9P5A3iWvqNscixSRPsw', 10).then(ids => {
            console.log('crawl complete, found', ids.size, 'panoramas');
            console.log('ids', ids);
        });
    }

}
